import { Request, Response } from 'express';
import { AIProviderManager } from '../../../ai/AIProviderManager';
import { NarratorService } from '../../../services/NarratorService';
import { VoiceService } from '../../../services/VoiceService';

const aiManager = new AIProviderManager();
const narratorService = new NarratorService(aiManager);
const voiceService = new VoiceService();

export async function getNarratorController(req: Request, res: Response) {
  const { id } = req.params;
  const narrator = await narratorService.selectNarrator({ title: id, contentType: 'HISTORICAL' }, '', []);
  res.json({ success: true, narrator });
}

export async function synthesizeNarratorController(req: Request, res: Response) {
  const { text, voiceId, emotion } = req.body;
  const audio = await voiceService.synthesizeSpeech(text, voiceId, emotion);
  res.json({ success: true, audio });
}

export async function synthesizeDialogueController(req: Request, res: Response) {
  const { turns } = req.body;
  const dialogue = await voiceService.synthesizeMultiSpeakerDialogue(turns || []);
  res.json({ success: true, dialogue });
}

export async function getVoiceCatalogController(req: Request, res: Response) {
  const voices = voiceService.getVoiceCatalog();
  res.json({ success: true, voices });
}
