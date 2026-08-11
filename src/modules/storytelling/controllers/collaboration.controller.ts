import { Request, Response } from 'express';
import { CollaborationService } from '../../../services/CollaborationService';

const collaborationService = new CollaborationService();

export async function createCollaborationRoomController(req: Request, res: Response) {
  const { scriptId } = req.body;
  const room = collaborationService.createRoom(scriptId);
  res.json({ success: true, room });
}

export async function lockSceneElementController(req: Request, res: Response) {
  const { id } = req.params;
  const { elementId, userId } = req.body;
  const lock = collaborationService.lockElement(id, elementId, userId);
  res.json({ success: true, lock });
}

export async function getRoomPresenceController(req: Request, res: Response) {
  const { id } = req.params;
  const presence = collaborationService.getPresence(id);
  res.json({ success: true, presence });
}
