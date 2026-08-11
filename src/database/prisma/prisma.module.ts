import { prismaService } from './prisma.service';

export class PrismaModule {
  static getPrisma() {
    return prismaService;
  }
}
