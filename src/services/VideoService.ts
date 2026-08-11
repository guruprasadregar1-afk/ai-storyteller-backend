import { VideoMotionItem, VideoJobStatus } from '../types';

export class VideoService {
  private motionStore: Map<string, VideoMotionItem> = new Map();
  private jobsStore: Map<string, VideoJobStatus> = new Map();

  async generateVideoMotion(
    sceneId: string,
    sourceImageUrl: string,
    motionType: 'PAN_LEFT' | 'PAN_RIGHT' | 'ZOOM_IN' | 'ZOOM_OUT' | 'ORBIT' | 'TILT_UP' = 'PAN_RIGHT',
    motionStrength = 5.0,
    provider = 'runway-gen3'
  ): Promise<VideoJobStatus> {
    console.log(`[VideoService] Generating video motion '${motionType}' for scene '${sceneId}' using '${provider}'`);

    const jobId = `job-vid-${Date.now()}`;
    const motion: VideoMotionItem = {
      id: `vid-${Date.now()}`,
      sceneId,
      sourceImageUrl,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      motionType,
      motionStrength,
      provider,
      durationSeconds: 4.0,
      status: 'COMPLETED'
    };

    const jobStatus: VideoJobStatus = {
      jobId,
      sceneId,
      motion,
      progressPercent: 100,
      status: 'COMPLETED'
    };

    this.motionStore.set(sceneId, motion);
    this.jobsStore.set(jobId, jobStatus);
    return jobStatus;
  }

  async getVideoJobStatus(jobId: string): Promise<VideoJobStatus | null> {
    return this.jobsStore.get(jobId) || null;
  }

  async extendVideoDuration(sceneId: string, additionalSeconds = 4.0): Promise<VideoMotionItem | null> {
    const existing = this.motionStore.get(sceneId);
    if (!existing) {
      return null;
    }

    const extended: VideoMotionItem = {
      ...existing,
      durationSeconds: existing.durationSeconds + additionalSeconds
    };

    this.motionStore.set(sceneId, extended);
    return extended;
  }

  async updateMotionSettings(
    sceneId: string,
    motionType: 'PAN_LEFT' | 'PAN_RIGHT' | 'ZOOM_IN' | 'ZOOM_OUT' | 'ORBIT' | 'TILT_UP',
    motionStrength: number
  ): Promise<VideoMotionItem | null> {
    const existing = this.motionStore.get(sceneId);
    if (!existing) {
      return null;
    }

    const updated: VideoMotionItem = {
      ...existing,
      motionType,
      motionStrength
    };

    this.motionStore.set(sceneId, updated);
    return updated;
  }
}
