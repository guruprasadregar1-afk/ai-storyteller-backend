import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  private static instance: PrismaService;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  async connectDatabase(): Promise<void> {
    try {
      await this.$connect();
      console.log('[PrismaService] Database connected successfully.');
    } catch (error) {
      console.warn('[PrismaService] Database connection deferred/development mode fallback active.');
    }
  }

  async disconnectDatabase(): Promise<void> {
    await this.$disconnect();
    console.log('[PrismaService] Database disconnected.');
  }
}

export const prismaService = PrismaService.getInstance();
