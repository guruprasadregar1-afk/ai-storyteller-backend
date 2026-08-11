import { ResearchService as CoreResearchService } from '../../services/ResearchService';
import { RightsService } from '../../services/RightsService';

export class ResearchService {
  private coreResearch = new CoreResearchService();
  private rightsService = new RightsService();

  async researchTopic(contentId: string, topic: string) {
    return await this.coreResearch.fetchSourceFacts(contentId, topic);
  }

  async checkRights(title: string, author?: string) {
    return this.rightsService.evaluateRights(title, author);
  }
}
