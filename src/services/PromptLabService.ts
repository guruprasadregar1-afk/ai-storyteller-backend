import { PromptTemplateItem, PromptOptimizationResult } from '../types';

export class PromptLabService {
  private templatesStore: Map<string, PromptTemplateItem> = new Map();

  constructor() {
    this.seedDefaultTemplates();
  }

  getTemplates(): PromptTemplateItem[] {
    return Array.from(this.templatesStore.values());
  }

  saveTemplate(template: PromptTemplateItem): PromptTemplateItem {
    const key = template.name.toLowerCase();
    const tokenEstimate = this.estimateTokens(template.templateText);
    const item: PromptTemplateItem = {
      id: `tmpl-${Date.now()}`,
      ...template,
      tokenEstimate
    };

    this.templatesStore.set(key, item);
    return item;
  }

  optimizePrompt(rawPrompt: string, styleCategory = 'Cinematic'): PromptOptimizationResult {
    console.log(`[PromptLabService] Optimizing prompt: "${rawPrompt.substring(0, 30)}..." for category '${styleCategory}'`);

    const optimizedPrompt = `${rawPrompt}, highly detailed, masterwork, 8k resolution, cinematic composition, photorealistic volumetric lighting`;
    const negativePrompt = 'blurry, low resolution, bad anatomy, extra limbs, distorted features, watermark, cropped';
    const estimatedTokens = this.estimateTokens(optimizedPrompt);

    const variations = [
      `${rawPrompt}, dramatic dramatic lighting, ultra-detailed textures, moody atmosphere`,
      `${rawPrompt}, vibrant colors, dynamic action pose, wide angle lens, unreal engine 5 render`,
      `${rawPrompt}, soft natural lighting, shallow depth of field, 35mm film grain aesthetic`
    ];

    return {
      originalPrompt: rawPrompt,
      optimizedPrompt,
      negativePrompt,
      estimatedTokens,
      variations
    };
  }

  estimateTokens(text: string): number {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    return Math.ceil(words * 1.35);
  }

  private seedDefaultTemplates() {
    const defaults: PromptTemplateItem[] = [
      {
        name: 'Character Visual Bible',
        category: 'Character',
        templateText: 'Full body character turnaround concept art of {{characterName}}, {{clothingStyle}}, studio lighting, clean background, 8k',
        negativePrompt: 'deformed, low quality, duplicate character, background clutter',
        tokenEstimate: 24
      },
      {
        name: 'Cinematic Environment',
        category: 'Environment',
        templateText: 'Panoramic atmospheric shot of {{locationName}}, detailed architecture, {{lightingMood}}, masterpiece',
        negativePrompt: 'people, modern vehicles, blurry, oversaturated',
        tokenEstimate: 20
      }
    ];

    for (const t of defaults) {
      this.templatesStore.set(t.name.toLowerCase(), t);
    }
  }
}
