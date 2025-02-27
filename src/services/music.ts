import { S3Client } from '../config/s3-client.js';
import { env } from '../config/env.js';
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parseBuffer } from 'music-metadata';
import { Album, Artist, Song } from '../types/music.js';
import { Readable } from 'stream';

export class MusicService {
  private s3Client: S3Client;

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
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: env.r2.bucketName,
      Key: path
    }));
    
    if (!response.Body) throw new Error('No file content');
    const buffer = await this.streamToBuffer(response.Body as Readable);
    return await parseBuffer(buffer);
  }

  async getAllSongs(): Promise<Song[]> {
    const songs: Song[] = [];
    const response = await this.s3Client.send(new ListObjectsV2Command({
      Bucket: env.r2.bucketName,
      Delimiter: '/'
    }));

    if (!response.CommonPrefixes) return songs;

    for (const prefix of response.CommonPrefixes) {
      const albumResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: env.r2.bucketName,
        Prefix: prefix.Prefix
      }));

      if (!albumResponse.Contents) continue;

      for (const content of albumResponse.Contents) {
        if (!content.Key?.endsWith('.flac')) continue;

        const metadata = await this.getMetadata(content.Key);
        songs.push({
          id: content.Key,
          title: metadata.common.title || content.Key.split('/').pop()?.replace('.flac', '') || '',
          artist: metadata.common.artist || 'Unknown',
          album: metadata.common.album || prefix.Prefix?.slice(0, -1) || 'Unknown',
          duration: metadata.format.duration || 0,
          path: content.Key
        });
      }
    }

    return songs;
  }

  async getAllAlbums(): Promise<Album[]> {
    const albums: Album[] = [];
    const response = await this.s3Client.send(new ListObjectsV2Command({
      Bucket: env.r2.bucketName,
      Delimiter: '/'
    }));

    if (!response.CommonPrefixes) return albums;

    for (const prefix of response.CommonPrefixes) {
      const albumName = prefix.Prefix?.slice(0, -1) || '';
      const albumResponse = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: env.r2.bucketName,
        Prefix: prefix.Prefix
      }));

      if (!albumResponse.Contents) continue;

      const coverFile = albumResponse.Contents.find(content => 
        content.Key?.toLowerCase().includes('cover.')
      );

      const songs: Song[] = [];
      for (const content of albumResponse.Contents) {
        if (!content.Key?.endsWith('.flac')) continue;
        const metadata = await this.getMetadata(content.Key);
        songs.push({
          id: content.Key,
          title: metadata.common.title || content.Key.split('/').pop()?.replace('.flac', '') || '',
          artist: metadata.common.artist || 'Unknown',
          album: albumName,
          duration: metadata.format.duration || 0,
          path: content.Key
        });
      }

      const coverUrl = coverFile ? 
        await this.getPreSignedUrl(coverFile.Key!) :
        '';

      albums.push({
        name: albumName,
        coverUrl,
        songs
      });
    }

    return albums;
  }

  async getAllArtists(): Promise<Artist[]> {
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

    return artists;
  }

  async getPreSignedUrl(path: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: env.r2.bucketName,
      Key: path
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async getAlbumDetails(name: string): Promise<Album | null> {
    const albums = await this.getAllAlbums();
    return albums.find(album => album.name === name) || null;
  }

  async getArtistDetails(name: string): Promise<Artist | null> {
    const artists = await this.getAllArtists();
    return artists.find(artist => artist.name === name) || null;
  }
}