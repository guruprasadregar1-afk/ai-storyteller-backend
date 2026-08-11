import { Router } from 'express';
import { getAuditLogsController } from './auth.controller';

export const authRouter = Router();

authRouter.get('/security/audit-logs', getAuditLogsController);
