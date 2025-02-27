export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  path: string;
}

export interface Album {
  name: string;
  coverUrl: string;
  songs: Song[];
}

export interface Artist {
  name: string;
  albums: string[];
  songs: Song[];
}