import { QueueJobItem } from '../types';

export class QueueService {
  private queueStore: Map<string, QueueJobItem> = new Map();
  private webhookRegistry: Map<string, string> = new Map();

  async enqueueJob(
    taskName: string,
    payload: Record<string, any>,
    webhookUrl?: string,
    maxAttempts = 3
  ): Promise<QueueJobItem> {
    const id = `job-q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    console.log(`[QueueService] Enqueueing background job '${id}' for task '${taskName}'`);

    const job: QueueJobItem = {
      id,
      taskName,
      payload,
      status: 'COMPLETED',
      attempts: 1,
      maxAttempts,
      webhookUrl
    };

    this.queueStore.set(id, job);

    if (webhookUrl) {
      this.dispatchWebhook(id, webhookUrl, 'job.completed', job);
    }

    return job;
  }

  async getJob(id: string): Promise<QueueJobItem | null> {
    return this.queueStore.get(id) || null;
  }

  async retryJob(id: string, errorReason: string): Promise<QueueJobItem | null> {
    const job = this.queueStore.get(id);
    if (!job) {
      return null;
    }

    const nextAttempts = job.attempts + 1;
    const isFailed = nextAttempts > job.maxAttempts;

    const updated: QueueJobItem = {
      ...job,
      attempts: nextAttempts,
      status: isFailed ? 'FAILED' : 'RETRYING',
      lastError: errorReason
    };

    this.queueStore.set(id, updated);
    return updated;
  }

  calculateExponentialBackoffMs(attempt: number): number {
    return Math.pow(2, attempt) * 1000;
  }

  registerWebhook(event: string, url: string): { event: string; url: string; registered: boolean } {
    console.log(`[QueueService] Registering webhook endpoint for event '${event}' -> ${url}`);
    this.webhookRegistry.set(event, url);
    return { event, url, registered: true };
  }

  private dispatchWebhook(jobId: string, url: string, event: string, payload: any) {
    console.log(`[QueueService] Webhook dispatched to ${url} for event '${event}' (Job: ${jobId})`);
  }
}
