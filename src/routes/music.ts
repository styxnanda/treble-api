import { FastifyInstance } from 'fastify';
import { MusicService } from '../services/music.js';

export async function musicRoutes(fastify: FastifyInstance) {
  const musicService = MusicService.getInstance();

  // Get all songs
  fastify.get('/songs', async () => {
    return await musicService.getAllSongs();
  });

  // Get all albums (lightweight list)
  fastify.get('/albums', async () => {
    return await musicService.getAllAlbums();
  });

  // Get all artists (lightweight list)
  fastify.get('/artists', async () => {
    return await musicService.getAllArtists();
  });

  // Get album details by ID
  fastify.get('/albums/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const albumId = parseInt(id, 10);
    
    if (isNaN(albumId)) {
      return reply.status(400).send({ error: 'Invalid album ID format' });
    }
    
    const album = await musicService.getAlbumDetails(albumId);
    if (!album) {
      return reply.status(404).send({ error: 'Album not found' });
    }
    
    return album;
  });

  // Get artist details by ID
  fastify.get('/artists/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const artistId = parseInt(id, 10);
    
    if (isNaN(artistId)) {
      return reply.status(400).send({ error: 'Invalid artist ID format' });
    }
    
    const artist = await musicService.getArtistDetails(artistId);
    if (!artist) {
      return reply.status(404).send({ error: 'Artist not found' });
    }
    
    return artist;
  });
  
  // Get a specific song with its streaming URL
  fastify.get('/songs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const songId = parseInt(id, 10);
    
    if (isNaN(songId)) {
      return reply.status(400).send({ error: 'Invalid song ID format' });
    }
    
    const song = await musicService.getSongWithUrl(songId);
    if (!song) {
      return reply.status(404).send({ error: 'Song not found' });
    }
    
    return song;
  });
  
  // Get pre-signed URL for a song (query parameter version - easier for frontend integration)
  fastify.get('/song-url', async (request, reply) => {
    const { path } = request.query as { path: string };
    if (!path) {
      return reply.status(400).send({ error: 'Path parameter is required' });
    }
    
    return { url: await musicService.getSongUrlByPath(path) };
  });
}