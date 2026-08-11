import { Request, Response } from 'express';
import { AnalyticsService } from '../../../services/AnalyticsService';

const analyticsService = new AnalyticsService();

export async function logAnalyticsEventController(req: Request, res: Response) {
  const { scriptId, eventType, watchTimeSeconds, sceneId } = req.body;
  const event = analyticsService.logEvent({
    scriptId,
    eventType: eventType || 'VIEW',
    watchTimeSeconds: watchTimeSeconds || 0,
    sceneId
  });
  res.json({ success: true, event });
}

export async function getRetentionHeatmapController(req: Request, res: Response) {
  const { scriptId } = req.params;
  const heatmap = analyticsService.getHeatmap(scriptId);
  res.json({ success: true, heatmap });
}

export async function runABExperimentController(req: Request, res: Response) {
  const { experimentId, variants } = req.body;
  const selected = analyticsService.selectVariant(experimentId, variants || ['Variant-A', 'Variant-B']);
  res.json({ success: true, experiment: selected });
}
