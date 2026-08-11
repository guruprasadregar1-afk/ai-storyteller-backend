import { Request, Response } from 'express';
import { BranchingService } from '../../../services/BranchingService';

const branchingService = new BranchingService();

export async function addScriptBranchNodeController(req: Request, res: Response) {
  const { id } = req.params;
  const { nodeId, parentId, choiceText, sceneContent } = req.body;
  const node = branchingService.addBranchNode(id, nodeId, parentId, choiceText, sceneContent);
  res.json({ success: true, node });
}

export async function getScriptBranchTreeController(req: Request, res: Response) {
  const { id } = req.params;
  const tree = branchingService.getBranchTree(id);
  res.json({ success: true, tree });
}

export async function traverseScriptChoicesController(req: Request, res: Response) {
  const { id } = req.params;
  const { currentNodeId, choiceIndex } = req.body;
  const nextNode = branchingService.traverseChoice(id, currentNodeId, choiceIndex || 0);
  res.json({ success: true, nextNode });
}
