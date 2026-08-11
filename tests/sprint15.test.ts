import { CollaborationService } from '../src/services/CollaborationService';

describe('Sprint 15 Backend Test Suite — Collaborative Storyboarding & Multiplayer (BE-105 to BE-110)', () => {
  let collabService: CollaborationService;

  beforeEach(() => {
    collabService = new CollaborationService();
  });

  test('BE-105 & BE-106: Create room and track active user presence', () => {
    const room = collabService.createRoom('script-1501');
    expect(room.roomId).toBe('room-script-1501');

    const updated = collabService.joinRoom(room.roomId, {
      userId: 'user-01',
      userName: 'Alice',
      role: 'EDITOR',
      status: 'ONLINE'
    });

    expect(updated.activeUsers.length).toBe(1);
    expect(updated.activeUsers[0].userName).toBe('Alice');

    const presence = collabService.getPresence(room.roomId);
    expect(presence.length).toBe(1);
  });

  test('BE-107 & BE-108: Lock scene element and reject concurrent lock attempts by another user', () => {
    const roomId = 'room-script-1502';
    collabService.joinRoom(roomId, { userId: 'user-01', userName: 'Alice', role: 'EDITOR', status: 'ONLINE' });
    collabService.joinRoom(roomId, { userId: 'user-02', userName: 'Bob', role: 'EDITOR', status: 'ONLINE' });

    const lock1 = collabService.lockElement(roomId, 'scene-beat-1', 'user-01');
    expect(lock1.locked).toBe(true);
    expect(lock1.lockedBy).toBe('user-01');

    const lock2 = collabService.lockElement(roomId, 'scene-beat-1', 'user-02');
    expect(lock2.locked).toBe(false);
    expect(lock2.lockedBy).toBe('user-01');
  });

  test('BE-109: Automatically release user element locks when user leaves room', () => {
    const roomId = 'room-script-1503';
    collabService.joinRoom(roomId, { userId: 'user-01', userName: 'Alice', role: 'EDITOR', status: 'ONLINE' });
    collabService.lockElement(roomId, 'scene-beat-99', 'user-01');

    collabService.leaveRoom(roomId, 'user-01');

    const lock2 = collabService.lockElement(roomId, 'scene-beat-99', 'user-02');
    expect(lock2.locked).toBe(true);
    expect(lock2.lockedBy).toBe('user-02');
  });

  test('BE-110: Explicitly unlock element by lock owner', () => {
    const roomId = 'room-script-1504';
    collabService.createRoom('script-1504');
    collabService.lockElement(roomId, 'elem-1', 'user-01');

    const unlocked = collabService.unlockElement(roomId, 'elem-1', 'user-01');
    expect(unlocked).toBe(true);
  });
});
