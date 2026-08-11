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
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
      this.isAvailable = false;
      console.log('[PrismaService] Development fallback mode active (In-Memory persistence).');
      return;
    }

    try {
      await this.$connect();
      this.isAvailable = true;
      console.log('[PrismaService] Connected to Supabase PostgreSQL Database successfully.');
    } catch (error) {
      this.isAvailable = false;
      console.warn('[PrismaService] Could not reach remote DB, activating development mode fallback.');
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
