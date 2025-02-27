import { FastifyInstance } from 'fastify';
import { MusicService } from '../services/music.js';

export async function musicRoutes(fastify: FastifyInstance) {
  const musicService = new MusicService();

  // List all songs
  fastify.get('/songs', async () => {
    return await musicService.getAllSongs();
  });

  // List all albums
  fastify.get('/albums', async () => {
    return await musicService.getAllAlbums();
  });

  // List all artists
  fastify.get('/artists', async () => {
    return await musicService.getAllArtists();
  });

  // Get pre-signed URL for a specific song
  fastify.get('/song', {
    schema: {
      querystring: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' }
        }
      }
    }
  }, async (request) => {
    const { path } = request.query as { path: string };
    return await musicService.getPreSignedUrl(path);
  });

  // Get album details
  fastify.get('/album/:name', async (request) => {
    const { name } = request.params as { name: string };
    return await musicService.getAlbumDetails(name);
  });

  // Get artist details
  fastify.get('/artist/:name', async (request) => {
    const { name } = request.params as { name: string };
    return await musicService.getArtistDetails(name);
  });
}