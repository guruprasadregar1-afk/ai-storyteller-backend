import { SocialExportItem } from '../types';

export class ExportService {
  private exportsStore: Map<string, SocialExportItem> = new Map();

  async adaptForSocial(
    scriptId: string,
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:5' = '16:9',
    targetPlatform = 'YouTube'
  ): Promise<SocialExportItem> {
    console.log(`[ExportService] Adapting video for script '${scriptId}' to ${aspectRatio} for platform '${targetPlatform}'`);

    const dims = this.calculateDimensions(aspectRatio);
    const hashtags = this.generatePlatformHashtags(targetPlatform);

    const exportItem: SocialExportItem = {
      id: `exp-${Date.now()}`,
      scriptId,
      aspectRatio,
      targetPlatform,
      width: dims.width,
      height: dims.height,
      exportUrl: `https://vjs.zencdn.net/v/oceans.mp4`,
      hashtags
    };

    this.exportsStore.set(exportItem.id!, exportItem);
    return exportItem;
  }

  calculateDimensions(aspectRatio: '16:9' | '9:16' | '1:1' | '4:5'): { width: number; height: number } {
    switch (aspectRatio) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '4:5':
        return { width: 1080, height: 1350 };
      case '16:9':
      default:
        return { width: 1920, height: 1080 };
    }
  }

  generatePlatformHashtags(platform: string): string[] {
    const common = ['#AIStoryteller', '#AIContent', '#ViralStory'];
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return [...common, '#FYP', '#TikTokStories', '#ViralAI'];
      case 'instagram':
      case 'reels':
        return [...common, '#ReelsInstagram', '#InstaStory', '#AIVideo'];
      case 'youtube':
      case 'shorts':
        return [...common, '#Shorts', '#YouTubeShorts', '#Storytelling'];
      default:
        return common;
    }
  }

  getAvailableFormats(): Array<{ ratio: string; name: string; target: string; dimensions: string }> {
    return [
      { ratio: '16:9', name: 'Widescreen HD / 4K', target: 'YouTube, TV, Web', dimensions: '1920x1080' },
      { ratio: '9:16', name: 'Vertical Mobile Fullscreen', target: 'TikTok, Instagram Reels, YouTube Shorts', dimensions: '1080x1920' },
      { ratio: '1:1', name: 'Square Feed', target: 'Instagram Posts, LinkedIn', dimensions: '1080x1080' },
      { ratio: '4:5', name: 'Portrait Feed', target: 'Instagram Portrait Feed', dimensions: '1080x1350' }
    ];
  }
}
