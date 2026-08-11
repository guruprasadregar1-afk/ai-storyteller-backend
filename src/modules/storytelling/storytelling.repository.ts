import { prismaService } from '../../database/prisma/prisma.service';

export class StorytellingRepository {
  async savePipelineRun(scriptId: string, title: string, status: string) {
    return await prismaService.masterPipeline.create({
      data: {
        scriptId,
        titleInput: title,
        contentType: 'HISTORY',
        status
      }
    });
  }
}
