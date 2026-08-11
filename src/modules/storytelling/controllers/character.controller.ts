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
  const bible = await characterService.generateVisualBible({ id, name: 'Character', description: 'Hero', role: 'MAIN' });
  res.json({ success: true, bible });
}

export async function getCharacterBibleController(req: Request, res: Response) {
  const { id } = req.params;
  const bible = characterService.getVisualBible(id);
  res.json({ success: true, bible });
}

export async function updateCharacterAvatarController(req: Request, res: Response) {
  const { id } = req.params;
  const { avatarUrl } = req.body;
  const updated = characterService.updateAvatar(id, avatarUrl);
  res.json({ success: true, character: updated });
}
