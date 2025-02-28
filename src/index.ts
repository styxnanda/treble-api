import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/index.js';
import { env } from './config/env.js';
import { prismaClient } from './config/prisma-client.js';

const fastify = Fastify({
  logger: true
});

// Verify database connection on startup
try {
  // Simple query to test Prisma connection
  await prismaClient.$queryRaw`SELECT 1`;
  fastify.log.info('Database connection established via Prisma');
} catch (err) {
  fastify.log.error('Failed to connect to database with Prisma', err);
  process.exit(1);
}

// CORS setup
await fastify.register(cors, {
  origin: env.cors.origins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
});

// Register routes
await registerRoutes(fastify);

// Start the server
try {
  await fastify.listen({ port: env.port, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  await prismaClient.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  await prismaClient.$disconnect();
  process.exit(0);
});