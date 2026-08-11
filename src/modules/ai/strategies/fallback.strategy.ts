import { AIProviderManager } from '../../../ai/AIProviderManager';

export class AIFallbackStrategy {
  private manager = new AIProviderManager();

  async getActiveProvider() {
    return await this.manager.getHealthyProvider();
  }

  async getHealthStatus() {
    return await this.manager.getHealthStatus();
  }
}
