import { S3Client } from '../config/s3-client.js';
import { env } from '../config/env.js';
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parseBuffer } from 'music-metadata';
import { Album, Artist, Song } from '../types/music.js';
import { Readable } from 'stream';

// Singleton instance
let instance: MusicService | null = null;

export class MusicService {
  private s3Client: S3Client;
  private songsCache: Song[] | null = null;
  private albumsCache: Album[] | null = null;
  private artistsCache: Artist[] | null = null;
  private metadataCache: Map<string, any> = new Map();
  private urlCache: Map<string, { url: string, expiry: number }> = new Map();
  private isPreloadingComplete = false;
  
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

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private async getMetadata(path: string) {
    // Check cache first
    if (this.metadataCache.has(path)) {
      return this.metadataCache.get(path);
    }

    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: env.r2.bucketName,
      Key: path
    }));
    
    if (!response.Body) throw new Error('No file content');
    const buffer = await this.streamToBuffer(response.Body as Readable);
    const metadata = await parseBuffer(buffer);
    
    // Store in cache
    this.metadataCache.set(path, metadata);
    return metadata;
  }

  async getAllSongs(): Promise<Song[]> {
    // Return cached songs if available
    if (this.songsCache) {
      return this.songsCache;
    }

    const songs: Song[] = [];
    const response = await this.s3Client.send(new ListObjectsV2Command({
      Bucket: env.r2.bucketName,
      Delimiter: '/'
    }));

    if (!response.CommonPrefixes) return songs;

    // Use Promise.all to fetch album contents in parallel
    await Promise.all(response.CommonPrefixes.map(async (prefix) => {
      const albumResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: env.r2.bucketName,
        Prefix: prefix.Prefix
      }));

      if (!albumResponse.Contents) return;

      // Use Promise.all to process song metadata in parallel
      const songPromises = albumResponse.Contents
        .filter(content => content.Key?.endsWith('.flac'))
        .map(async (content) => {
          const metadata = await this.getMetadata(content.Key!);
          return {
            id: content.Key!,
            title: metadata.common.title || content.Key!.split('/').pop()?.replace('.flac', '') || '',
            artist: metadata.common.artist || 'Unknown',
            album: metadata.common.album || prefix.Prefix?.slice(0, -1) || 'Unknown',
            duration: metadata.format.duration || 0,
            path: content.Key!
          };
        });

      const albumSongs = await Promise.all(songPromises);
      songs.push(...albumSongs);
    }));

    // Cache results
    this.songsCache = songs;
    return songs;
  }

  async getAllAlbums(): Promise<Album[]> {
    // Return cached albums if available
    if (this.albumsCache) {
      return this.albumsCache;
    }

    const albums: Album[] = [];
    const response = await this.s3Client.send(new ListObjectsV2Command({
      Bucket: env.r2.bucketName,
      Delimiter: '/'
    }));

    if (!response.CommonPrefixes) return albums;

    // Use Promise.all to process albums in parallel
    await Promise.all(response.CommonPrefixes.map(async (prefix) => {
      const albumName = prefix.Prefix?.slice(0, -1) || '';
      const albumResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: env.r2.bucketName,
        Prefix: prefix.Prefix
      }));

      if (!albumResponse.Contents) return;

      const coverFile = albumResponse.Contents.find(content => 
        content.Key?.toLowerCase().includes('cover.')
      );

      // Use Promise.all for song metadata processing
      const songPromises = albumResponse.Contents
        .filter(content => content.Key?.endsWith('.flac'))
        .map(async (content) => {
          const metadata = await this.getMetadata(content.Key!);
          return {
            id: content.Key!,
            title: metadata.common.title || content.Key!.split('/').pop()?.replace('.flac', '') || '',
            artist: metadata.common.artist || 'Unknown',
            album: albumName,
            duration: metadata.format.duration || 0,
            path: content.Key!
          };
        });

      const songs = await Promise.all(songPromises);
      const coverUrl = coverFile ? 
        await this.getPreSignedUrl(coverFile.Key!) : 
        '';

      albums.push({
        name: albumName,
        coverUrl,
        songs
      });
    }));

    // Cache results
    this.albumsCache = albums;
    return albums;
  }

  async getAllArtists(): Promise<Artist[]> {
    // Return cached artists if available
    if (this.artistsCache) {
      return this.artistsCache;
    }

    const artists = env.artists.map(name => ({
      name,
      albums: [] as string[],
      songs: [] as Song[]
    }));

    const songs = await this.getAllSongs();
    
    for (const song of songs) {
      const artist = artists.find(a => a.name === song.artist);
      if (artist) {
        artist.songs.push(song);
        if (!artist.albums.includes(song.album)) {
          artist.albums.push(song.album);
        }
      }
    }

    // Cache results
    this.artistsCache = artists;
    return artists;
  }

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

  async getAlbumDetails(name: string): Promise<Album | null> {
    const albums = await this.getAllAlbums();
    return albums.find(album => album.name === name) || null;
  }

  async getArtistDetails(name: string): Promise<Artist | null> {
    const artists = await this.getAllArtists();
    return artists.find(artist => artist.name === name) || null;
  }

  // Method to clear cache if needed (e.g., when you want to refresh data)
  clearCache() {
    this.songsCache = null;
    this.albumsCache = null;
    this.artistsCache = null;
    this.metadataCache.clear();
    this.urlCache.clear();
  }

  // Fast methods for initial page load (minimal data)
  async getBasicAlbumsList(): Promise<{ name: string, coverUrl?: string }[]> {
    // If full cache is ready, use it
    if (this.albumsCache) {
      return this.albumsCache.map(album => ({
        name: album.name,
        coverUrl: album.coverUrl
      }));
    }

    // Otherwise, get just the basic album info quickly
    const albums: { name: string, coverUrl?: string }[] = [];
    const response = await this.s3Client.send(new ListObjectsV2Command({
      Bucket: env.r2.bucketName,
      Delimiter: '/'
    }));

    if (!response.CommonPrefixes) return albums;

    // Process albums in parallel but with minimal data
    const albumPromises = response.CommonPrefixes.map(async (prefix) => {
      const albumName = prefix.Prefix?.slice(0, -1) || '';
      const albumResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: env.r2.bucketName,
        Prefix: prefix.Prefix,
        MaxKeys: 10 // Limit to just a few files to find the cover quickly
      }));

      if (!albumResponse.Contents) return { name: albumName };

      const coverFile = albumResponse.Contents.find(content => 
        content.Key?.toLowerCase().includes('cover.')
      );

      const coverUrl = coverFile ? 
        await this.getPreSignedUrl(coverFile.Key!) : 
        '';

      return {
        name: albumName,
        coverUrl
      };
    });

    return await Promise.all(albumPromises);
  }

  async getBasicArtistsList(): Promise<{ name: string }[]> {
    // If cache is ready, use it
    if (this.artistsCache) {
      return this.artistsCache.map(artist => ({ name: artist.name }));
    }
    
    // Otherwise just return the basic list from env
    return env.artists.map(name => ({ name }));
  }

  // Method to check if full preloading is complete
  isFullyPreloaded(): boolean {
    return this.isPreloadingComplete;
  }

  // Start preloading all data
  async startFullPreload(): Promise<void> {
    if (this.isPreloadingComplete) return;

    try {
      await Promise.all([
        this.getAllSongs(),
        this.getAllAlbums(),
        this.getAllArtists()
      ]);
      this.isPreloadingComplete = true;
    } catch (error) {
      console.error('Error during full preload:', error);
    }
  }
}