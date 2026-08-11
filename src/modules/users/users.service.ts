import { WorkspaceService } from '../../services/WorkspaceService';
import { BillingService } from '../../services/BillingService';

export class UsersService {
  private workspaceService = new WorkspaceService();
  private billingService = new BillingService();

  async createWorkspace(name: string, ownerEmail: string) {
    return this.workspaceService.createWorkspace(name, ownerEmail || 'owner@example.com', ownerEmail);
  }

  async addMember(workspaceId: string, email: string, role: any) {
    return this.workspaceService.addMember(workspaceId, email, email, role);
  }

  async checkPermission(workspaceId: string, email: string, perm: string) {
    return this.workspaceService.hasPermission(workspaceId, email, perm as any);
  }

  async getSubscription(userId: string) {
    return this.billingService.getSubscription(userId);
  }

  async getUsage(userId: string) {
    return this.billingService.getUsage(userId);
  }

  async createCheckout(userId: string, targetTier: any) {
    return this.billingService.createCheckoutSession(userId, targetTier);
  }
}
