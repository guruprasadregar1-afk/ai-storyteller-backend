import { ExportService } from '../src/services/ExportService';

describe('Sprint 13 Backend Test Suite — Aspect Ratio & Social Export Adapter (BE-093 to BE-098)', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService();
  });

  test('BE-093 & BE-096: Adapt video for TikTok vertical 9:16 aspect ratio (1080x1920)', async () => {
    const item = await exportService.adaptForSocial('script-1301', '9:16', 'TikTok');

    expect(item.id).toBeDefined();
    expect(item.aspectRatio).toBe('9:16');
    expect(item.targetPlatform).toBe('TikTok');
    expect(item.width).toBe(1080);
    expect(item.height).toBe(1920);
    expect(item.hashtags).toContain('#FYP');
  });

  test('BE-094: Calculate dimensions for 1:1 square feed (1080x1080)', () => {
    const dims = exportService.calculateDimensions('1:1');

    expect(dims.width).toBe(1080);
    expect(dims.height).toBe(1080);
  });

  test('BE-095: Generate platform specific hashtags for Instagram Reels', () => {
    const tags = exportService.generatePlatformHashtags('Instagram');

    expect(tags).toContain('#ReelsInstagram');
    expect(tags).toContain('#AIStoryteller');
  });

  test('BE-097: Fetch catalog of available export format specs', () => {
    const formats = exportService.getAvailableFormats();

    expect(formats.length).toBeGreaterThanOrEqual(4);
    const ratios = formats.map(f => f.ratio);
    expect(ratios).toContain('16:9');
    expect(ratios).toContain('9:16');
    expect(ratios).toContain('1:1');
    expect(ratios).toContain('4:5');
  });

  test('BE-098: Fallback to 16:9 widescreen dimensions (1920x1080) by default', () => {
    const dims = exportService.calculateDimensions('16:9');

    expect(dims.width).toBe(1920);
    expect(dims.height).toBe(1080);
  });
});
