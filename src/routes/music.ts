import { FastifyInstance } from 'fastify';
import { MusicService } from '../services/music.js';

export async function musicRoutes(fastify: FastifyInstance) {
  const musicService = MusicService.getInstance();

  // Get all songs with full metadata - potentially slower on first load
  fastify.get('/songs', async () => {
    return await musicService.getAllSongs();
  });

  // Get all albums with full metadata - potentially slower on first load
  fastify.get('/albums', async () => {
    return await musicService.getAllAlbums();
  });

  // Get all artists with full metadata - potentially slower on first load
  fastify.get('/artists', async () => {
    return await musicService.getAllArtists();
  });

  // Fast lightweight endpoints for initial UI rendering
  fastify.get('/quick/albums', async () => {
    // Start full preloading in the background
    musicService.startFullPreload().catch(err => 
      fastify.log.error('Background preload error:', err)
    );
    return await musicService.getBasicAlbumsList();
  });

  fastify.get('/quick/artists', async () => {
    // Start full preloading in the background
    musicService.startFullPreload().catch(err => 
      fastify.log.error('Background preload error:', err)
    );
    return await musicService.getBasicArtistsList();
  });

  // Check preload status
  fastify.get('/preload-status', async () => {
    return { complete: musicService.isFullyPreloaded() };
  });

  // Get pre-signed URL for a song (path parameter version)
  fastify.get('/song/:path', async (request) => {
    const { path } = request.params as { path: string };
    return { url: await musicService.getPreSignedUrl(path) };
  });

  // Get pre-signed URL for a song (query parameter version - easier for frontend integration)
  fastify.get('/song-url', async (request) => {
    const { path } = request.query as { path: string };
    if (!path) {
      throw new Error('Path parameter is required');
    }
    return { url: await musicService.getPreSignedUrl(path) };
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