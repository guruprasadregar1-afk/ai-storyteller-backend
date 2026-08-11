import { KeyframeImageItem, ImageGenerationJob } from '../types';

export class ImageService {
  private imagesStore: Map<string, KeyframeImageItem> = new Map();
  private jobsStore: Map<string, ImageGenerationJob> = new Map();

  async generateKeyframeImage(
    sceneId: string,
    prompt: string,
    provider = 'replicate-flux',
    seed = 424242
  ): Promise<KeyframeImageItem> {
    const validSceneId = sceneId || `scene-${Date.now()}`;
    console.log(`[ImageService] Generating keyframe image for scene '${validSceneId}' using provider '${provider}'`);

    const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const image: KeyframeImageItem = {
      id: imageId,
      sceneId: validSceneId,
      prompt: prompt || 'Cinematic keyframe rendering',
      imageUrl: `https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1024&auto=format&fit=crop&q=80`,
      provider,
      width: 1024,
      height: 1024,
      seed,
      isUpscaled: false,
      status: 'COMPLETED'
    };

    this.imagesStore.set(imageId, image);
    return image;
  }

  async startBatchGeneration(scenePrompts: Array<{ sceneId?: string; prompt?: string }>): Promise<ImageGenerationJob> {
    const jobId = `job-img-${Date.now()}`;
    console.log(`[ImageService] Queueing batch image generation job '${jobId}' for ${scenePrompts.length} scenes`);

    const generatedImages: KeyframeImageItem[] = [];
    const validSceneIds: string[] = [];

    for (let i = 0; i < scenePrompts.length; i++) {
      const item = scenePrompts[i];
      const targetSceneId = item.sceneId || `scene-batch-${i + 1}`;
      validSceneIds.push(targetSceneId);
      const img = await this.generateKeyframeImage(targetSceneId, item.prompt || 'Cinematic visual beat');
      generatedImages.push(img);
    }

    const job: ImageGenerationJob = {
      jobId,
      sceneIds: validSceneIds,
      totalImages: scenePrompts.length,
      completedImages: scenePrompts.length,
      status: 'COMPLETED',
      images: generatedImages
    };

    this.jobsStore.set(jobId, job);
    return job;
  }

  async getJobStatus(jobId: string): Promise<ImageGenerationJob | null> {
    return this.jobsStore.get(jobId) || null;
  }

  async upscaleImage(imageId: string): Promise<KeyframeImageItem | null> {
    const existing = this.imagesStore.get(imageId);
    if (!existing) {
      return null;
    }

    const upscaled: KeyframeImageItem = {
      ...existing,
      width: 2048,
      height: 2048,
      isUpscaled: true,
      imageUrl: existing.imageUrl.replace('w=1024', 'w=2048')
    };

    this.imagesStore.set(imageId, upscaled);
    return upscaled;
  }
}
