import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  private static instance: PrismaService;
  public isAvailable: boolean = false;

  constructor() {
    super({
      log: ['error']
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
      // 1-second connect timeout check
      const connectPromise = this.$connect();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000));
      
      await Promise.race([connectPromise, timeoutPromise]);
      this.isAvailable = true;
      console.log('[PrismaService] Database connected successfully.');
    } catch (error) {
      this.isAvailable = false;
      console.warn('[PrismaService] Database connection deferred/development mode fallback active.');
    }
  }

  async disconnectDatabase(): Promise<void> {
    if (this.isAvailable) {
      try {
        await this.$disconnect();
        console.log('[PrismaService] Database disconnected.');
      } catch {
        // Ignore disconnect errors
      }
    }
  }
}

export const prismaService = PrismaService.getInstance();
