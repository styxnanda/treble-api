import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/index.js';
import { env } from './config/env.js';
import { MusicService } from './services/music.js';

const fastify = Fastify({
  logger: true
});

// Get the singleton instance of music service
const musicService = MusicService.getInstance();

// CORS setup
await fastify.register(cors, {
  origin: env.cors.origins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
});

// Register routes
await registerRoutes(fastify);

// Pre-warm the cache in the background
fastify.log.info('Pre-warming music data cache...');
const startTime = performance.now();
Promise.all([
  musicService.getAllSongs(),
  musicService.getAllAlbums(),
  musicService.getAllArtists()
]).then(() => {
  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  fastify.log.info(`Cache pre-warmed in ${duration} seconds`);
}).catch(err => {
  fastify.log.error('Error pre-warming cache: ' + err.message);
});

// Start the server
try {
  await fastify.listen({ port: env.port, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}