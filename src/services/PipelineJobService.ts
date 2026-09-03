import { TranslationResult } from '../types';

export type PipelineJobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface PipelineJobProgress {
  stage: string;
  completed: number;
  total: number;
}

export interface TranslationRunStats {
  paragraphCount: number;
  paragraphRetries: number;
  templateOpenerRejections: number;
  fullStoryRetries: number;
  totalParagraphAttempts: number;
  perParagraphLatencyMs: number[];
  parallelConcurrency: number;
  wallTimeMs: number;
}

export interface PipelineJobRecord {
  id: string;
  type: 'translate' | 'translate_and_narrate';
  status: PipelineJobStatus;
  progress: PipelineJobProgress;
  createdAt: Date;
  updatedAt: Date;
  result?: {
    translation?: TranslationResult;
    narrationText?: string;
    audio?: Record<string, unknown>;
    translationStats?: TranslationRunStats;
  };
  error?: string;
}

export class PipelineJobService {
  private jobs = new Map<string, PipelineJobRecord>();

  create(type: PipelineJobRecord['type'], total: number, stage: string): PipelineJobRecord {
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const job: PipelineJobRecord = {
      id,
      type,
      status: 'queued',
      progress: { stage, completed: 0, total },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, job);
    return job;
  }

  get(id: string): PipelineJobRecord | null {
    return this.jobs.get(id) ?? null;
  }

  update(id: string, patch: Partial<PipelineJobRecord>): PipelineJobRecord | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    const updated: PipelineJobRecord = {
      ...job,
      ...patch,
      progress: patch.progress ?? job.progress,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updated);
    return updated;
  }

  setProgress(id: string, stage: string, completed: number, total?: number): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.progress = {
      stage,
      completed,
      total: total ?? job.progress.total,
    };
    job.status = 'processing';
    job.updatedAt = new Date();
  }
}

export const pipelineJobService = new PipelineJobService();
