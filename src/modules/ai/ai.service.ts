import { AIFallbackStrategy } from './strategies/fallback.strategy';

export class AIService {
  private fallbackStrategy = new AIFallbackStrategy();

  async getProvidersHealth() {
    return await this.fallbackStrategy.getHealthStatus();
  }

  async getHealthyProvider() {
    return await this.fallbackStrategy.getActiveProvider();
  }
}
