import { prismaService } from '../../database/prisma/prisma.service';

export class SourcesRepository {
  async findByNormalizedTitle(title: string) {
    return await prismaService.sourceKnowledge.findFirst({
      where: { canonicalTitle: title.toLowerCase() }
    });
  }
}
