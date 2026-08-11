import { ResearchService as CoreResearchService } from '../../services/ResearchService';
import { RightsService } from '../../services/RightsService';

export class ResearchService {
  private coreResearch = new CoreResearchService();
  private rightsService = new RightsService();

  async researchTopic(contentId: string, topic: string) {
    return await this.coreResearch.performResearch(contentId, topic as any);
  }

  async checkRights(contentType: string, title: string) {
    return this.rightsService.evaluateRights(contentType as any, title);
  }
}
