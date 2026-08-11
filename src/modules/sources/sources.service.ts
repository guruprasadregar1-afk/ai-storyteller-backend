import { ContentService } from '../../services/ContentService';

export class SourcesService {
  private contentService = new ContentService();

  async analyzeSourceInput(input: string, userHint?: string) {
    return await this.contentService.analyzeInput(input, userHint as any);
  }

  async getSourceById(id: string) {
    return await this.contentService.getContentById(id);
  }
}
