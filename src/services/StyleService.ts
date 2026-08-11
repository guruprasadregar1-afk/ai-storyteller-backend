import { StylePresetItem, EnvironmentRefItem } from '../types';

export class StyleService {
  private presets: Map<string, StylePresetItem> = new Map();
  private environments: Map<string, EnvironmentRefItem> = new Map();

  constructor() {
    this.seedDefaultPresets();
  }

  getStylePresets(): StylePresetItem[] {
    return Array.from(this.presets.values());
  }

  getStylePresetByName(name: string): StylePresetItem | undefined {
    return this.presets.get(name.toLowerCase());
  }

  saveStylePreset(preset: StylePresetItem): StylePresetItem {
    const key = preset.name.toLowerCase();
    const newPreset: StylePresetItem = {
      id: `style-${Date.now()}`,
      ...preset
    };
    this.presets.set(key, newPreset);
    return newPreset;
  }

  injectStyleToPrompt(basePrompt: string, styleName: string): { styledPrompt: string; negativePrompt?: string } {
    const preset = this.getStylePresetByName(styleName) || this.presets.get('cinematic 3d')!;
    const styledPrompt = `${basePrompt}, ${preset.promptModifier}, colors: ${preset.paletteTags.join(', ')}`;
    return {
      styledPrompt,
      negativePrompt: preset.negativePrompt
    };
  }

  generateEnvironmentRef(locationName: string, stylePresetName: string): EnvironmentRefItem {
    console.log(`[StyleService] Generating environment reference for '${locationName}' in style '${stylePresetName}'`);

    const key = `${locationName.toLowerCase()}:${stylePresetName.toLowerCase()}`;
    if (this.environments.has(key)) {
      return this.environments.get(key)!;
    }

    const { styledPrompt } = this.injectStyleToPrompt(`Atmospheric environment shot of ${locationName}, architectural details, panoramic view`, stylePresetName);

    const envRef: EnvironmentRefItem = {
      id: `env-${Date.now()}`,
      locationName,
      stylePresetName,
      environmentPrompt: styledPrompt,
      coherenceScore: 0.96
    };

    this.environments.set(key, envRef);
    return envRef;
  }

  private seedDefaultPresets() {
    const defaults: StylePresetItem[] = [
      {
        name: 'Cinematic 3D',
        category: '3D Render',
        promptModifier: 'unreal engine 5 render, cinematic lighting, 8k resolution, photorealistic depth of field, raytracing reflections',
        negativePrompt: 'blurry, low quality, distorted, cartoonish, 2d, watermark',
        paletteTags: ['Teal & Orange', 'Deep Shadows', 'Volumetric Fog'],
        coherenceScore: 0.96
      },
      {
        name: 'Anime',
        category: 'Animation',
        promptModifier: 'Makoto Shinkai style, vibrant anime art, hand-drawn aesthetic, sky full of stars, expressive lighting',
        negativePrompt: '3d, realistic photograph, grainy, dull colors',
        paletteTags: ['Pastel Sky', 'Vivid Cyan', 'Warm Sunset'],
        coherenceScore: 0.94
      },
      {
        name: 'Cyberpunk',
        category: 'Sci-Fi',
        promptModifier: 'neon lights, wet pavement reflections, futuristic cybernetic details, blade runner aesthetic, high tech low life',
        negativePrompt: 'daylight, rural, historical, pastel, monochrome',
        paletteTags: ['Neon Magenta', 'Electric Blue', 'Dark Chrome'],
        coherenceScore: 0.95
      },
      {
        name: 'Vintage Noir',
        category: 'Classic Film',
        promptModifier: '1940s film noir, high contrast black and white, dramatic venetian blind shadows, moody smoke atmosphere',
        negativePrompt: 'color, neon, futuristic, cartoon',
        paletteTags: ['Monochrome', 'Deep Charcoal', 'Stark White'],
        coherenceScore: 0.93
      },
      {
        name: 'Watercolor',
        category: 'Artistic',
        promptModifier: 'delicate watercolor painting, soft paper texture, wet-on-wet paint drips, dreamy atmospheric wash',
        negativePrompt: 'photorealistic, sharp digital 3d, heavy black outlines',
        paletteTags: ['Soft Lavender', 'Rose Gold', 'Sage Green'],
        coherenceScore: 0.91
      },
      {
        name: 'Historic Documentary',
        category: 'Documentary',
        promptModifier: 'National Geographic photography, authentic historical detail, natural daylight, archival quality photo',
        negativePrompt: 'fantasy, sci-fi, neon, anime, 3d render',
        paletteTags: ['Sepia Gold', 'Earth Tones', 'Aged Canvas'],
        coherenceScore: 0.97
      }
    ];

    for (const preset of defaults) {
      this.presets.set(preset.name.toLowerCase(), preset);
    }
  }
}
