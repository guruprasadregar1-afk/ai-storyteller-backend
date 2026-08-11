import { ContentService } from '../../services/ContentService';

export class SearchService {
  private contentService = new ContentService();

  async searchContent(query: string) {
    return await this.contentService.findExistingContent(query);
  }
}
