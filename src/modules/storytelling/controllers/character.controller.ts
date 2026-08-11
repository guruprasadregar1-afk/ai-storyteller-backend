import { Request, Response } from 'express';
import { AIProviderManager } from '../../../ai/AIProviderManager';
import { CharacterService } from '../../../services/CharacterService';

const aiManager = new AIProviderManager();
const characterService = new CharacterService(aiManager);

export async function getCharactersController(req: Request, res: Response) {
  const { id } = req.params;
  const characters = await characterService.extractCharacters(id);
  res.json({ success: true, characters });
}

export async function generateCharacterVisualsController(req: Request, res: Response) {
  const { id } = req.params;
  const bible = await characterService.generateVisualBible(id);
  res.json({ success: true, bible });
}

export async function getCharacterBibleController(req: Request, res: Response) {
  const { id } = req.params;
  const bible = await characterService.getVisualBible(id);
  res.json({ success: true, bible });
}

export async function updateCharacterAvatarController(req: Request, res: Response) {
  const { id } = req.params;
  const { seed, avatarUrl, clothingStyle } = req.body;
  const updated = await characterService.updateAvatarAndSeed(id, seed || 424242, avatarUrl, clothingStyle);
  res.json({ success: true, character: updated });
}
