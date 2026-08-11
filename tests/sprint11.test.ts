import { RenderService } from '../src/services/RenderService';

describe('Sprint 11 Backend Test Suite — Final Video Assembly & Rendering (BE-079 to BE-085)', () => {
  let renderService: RenderService;

  beforeEach(() => {
    renderService = new RenderService();
  });

  test('BE-079 & BE-085: Start cloud video render job and receive MP4 output URL', async () => {
    const job = await renderService.startRenderJob('script-1101', '1080p', 30);

    expect(job.jobId).toBeDefined();
    expect(job.scriptId).toBe('script-1101');
    expect(job.resolution).toBe('1080p');
    expect(job.fps).toBe(30);
    expect(job.status).toBe('COMPLETED');
    expect(job.outputVideoUrl).toContain('.mp4');
  });

  test('BE-080: Fetch render job status by jobId', async () => {
    const created = await renderService.startRenderJob('script-1102', '1080p');
    const fetched = await renderService.getRenderJobStatus(created.jobId);

    expect(fetched).not.toBeNull();
    expect(fetched?.jobId).toBe(created.jobId);
    expect(fetched?.progressPercent).toBe(100);
  });

  test('BE-081: Cancel active render job', async () => {
    const job = await renderService.startRenderJob('script-1103');
    const cancelled = await renderService.cancelRenderJob(job.jobId);

    expect(cancelled).not.toBeNull();
    expect(cancelled?.status).toBe('CANCELLED');
  });

  test('BE-082: Support 4K 60fps high-quality render configuration', async () => {
    const hqJob = await renderService.startRenderJob('script-1104', '4K', 60);

    expect(hqJob.resolution).toBe('4K');
    expect(hqJob.fps).toBe(60);
  });

  test('BE-083: Record render execution latency in milliseconds', async () => {
    const job = await renderService.startRenderJob('script-1105');
    expect(job.renderTimeMs).toBeGreaterThan(0);
  });

  test('BE-084: Return null when querying non-existent render job ID', async () => {
    const nullResult = await renderService.getRenderJobStatus('job-render-invalid-999');
    expect(nullResult).toBeNull();
  });
});
