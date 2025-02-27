import { FastifyInstance } from 'fastify';
import { musicRoutes } from './music.js';

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(musicRoutes, { prefix: '/api' });
}