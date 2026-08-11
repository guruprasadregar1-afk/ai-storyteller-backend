import { AuditLogItem, SystemDiagnostics } from '../types';

export class SecurityService {
  private auditLogsStore: AuditLogItem[] = [];
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  checkRateLimit(ipAddress: string, maxRequests = 100, windowMs = 60000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    let record = this.requestCounts.get(ipAddress);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      this.requestCounts.set(ipAddress, record);
      return { allowed: true, remaining: maxRequests - 1 };
    }

    record.count++;
    if (record.count > maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: maxRequests - record.count };
  }

  logAudit(userId: string, action: string, ipAddress = '127.0.0.1'): AuditLogItem {
    console.log(`[SecurityService] Audit Log: User '${userId}' executed '${action}' from ${ipAddress}`);

    const item: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      userId,
      action,
      ipAddress,
      timestamp: new Date()
    };

    this.auditLogsStore.push(item);
    return item;
  }

  getAuditLogs(): AuditLogItem[] {
    return [...this.auditLogsStore];
  }

  getDiagnostics(): SystemDiagnostics {
    return {
      status: 'HEALTHY',
      version: '1.0.0-production',
      activeServices: [
        'ContentService',
        'ScriptService',
        'CharacterService',
        'SceneService',
        'StyleService',
        'ImageService',
        'VoiceService',
        'AudioService',
        'VideoService',
        'TimelineService',
        'SubtitleService',
        'RenderService',
        'QueueService',
        'ExportService',
        'PromptLabService',
        'CollaborationService',
        'BranchingService',
        'WorkspaceService',
        'BillingService',
        'AnalyticsService',
        'SecurityService',
        'MasterOrchestratorService'
      ],
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }
}
