import { Router } from 'express';
import {
  createWorkspaceController,
  addWorkspaceMemberController,
  checkWorkspacePermissionsController,
  getSubscriptionController,
  createCheckoutSessionController,
  getUsageController
} from './users.controller';

export const usersRouter = Router();

usersRouter.post('/workspaces', createWorkspaceController);
usersRouter.post('/workspaces/:id/members', addWorkspaceMemberController);
usersRouter.get('/workspaces/:id/permissions', checkWorkspacePermissionsController);

usersRouter.get('/billing/subscription', getSubscriptionController);
usersRouter.get('/billing/usage', getUsageController);
usersRouter.get('/users/:userId/usage', getUsageController);
usersRouter.get('/users/usage', getUsageController);
usersRouter.post('/billing/checkout', createCheckoutSessionController);
