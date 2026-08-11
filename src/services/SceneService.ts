import { AIProviderManager } from '../ai/AIProviderManager';
import { SceneBeatItem } from '../types';
import { prismaService } from '../database/prisma/prisma.service';

export class SceneService {
  private scenesStore: Map<string, SceneBeatItem[]> = new Map();

  constructor(private aiManager: AIProviderManager) {}

  async segmentScript(scriptId: string, scriptText: string): Promise<SceneBeatItem[]> {
    console.log(`[SceneService] Segmenting script '${scriptId}' into visual scene beats`);

    const beats = await this.aiManager.segmentScript(scriptText);
    const hydratedBeats = beats.map((beat, index) => ({
      ...beat,
      id: `scene-${scriptId}-${index + 1}`,
      scriptId
    }));

    this.scenesStore.set(scriptId, hydratedBeats);

    // Persist to Prisma DB
    if (prismaService.isAvailable) {
      try {
        for (const beat of hydratedBeats) {
          await prismaService.sceneBeat.upsert({
            where: { id: beat.id },
            update: {
              narrationText: beat.narrationText,
              visualPrompt: beat.visualPrompt,
              cameraDirective: beat.cameraDirective,
              lightingMood: beat.lightingMood,
              estimatedSeconds: beat.estimatedSeconds
            },
            create: {
              id: beat.id,
              scriptId: beat.scriptId,
              beatIndex: beat.beatIndex,
              narrationText: beat.narrationText,
              visualPrompt: beat.visualPrompt,
              cameraDirective: beat.cameraDirective,
              lightingMood: beat.lightingMood,
              estimatedSeconds: beat.estimatedSeconds
            }
          });
        }
        console.log(`[SceneService] Persisted ${hydratedBeats.length} scene beats for script '${scriptId}' to Prisma Database.`);
      } catch {
        // In-memory fallback
      }
    }

    return hydratedBeats;
  }

  async getScenesByScriptId(scriptId: string): Promise<SceneBeatItem[]> {
    if (prismaService.isAvailable) {
      try {
        const dbBeats = await prismaService.sceneBeat.findMany({
          where: { scriptId },
          orderBy: { beatIndex: 'asc' }
        });
        if (dbBeats.length > 0) {
          return dbBeats.map(b => ({
            id: b.id,
            scriptId: b.scriptId,
            beatIndex: b.beatIndex,
            narrationText: b.narrationText,
            visualPrompt: b.visualPrompt,
            cameraDirective: b.cameraDirective as any,
            lightingMood: b.lightingMood as any,
            estimatedSeconds: b.estimatedSeconds
          }));
        }
      } catch {
        // In-memory fallback
      }
    }

    return this.scenesStore.get(scriptId) || [];
  }

  async updateSceneBeat(scriptId: string, sceneId: string, updates: Partial<SceneBeatItem>): Promise<SceneBeatItem | null> {
    const scenes = this.scenesStore.get(scriptId) || [];
    const index = scenes.findIndex(s => s.id === sceneId || s.beatIndex === Number(sceneId));

    if (index !== -1) {
      scenes[index] = {
        ...scenes[index],
        ...updates
      };
      this.scenesStore.set(scriptId, scenes);
    }

    if (prismaService.isAvailable) {
      try {
        await prismaService.sceneBeat.update({
          where: { id: sceneId },
          data: {
            narrationText: updates.narrationText,
            visualPrompt: updates.visualPrompt,
            cameraDirective: updates.cameraDirective,
            lightingMood: updates.lightingMood,
            estimatedSeconds: updates.estimatedSeconds
          }
        });
      } catch {
        // In-memory fallback
      }
    }

    return index !== -1 ? scenes[index] : null;
  }
}
