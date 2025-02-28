// Database entity types matching PostgreSQL schema
export interface Artist {
  id: number;
  name: string;
  image_path: string | null;
  biography: string | null;
  created_at: Date;
  updated_at: Date;
  
  // Relations (not stored in DB)
  albums?: Album[];
  songs?: Song[];
}

export interface Album {
  id: number;
  name: string;
  cover_path: string | null;
  created_at: Date;
  updated_at: Date;
  
  // Relations (not stored in DB)
  songs?: Song[];
  artists?: Artist[];
}

export interface Song {
  id: number;
  title: string;
  artist_id: number;
  album_id: number;
  duration: number;
  track_number: number;
  path: string;
  created_at: Date;
  updated_at: Date;
  
  // Relations (not stored in DB)
  artist?: Artist;
  album?: Album;
  
  // Pre-signed URL (not stored in DB)
  url?: string;
}

// Response types for API consumption
export interface SongResponse {
  id: number;
  title: string;
  artistId: number;
  artistName: string;
  albumId: number;
  albumName: string;
  duration: number;
  trackNumber: number;
  url?: string;
}

export interface AlbumListItem {
  id: number;
  name: string;
  coverUrl: string | null;
}

export interface AlbumResponse {
  id: number;
  name: string;
  coverUrl: string | null;
  songs: SongResponse[];
  artists: { id: number; name: string }[];
}

export interface SongListItem {
  id: number;
  title: string;
  artistId: number;
  artistName: string;
  albumId: number;
  albumName: string;
  duration: number;
  trackNumber: number;
}

export interface ArtistResponse {
  id: number;
  name: string;
  imageUrl: string | null;
  biography: string | null;
  albums: AlbumListItem[];
  songs: SongListItem[];
}