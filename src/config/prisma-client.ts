import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
class PrismaClientInstance {
  private static instance: PrismaClientInstance;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }

  public static getInstance(): PrismaClientInstance {
    if (!PrismaClientInstance.instance) {
      PrismaClientInstance.instance = new PrismaClientInstance();
    }
    return PrismaClientInstance.instance;
  }

  // Get the Prisma client to use for queries
  public getClient(): PrismaClient {
    return this.prisma;
  }

  // Close connection when needed
  public async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Export a singleton instance
export const prismaClient = PrismaClientInstance.getInstance().getClient();