import { CollabSessionItem, CollabUser } from '../types';

export class CollaborationService {
  private sessionsStore: Map<string, CollabSessionItem> = new Map();

  createRoom(scriptId: string): CollabSessionItem {
    const roomId = `room-${scriptId}`;
    console.log(`[CollaborationService] Creating collaborative room '${roomId}' for script '${scriptId}'`);

    const session: CollabSessionItem = {
      id: `collab-${Date.now()}`,
      roomId,
      scriptId,
      activeUsers: [],
      elementLocks: {}
    };

    this.sessionsStore.set(roomId, session);
    return session;
  }

  joinRoom(roomId: string, user: CollabUser): CollabSessionItem {
    let session = this.sessionsStore.get(roomId);
    if (!session) {
      session = this.createRoom(roomId.replace('room-', ''));
    }

    const existingIndex = session.activeUsers.findIndex(u => u.userId === user.userId);
    if (existingIndex >= 0) {
      session.activeUsers[existingIndex] = { ...user, status: 'ONLINE' };
    } else {
      session.activeUsers.push({ ...user, status: 'ONLINE' });
    }

    this.sessionsStore.set(roomId, session);
    return session;
  }

  leaveRoom(roomId: string, userId: string): CollabSessionItem | null {
    const session = this.sessionsStore.get(roomId);
    if (!session) {
      return null;
    }

    session.activeUsers = session.activeUsers.filter(u => u.userId !== userId);

    // Release any element locks held by user
    for (const [elemId, lockUser] of Object.entries(session.elementLocks)) {
      if (lockUser === userId) {
        delete session.elementLocks[elemId];
      }
    }

    this.sessionsStore.set(roomId, session);
    return session;
  }

  lockElement(roomId: string, elementId: string, userId: string): { locked: boolean; lockedBy: string } {
    const session = this.sessionsStore.get(roomId);
    if (!session) {
      return { locked: false, lockedBy: '' };
    }

    const currentLock = session.elementLocks[elementId];
    if (currentLock && currentLock !== userId) {
      return { locked: false, lockedBy: currentLock };
    }

    session.elementLocks[elementId] = userId;
    this.sessionsStore.set(roomId, session);
    return { locked: true, lockedBy: userId };
  }

  unlockElement(roomId: string, elementId: string, userId: string): boolean {
    const session = this.sessionsStore.get(roomId);
    if (!session || session.elementLocks[elementId] !== userId) {
      return false;
    }

    delete session.elementLocks[elementId];
    this.sessionsStore.set(roomId, session);
    return true;
  }

  getPresence(roomId: string): CollabUser[] {
    const session = this.sessionsStore.get(roomId);
    return session ? session.activeUsers : [];
  }
}
