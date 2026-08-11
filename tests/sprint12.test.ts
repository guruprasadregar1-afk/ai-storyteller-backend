import { QueueService } from '../src/services/QueueService';

describe('Sprint 12 Backend Test Suite — Production-Grade Queue & Webhooks (BE-086 to BE-092)', () => {
  let queueService: QueueService;

  beforeEach(() => {
    queueService = new QueueService();
  });

  test('BE-086 & BE-091: Enqueue job and trigger webhook callback', async () => {
    const job = await queueService.enqueueJob('render_video_task', { scriptId: 'script-1201' }, 'https://webhook.site/test-12');

    expect(job.id).toBeDefined();
    expect(job.taskName).toBe('render_video_task');
    expect(job.status).toBe('COMPLETED');
    expect(job.webhookUrl).toBe('https://webhook.site/test-12');
  });

  test('BE-087: Fetch queued job by ID', async () => {
    const created = await queueService.enqueueJob('audio_synthesis_task', { text: 'Hello world' });
    const fetched = await queueService.getJob(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);
  });

  test('BE-088 & BE-089: Retry failed job with exponential backoff and flag FAILED on max attempts', async () => {
    const job = await queueService.enqueueJob('unstable_task', {}, undefined, 2);

    const retry1 = await queueService.retryJob(job.id, 'API Timeout');
    expect(retry1?.status).toBe('RETRYING');
    expect(retry1?.attempts).toBe(2);

    const backoffMs = queueService.calculateExponentialBackoffMs(retry1!.attempts);
    expect(backoffMs).toBe(4000); // 2^2 * 1000 = 4000ms

    const retry2 = await queueService.retryJob(job.id, 'Second Failure');
    expect(retry2?.status).toBe('FAILED');
    expect(retry2?.attempts).toBe(3);
  });

  test('BE-090: Register webhook URL for event listener', () => {
    const registered = queueService.registerWebhook('video.rendered', 'https://example.com/api/video-done');

    expect(registered.event).toBe('video.rendered');
    expect(registered.registered).toBe(true);
  });

  test('BE-092: Return null when fetching non-existent queue job ID', async () => {
    const nullResult = await queueService.getJob('job-q-invalid-999');
    expect(nullResult).toBeNull();
  });
});
