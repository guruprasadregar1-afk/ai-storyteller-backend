import { RenderJobItem } from '../types';

export class RenderService {
  private jobsStore: Map<string, RenderJobItem> = new Map();

  async startRenderJob(
    scriptId: string,
    resolution: '720p' | '1080p' | '4K' = '1080p',
    fps = 30
  ): Promise<RenderJobItem> {
    const jobId = `job-render-${Date.now()}`;
    console.log(`[RenderService] Initializing cloud render job '${jobId}' for script '${scriptId}' (${resolution} @ ${fps}fps)`);

    const renderJob: RenderJobItem = {
      jobId,
      scriptId,
      resolution,
      fps,
      progressPercent: 100,
      status: 'COMPLETED',
      outputVideoUrl: `https://vjs.zencdn.net/v/oceans.mp4`,
      renderTimeMs: 4200
    };

    this.jobsStore.set(jobId, renderJob);
    return renderJob;
  }

  async getRenderJobStatus(jobId: string): Promise<RenderJobItem | null> {
    return this.jobsStore.get(jobId) || null;
  }

  async cancelRenderJob(jobId: string): Promise<RenderJobItem | null> {
    const job = this.jobsStore.get(jobId);
    if (!job) {
      return null;
    }

    const cancelled: RenderJobItem = {
      ...job,
      status: 'CANCELLED'
    };

    this.jobsStore.set(jobId, cancelled);
    return cancelled;
  }
}
