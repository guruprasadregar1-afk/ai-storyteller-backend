import { AIProviderManager } from '../ai/AIProviderManager';
import { RightsService } from './RightsService';
import { ScriptGenerationParams, ScriptResult, ContentType } from '../types';

export class ScriptService {
  constructor(
    private aiManager: AIProviderManager,
    private rightsService: RightsService
  ) {}

  async generateScript(
    title: string,
    contentType: ContentType,
    facts: string[],
    params: ScriptGenerationParams
  ): Promise<ScriptResult> {
    const rightsCheck = this.rightsService.evaluateRights(contentType, title);
    if (!rightsCheck.allowed) {
      throw new Error(`Rights restriction: ${rightsCheck.reason}`);
    }

    const scriptResult = await this.aiManager.generateStoryScript(title, facts, params);

    // Enforce rights mode & quality check
    scriptResult.rightsMode = rightsCheck.rightsMode;
    return scriptResult;
  }
}
