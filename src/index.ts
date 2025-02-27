import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { registerRoutes } from './routes/index.js';

const fastify = Fastify({
  logger: true
});

// Enable CORS
await fastify.register(cors);

// Register all routes
await fastify.register(registerRoutes);

// Start server
try {
  await fastify.listen({ port: env.port, host: '0.0.0.0' });
  console.log(`Server is running on port ${env.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}