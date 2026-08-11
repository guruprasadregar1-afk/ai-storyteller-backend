import { WorkspaceItem, WorkspaceMember } from '../types';

export class WorkspaceService {
  private workspacesStore: Map<string, WorkspaceItem> = new Map();

  createWorkspace(name: string, ownerId: string, ownerEmail: string): WorkspaceItem {
    const id = `ws-${Date.now()}`;
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    console.log(`[WorkspaceService] Creating workspace '${name}' for owner '${ownerEmail}' (Invite: ${inviteCode})`);

    const ownerMember: WorkspaceMember = {
      userId: ownerId,
      email: ownerEmail,
      role: 'OWNER'
    };

    const workspace: WorkspaceItem = {
      id,
      name,
      ownerId,
      members: [ownerMember],
      inviteCode
    };

    this.workspacesStore.set(id, workspace);
    return workspace;
  }

  addMember(workspaceId: string, userId: string, email: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'EDITOR'): WorkspaceItem | null {
    const ws = this.workspacesStore.get(workspaceId);
    if (!ws) {
      return null;
    }

    const existing = ws.members.find(m => m.userId === userId || m.email === email);
    if (existing) {
      existing.role = role;
    } else {
      ws.members.push({ userId, email, role });
    }

    this.workspacesStore.set(workspaceId, ws);
    return ws;
  }

  getWorkspace(workspaceId: string): WorkspaceItem | null {
    return this.workspacesStore.get(workspaceId) || null;
  }

  hasPermission(
    workspaceId: string,
    userId: string,
    action: 'EDIT_SCRIPT' | 'MANAGE_MEMBERS' | 'RENDER_VIDEO' | 'VIEW'
  ): boolean {
    const ws = this.workspacesStore.get(workspaceId);
    if (!ws) {
      return false;
    }

    const member = ws.members.find(m => m.userId === userId);
    if (!member) {
      return false;
    }

    switch (action) {
      case 'MANAGE_MEMBERS':
        return member.role === 'OWNER' || member.role === 'ADMIN';
      case 'EDIT_SCRIPT':
      case 'RENDER_VIDEO':
        return member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'EDITOR';
      case 'VIEW':
        return true;
      default:
        return false;
    }
  }
}
