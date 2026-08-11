import { PromptTemplateItem, PromptOptimizationResult } from '../types';

export class PromptLabService {
  private templatesStore: Map<string, PromptTemplateItem> = new Map();

  constructor() {
    this.seedDefaultTemplates();
  }

  getTemplates(): PromptTemplateItem[] {
    return Array.from(this.templatesStore.values());
  }

  saveTemplate(template: Partial<PromptTemplateItem>): PromptTemplateItem {
    const templateName = template?.name || 'Custom Prompt Template';
    const category = template?.category || 'General';
    const templateText = template?.templateText || 'Cinematic visualization of {{topic}}';
    const key = templateName.toLowerCase();

    const tokenEstimate = this.estimateTokens(templateText);
    const item: PromptTemplateItem = {
      id: `tmpl-${Date.now()}`,
      name: templateName,
      category,
      templateText,
      negativePrompt: template?.negativePrompt || 'blurry, low quality',
      tokenEstimate
    };

    this.templatesStore.set(key, item);
    return item;
  }

  optimizePrompt(rawPrompt: string = '', styleCategory = 'Cinematic'): PromptOptimizationResult {
    const cleanPrompt = rawPrompt.trim() || 'Cinematic story scene';
    console.log(`[PromptLabService] Optimizing prompt: "${cleanPrompt.substring(0, 30)}..." for category '${styleCategory}'`);

    const optimizedPrompt = `${cleanPrompt}, highly detailed, masterwork, 8k resolution, cinematic composition, photorealistic volumetric lighting`;
    const negativePrompt = 'blurry, low resolution, bad anatomy, extra limbs, distorted features, watermark, cropped';
    const estimatedTokens = this.estimateTokens(optimizedPrompt);

    const variations = [
      `${cleanPrompt}, dramatic lighting, ultra-detailed textures, moody atmosphere`,
      `${cleanPrompt}, vibrant colors, dynamic action pose, wide angle lens, unreal engine 5 render`,
      `${cleanPrompt}, soft natural lighting, shallow depth of field, 35mm film grain aesthetic`
    ];

    return {
      originalPrompt: cleanPrompt,
      optimizedPrompt,
      negativePrompt,
      estimatedTokens,
      variations
    };
  }

  estimateTokens(text: string = ''): number {
    if (!text) return 0;
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
