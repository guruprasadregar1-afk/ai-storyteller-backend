import { SecurityService } from '../../services/SecurityService';

export class AuthService {
  private securityService = new SecurityService();

  async validateUserAccess(ip: string) {
    return this.securityService.checkRateLimit(ip);
  }

  async auditAction(userId: string, action: string, ip: string) {
    return this.securityService.logAudit(userId, action, ip);
  }
}
