import { ImageService } from '../src/services/ImageService';

describe('Sprint 5 Backend Test Suite — Keyframe Image Generation Pipeline (BE-039 to BE-045)', () => {
  let imageService: ImageService;

  beforeEach(() => {
    imageService = new ImageService();
  });

  test('BE-039: Generate single keyframe image with seed & provider', async () => {
    const image = await imageService.generateKeyframeImage('scene-101', 'Cinematic shot of hero', 'replicate-flux', 998877);

    expect(image.id).toBeDefined();
    expect(image.sceneId).toBe('scene-101');
    expect(image.seed).toBe(998877);
    expect(image.provider).toBe('replicate-flux');
    expect(image.status).toBe('COMPLETED');
  });

  test('BE-040 & BE-044: Batch generate keyframe images for multiple scenes concurrently', async () => {
    const scenes = [
      { sceneId: 'scene-201', prompt: 'Prompt 1' },
      { sceneId: 'scene-202', prompt: 'Prompt 2' },
      { sceneId: 'scene-203', prompt: 'Prompt 3' }
    ];

    const job = await imageService.startBatchGeneration(scenes);

    expect(job.jobId).toBeDefined();
    expect(job.totalImages).toBe(3);
    expect(job.completedImages).toBe(3);
    expect(job.status).toBe('COMPLETED');
    expect(job.images.length).toBe(3);
  });

  test('BE-041: Fetch job status by jobId', async () => {
    const job = await imageService.startBatchGeneration([{ sceneId: 'scene-301', prompt: 'Test prompt' }]);
    const fetched = await imageService.getJobStatus(job.jobId);

    expect(fetched).not.toBeNull();
    expect(fetched?.jobId).toBe(job.jobId);
  });

  test('BE-042: Upscale image resolution to 2048x2048', async () => {
    const image = await imageService.generateKeyframeImage('scene-401', 'High detail render');
    const upscaled = await imageService.upscaleImage(image.id!);

    expect(upscaled).not.toBeNull();
    expect(upscaled?.isUpscaled).toBe(true);
    expect(upscaled?.width).toBe(2048);
    expect(upscaled?.height).toBe(2048);
  });

  test('BE-043: Ensure seed locking produces consistent parameters', async () => {
    const img1 = await imageService.generateKeyframeImage('scene-501', 'Static scene', 'replicate-sdxl', 555111);
    expect(img1.seed).toBe(555111);
  });

  test('BE-045: Return null when querying non-existent image job ID', async () => {
    const nonExistent = await imageService.getJobStatus('job-non-existent-999');
    expect(nonExistent).toBeNull();
  });
});
