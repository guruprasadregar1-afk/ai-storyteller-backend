import { AnalyticsService } from '../src/services/AnalyticsService';

describe('Sprint 19 Backend Test Suite — Analytics, Retention & A/B Experimentation (BE-129 to BE-134)', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  test('BE-129 & BE-134: Log telemetry events and track total video views', () => {
    const scriptId = 'script-1901';

    const evt1 = analyticsService.logEvent({ scriptId, eventType: 'VIEW', watchTimeSeconds: 0 });
    analyticsService.logEvent({ scriptId, eventType: 'PLAY', watchTimeSeconds: 15 });
    analyticsService.logEvent({ scriptId, eventType: 'COMPLETION', watchTimeSeconds: 60 });

    expect(evt1.id).toBeDefined();

    const heatmap = analyticsService.getHeatmap(scriptId);
    expect(heatmap.totalViews).toBe(2);
    expect(heatmap.completionRate).toBe(50); // 1 completion / 2 views = 50%
  });

  test('BE-130 & BE-131: Calculate scene retention heatmap breakdown', () => {
    const heatmap = analyticsService.getHeatmap('script-1902');

    expect(heatmap.sceneRetention.length).toBe(4);
    expect(heatmap.sceneRetention[0].retentionPercent).toBe(100);
  });

  test('BE-132: Select random variant for A/B testing experiment', () => {
    const result = analyticsService.selectVariant('exp-thumb-01', ['Variant-A', 'Variant-B']);

    expect(result.experimentId).toBe('exp-thumb-01');
    expect(['Variant-A', 'Variant-B']).toContain(result.selectedVariant);
  });

  test('BE-133: Fallback to default variant when variants array is empty', () => {
    const result = analyticsService.selectVariant('exp-empty', []);

    expect(result.selectedVariant).toBe('default');
  });
});
