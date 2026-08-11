import { ClassifyResult, ScriptGenerationParams, ScriptResult, CharacterItem, VoiceProfileResult, SceneBeatItem, CharacterVisualItem } from '../../../types';

export interface IAIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  classifyContent(input: string): Promise<ClassifyResult>;
  generateScript(title: string, contentType: string, facts: string[], params: ScriptGenerationParams): Promise<ScriptResult>;
  extractCharacters(scriptText: string): Promise<CharacterItem[]>;
  recommendNarrator(scriptText: string, contentType: string): Promise<VoiceProfileResult>;
  segmentScriptToBeats(scriptText: string): Promise<SceneBeatItem[]>;
  generateCharacterVisuals(character: CharacterItem): Promise<CharacterVisualItem>;
}
