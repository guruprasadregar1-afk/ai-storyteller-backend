import { Request, Response } from 'express';
import { UsersService } from './users.service';

const usersService = new UsersService();

export async function createWorkspaceController(req: Request, res: Response) {
  const { name, ownerEmail } = req.body;
  const ws = await usersService.createWorkspace(name, ownerEmail);
  res.json({ success: true, workspace: ws });
}

export async function addWorkspaceMemberController(req: Request, res: Response) {
  const { id } = req.params;
  const { userEmail, role } = req.body;
  const member = await usersService.addMember(id, userEmail, role);
  res.json({ success: true, member });
}

export async function checkWorkspacePermissionsController(req: Request, res: Response) {
  const { id } = req.params;
  const { userEmail, permission } = req.query;
  const hasPerm = await usersService.checkPermission(id, userEmail as string, permission as string);
  res.json({ success: true, hasPermission: hasPerm });
}

export async function getSubscriptionController(req: Request, res: Response) {
  const userId = (req.query.userId as string) || 'user-default';
  const sub = await usersService.getSubscription(userId);
  res.json({ success: true, subscription: sub });
}

export async function createCheckoutSessionController(req: Request, res: Response) {
  const { userId, targetTier } = req.body;
  const session = await usersService.createCheckout(userId, targetTier);
  res.json({ success: true, checkoutSession: session });
}

export async function getUsageController(req: Request, res: Response) {
  const userId = (req.query.userId as string) || 'user-default';
  const usage = await usersService.getUsage(userId);
  res.json({ success: true, usage });
}
