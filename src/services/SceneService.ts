import { AIProviderManager } from '../ai/AIProviderManager';
import { SceneBeatItem } from '../types';

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
    return hydratedBeats;
  }

  async getScenesByScriptId(scriptId: string): Promise<SceneBeatItem[]> {
    return this.scenesStore.get(scriptId) || [];
  }

  async updateSceneBeat(scriptId: string, sceneId: string, updates: Partial<SceneBeatItem>): Promise<SceneBeatItem | null> {
    const scenes = this.scenesStore.get(scriptId) || [];
    const index = scenes.findIndex(s => s.id === sceneId || s.beatIndex === Number(sceneId));

    if (index === -1) {
      return null;
    }

    scenes[index] = {
      ...scenes[index],
      ...updates
    };

    this.scenesStore.set(scriptId, scenes);
    return scenes[index];
  }
}
