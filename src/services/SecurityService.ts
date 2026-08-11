import { AuditLogItem } from '../types';
import { prismaService } from '../database/prisma/prisma.service';

export class SecurityService {
  private auditLogsStore: AuditLogItem[] = [];
  private rateLimiterStore: Map<string, { count: number; windowStart: number }> = new Map();

  sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  checkRateLimit(ip: string, limit = 100, windowMs = 60000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.rateLimiterStore.get(ip) || { count: 0, windowStart: now };

    if (now - record.windowStart > windowMs) {
      record.count = 1;
      record.windowStart = now;
    } else {
      record.count += 1;
    }

    this.rateLimiterStore.set(ip, record);
    const allowed = record.count <= limit;
    const remaining = Math.max(0, limit - record.count);
    return { allowed, remaining };
  }

  logAudit(userId: string, action: string, ipAddress = '127.0.0.1'): AuditLogItem {
    console.log(`[SecurityService] Audit Log: User '${userId}' executed '${action}' from ${ipAddress}`);

    const logItem: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      userId,
      action,
      ipAddress,
      timestamp: new Date()
    };

    this.auditLogsStore.push(logItem);

    if (prismaService.isAvailable) {
      try {
        prismaService.auditLog.create({
          data: {
            id: logItem.id,
            userId: logItem.userId,
            action: logItem.action,
            ipAddress: logItem.ipAddress
          }
        }).catch(() => {});
      } catch {
        // In-memory fallback
      }
    }

    return logItem;
  }

  getAuditLogs(): AuditLogItem[] {
    return this.auditLogsStore;
  }

  getDiagnostics() {
    const memory = process.memoryUsage();
    return {
      status: 'HEALTHY',
      version: 'production-v1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      activeRateLimiters: this.rateLimiterStore.size,
      totalAuditLogsRecorded: this.auditLogsStore.length,
      activeServices: [
        'ContentService', 'ResearchService', 'RightsService', 'ScriptService',
        'SceneService', 'CharacterService', 'NarratorService', 'StyleService',
        'ImageService', 'VoiceService', 'AudioService', 'VideoService',
        'TimelineService', 'SubtitleService', 'RenderService', 'QueueService',
        'ExportService', 'PromptLabService', 'CollaborationService', 'BranchingService',
        'WorkspaceService', 'BillingService', 'AnalyticsService', 'SecurityService'
      ]
    };
  }
}
