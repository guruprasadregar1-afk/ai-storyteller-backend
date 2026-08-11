import { VideoService } from '../src/services/VideoService';

describe('Sprint 8 Backend Test Suite — Video Motion & Camera Animation (BE-059 to BE-065)', () => {
  let videoService: VideoService;

  beforeEach(() => {
    videoService = new VideoService();
  });

  test('BE-059 & BE-063: Trigger image-to-video animation with Runway Gen-3 provider', async () => {
    const job = await videoService.generateVideoMotion(
      'scene-801',
      'https://example.com/frame.jpg',
      'PAN_RIGHT',
      7.5,
      'runway-gen3'
    );

    expect(job.jobId).toBeDefined();
    expect(job.motion.motionType).toBe('PAN_RIGHT');
    expect(job.motion.motionStrength).toBe(7.5);
    expect(job.motion.provider).toBe('runway-gen3');
    expect(job.status).toBe('COMPLETED');
  });

  test('BE-060 & BE-064: Fetch video generation job status by jobId', async () => {
    const created = await videoService.generateVideoMotion('scene-802', 'https://example.com/frame2.jpg');
    const fetched = await videoService.getVideoJobStatus(created.jobId);

    expect(fetched).not.toBeNull();
    expect(fetched?.jobId).toBe(created.jobId);
    expect(fetched?.progressPercent).toBe(100);
  });

  test('BE-061: Extend video clip duration by 4.0 seconds', async () => {
    await videoService.generateVideoMotion('scene-803', 'https://example.com/frame3.jpg');
    const extended = await videoService.extendVideoDuration('scene-803', 4.0);

    expect(extended).not.toBeNull();
    expect(extended?.durationSeconds).toBe(8.0);
  });

  test('BE-062: Update motion preset type and strength', async () => {
    await videoService.generateVideoMotion('scene-804', 'https://example.com/frame4.jpg', 'PAN_LEFT', 3.0);
    const updated = await videoService.updateMotionSettings('scene-804', 'ZOOM_IN', 8.0);

    expect(updated).not.toBeNull();
    expect(updated?.motionType).toBe('ZOOM_IN');
    expect(updated?.motionStrength).toBe(8.0);
  });

  test('BE-065: Return null when querying non-existent video job ID', async () => {
    const nonExistent = await videoService.getVideoJobStatus('job-vid-invalid-999');
    expect(nonExistent).toBeNull();
  });
});
