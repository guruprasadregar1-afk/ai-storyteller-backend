import { WorkspaceService } from '../src/services/WorkspaceService';

describe('Sprint 17 Backend Test Suite — Multi-User Workspace & Access Control (BE-117 to BE-122)', () => {
  let workspaceService: WorkspaceService;

  beforeEach(() => {
    workspaceService = new WorkspaceService();
  });

  test('BE-117 & BE-122: Create workspace with owner role and unique invite code', () => {
    const ws = workspaceService.createWorkspace('Pixar AI Team', 'usr-owner-1', 'admin@pixar.com');

    expect(ws.id).toBeDefined();
    expect(ws.members[0].role).toBe('OWNER');
    expect(ws.inviteCode).toMatch(/^INV-/);
  });

  test('BE-118: Add team member with assigned role', () => {
    const ws = workspaceService.createWorkspace('VFX Studio', 'usr-owner-1', 'owner@vfx.com');
    const updated = workspaceService.addMember(ws.id!, 'usr-editor-2', 'editor@vfx.com', 'EDITOR');

    expect(updated?.members.length).toBe(2);
    expect(updated?.members[1].role).toBe('EDITOR');
  });

  test('BE-119, BE-120 & BE-121: Enforce RBAC permission rules across roles', () => {
    const ws = workspaceService.createWorkspace('Gaming Team', 'u-owner', 'owner@game.com');
    workspaceService.addMember(ws.id!, 'u-admin', 'admin@game.com', 'ADMIN');
    workspaceService.addMember(ws.id!, 'u-editor', 'editor@game.com', 'EDITOR');
    workspaceService.addMember(ws.id!, 'u-viewer', 'viewer@game.com', 'VIEWER');

    // Manage members permission
    expect(workspaceService.hasPermission(ws.id!, 'u-owner', 'MANAGE_MEMBERS')).toBe(true);
    expect(workspaceService.hasPermission(ws.id!, 'u-admin', 'MANAGE_MEMBERS')).toBe(true);
    expect(workspaceService.hasPermission(ws.id!, 'u-editor', 'MANAGE_MEMBERS')).toBe(false);
    expect(workspaceService.hasPermission(ws.id!, 'u-viewer', 'MANAGE_MEMBERS')).toBe(false);

    // Edit script permission
    expect(workspaceService.hasPermission(ws.id!, 'u-editor', 'EDIT_SCRIPT')).toBe(true);
    expect(workspaceService.hasPermission(ws.id!, 'u-viewer', 'EDIT_SCRIPT')).toBe(false);

    // View permission
    expect(workspaceService.hasPermission(ws.id!, 'u-viewer', 'VIEW')).toBe(true);
  });
});
