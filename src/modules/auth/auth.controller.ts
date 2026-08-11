import { Request, Response } from 'express';
import { SecurityService } from '../../services/SecurityService';

const securityService = new SecurityService();

export async function getAuditLogsController(req: Request, res: Response) {
  const logs = securityService.getAuditLogs();
  res.json({ success: true, logs });
}
