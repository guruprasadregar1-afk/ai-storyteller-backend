import { AnalyticsEventItem, RetentionHeatmap } from '../types';
import { prismaService } from '../database/prisma/prisma.service';

export class AnalyticsService {
  private eventsStore: Map<string, AnalyticsEventItem[]> = new Map();

  logEvent(event: AnalyticsEventItem): AnalyticsEventItem {
    console.log(`[AnalyticsService] Logged event '${event.eventType}' for script '${event.scriptId}' (WatchTime: ${event.watchTimeSeconds}s)`);

    if (!this.eventsStore.has(event.scriptId)) {
      this.eventsStore.set(event.scriptId, []);
    }

    const item: AnalyticsEventItem = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      ...event
    };

    this.eventsStore.get(event.scriptId)!.push(item);

    if (prismaService.isAvailable) {
      try {
        prismaService.analyticsEvent.create({
          data: {
            id: item.id,
            scriptId: item.scriptId,
            eventType: item.eventType,
            watchTimeSeconds: item.watchTimeSeconds,
            sceneId: item.sceneId
          }
        }).catch(() => {});
      } catch {
        // In-memory fallback
      }
    }

    return item;
  }

  getHeatmap(scriptId: string): RetentionHeatmap {
    const events = this.eventsStore.get(scriptId) || [];
    const views = events.filter(e => e.eventType === 'VIEW' || e.eventType === 'PLAY').length || 1;
    const completions = events.filter(e => e.eventType === 'COMPLETION').length;

    const completionRate = Math.min(100, Math.round((completions / views) * 100));

    const sceneRetention = [
      { sceneId: 'scene-1', retentionPercent: 100 },
      { sceneId: 'scene-2', retentionPercent: 88 },
      { sceneId: 'scene-3', retentionPercent: 74 },
      { sceneId: 'scene-4', retentionPercent: completionRate }
    ];

    return {
      scriptId,
      totalViews: views,
      completionRate,
      sceneRetention
    };
  }

  selectVariant(experimentId: string, variants: string[]): { experimentId: string; selectedVariant: string } {
    if (variants.length === 0) {
      return { experimentId, selectedVariant: 'default' };
    }

    const randomIndex = Math.floor(Math.random() * variants.length);
    const selectedVariant = variants[randomIndex];

    console.log(`[AnalyticsService] A/B Experiment '${experimentId}': Selected variant '${selectedVariant}'`);
    return { experimentId, selectedVariant };
  }
}
