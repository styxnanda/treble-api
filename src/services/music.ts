import { S3Client } from '../config/s3-client.js';
import { prismaClient } from '../config/prisma-client.js';
import { env } from '../config/env.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  AlbumListItem, 
  AlbumResponse, 
  ArtistResponse, 
  SongListItem, 
  SongResponse 
} from '../types/music.js';

// Singleton instance
let instance: MusicService | null = null;

export class MusicService {
  private s3Client: S3Client;
  private urlCache: Map<string, { url: string, expiry: number }> = new Map();
  
  // Static method to get the singleton instance
  public static getInstance(): MusicService {
    if (!instance) {
      instance = new MusicService();
    }
    return instance;
  }

  constructor() {
    this.s3Client = new S3Client();
  }

  /**
   * Get all songs from the database
   */
  async getAllSongs(): Promise<SongResponse[]> {
    const songs = await prismaClient.song.findMany({
      include: {
        artist: true,
        album: true
      },
      orderBy: [
        { artist: { name: 'asc' } },
        { album: { name: 'asc' } },
        { track_number: 'asc' }
      ]
    });
    
    return songs.map((song: any) => ({
      id: Number(song.id),
      title: song.title,
      artistId: Number(song.artist_id),
      artistName: song.artist.name,
      albumId: Number(song.album_id),
      albumName: song.album.name,
      duration: song.duration,
      trackNumber: song.track_number
    }));
  }

  /**
   * Get all albums from the database with cover images
   */
  async getAllAlbums(): Promise<AlbumListItem[]> {
    const albums = await prismaClient.album.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Process albums to generate pre-signed URLs for covers
    const albumsPromises = albums.map(async (album: any) => {
      let coverUrl = null;
      if (album.cover_path) {
        coverUrl = await this.getPreSignedUrl(album.cover_path);
      }
      
      return {
        id: Number(album.id),
        name: album.name,
        coverUrl
      };
    });
    
    return Promise.all(albumsPromises);
  }

  /**
   * Get full album details including songs
   */
  async getAlbumDetails(albumId: number): Promise<AlbumResponse | null> {
    const album = await prismaClient.album.findUnique({
      where: { id: BigInt(albumId) },
      include: {
        songs: {
          include: {
            artist: true
          },
          orderBy: { track_number: 'asc' }
        }
      }
    });
    
    if (!album) {
      return null;
    }
    
    // Generate pre-signed URL for cover
    let coverUrl = null;
    if (album.cover_path) {
      coverUrl = await this.getPreSignedUrl(album.cover_path);
    }
    
    // Get distinct artists with songs on this album
    const artistsOnAlbum = await prismaClient.artist.findMany({
      where: {
        songs: {
          some: {
            album_id: BigInt(albumId)
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Map songs with pre-signed URLs
    const songsPromises = album.songs.map(async (song: any) => {
      return {
        id: Number(song.id),
        title: song.title,
        artistId: Number(song.artist_id),
        artistName: song.artist.name,
        albumId: Number(song.album_id),
        albumName: album.name,
        duration: song.duration,
        trackNumber: song.track_number,
        url: await this.getPreSignedUrl(song.path)
      };
    });
    
    const songs = await Promise.all(songsPromises);
    
    return {
      id: Number(album.id),
      name: album.name,
      coverUrl,
      songs,
      artists: artistsOnAlbum.map((artist: any) => ({
        id: Number(artist.id),
        name: artist.name
      }))
    };
  }

  /**
   * Get all artists from the database
   */
  async getAllArtists(): Promise<{ id: number, name: string, imageUrl: string | null }[]> {
    const artists = await prismaClient.artist.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Process artists to generate pre-signed URLs for images
    const artistsPromises = artists.map(async (artist: any) => {
      let imageUrl = null;
      if (artist.image_path) {
        imageUrl = await this.getPreSignedUrl(artist.image_path);
      }
      
      return {
        id: Number(artist.id),
        name: artist.name,
        imageUrl
      };
    });
    
    return Promise.all(artistsPromises);
  }

  /**
   * Get full artist details including albums and songs
   */
  async getArtistDetails(artistId: number): Promise<ArtistResponse | null> {
    const artist = await prismaClient.artist.findUnique({
      where: { id: BigInt(artistId) }
    });
    
    if (!artist) {
      return null;
    }
    
    // Get all songs by this artist with album information
    const songs = await prismaClient.song.findMany({
      where: { artist_id: BigInt(artistId) },
      include: { album: true },
      orderBy: [
        { album: { name: 'asc' } },
        { track_number: 'asc' }
      ]
    });
    
    // Get all albums with songs by this artist
    const albumIds = [...new Set(songs.map((song: any) => song.album_id))];
    const albums = await prismaClient.album.findMany({
      where: { id: { in: albumIds } },
      orderBy: { name: 'asc' }
    });
    
    // Generate pre-signed URL for artist image
    let imageUrl = null;
    if (artist.image_path) {
      imageUrl = await this.getPreSignedUrl(artist.image_path);
    }
    
    // Process albums to add cover URLs
    const albumsPromises = albums.map(async (album: any) => {
      let coverUrl = null;
      if (album.cover_path) {
        coverUrl = await this.getPreSignedUrl(album.cover_path);
      }
      
      return {
        id: Number(album.id),
        name: album.name,
        coverUrl
      };
    });
    
    const albumsWithCovers = await Promise.all(albumsPromises);
    
    // Map songs
    const songList: SongListItem[] = songs.map((song: any) => ({
      id: Number(song.id),
      title: song.title,
      artistId: Number(artistId),
      artistName: artist.name,
      albumId: Number(song.album_id),
      albumName: song.album.name,
      duration: song.duration,
      trackNumber: song.track_number
    }));
    
    return {
      id: Number(artist.id),
      name: artist.name,
      imageUrl,
      biography: artist.biography,
      albums: albumsWithCovers,
      songs: songList
    };
  }

  /**
   * Generate a pre-signed URL for an R2 object
   */
  async getPreSignedUrl(path: string): Promise<string> {
    const now = Date.now();
    
    // Check cache first (with 1 hour validity)
    if (this.urlCache.has(path)) {
      const cached = this.urlCache.get(path)!;
      // If URL is still valid (has at least 5 minutes remaining)
      if (cached.expiry > now + 300000) {
        return cached.url;
      }
    }
    
    const command = new GetObjectCommand({
      Bucket: env.r2.bucketName,
      Key: path
    });
    
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    
    // Store in cache with expiry timestamp
    this.urlCache.set(path, {
      url,
      expiry: now + 3600000 // Current time + 1 hour in milliseconds
    });
    
    return url;
  }

  /**
   * Get song details and generate a pre-signed URL
   */
  async getSongWithUrl(songId: number): Promise<SongResponse | null> {
    const song = await prismaClient.song.findUnique({
      where: { id: BigInt(songId) },
      include: {
        artist: true,
        album: true
      }
    });
    
    if (!song) {
      return null;
    }
    
    const url = await this.getPreSignedUrl(song.path);
    
    return {
      id: Number(song.id),
      title: song.title,
      artistId: Number(song.artist_id),
      artistName: song.artist.name,
      albumId: Number(song.album_id),
      albumName: song.album.name,
      duration: song.duration,
      trackNumber: song.track_number,
      url
    };
  }

  /**
   * Get a pre-signed URL for a song by its path
   */
  async getSongUrlByPath(path: string): Promise<string> {
    return this.getPreSignedUrl(path);
  }

  /**
   * Clear the URL cache if needed
   */
  clearUrlCache() {
    this.urlCache.clear();
  }
}