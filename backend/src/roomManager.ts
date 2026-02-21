// =============================================================================
// roomManager.ts – In-memory room store + lifecycle management for WLT
// =============================================================================

import type { Room } from './gameState.js';
import { generateRoomCode } from './gameLogic.js';

/** In-memory store of all active rooms */
const rooms = new Map<string, Room>();

/** Session ID → socket ID (for reconnect) */
const sessionToSocket = new Map<string, string>();

/** Room inactivity timeout: 10 minutes */
const ROOM_INACTIVITY_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new room with a unique 6-char code.
 */
export function createRoom(hostSocketId: string): Room {
  let code: string;
  // Avoid collision (extremely unlikely but safe)
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room: Room = {
    code,
    hostId: hostSocketId,
    players: new Map(),
    phase: 'lobby',
    round: 0,
    mafiaVotes: [],
    doctorSave: null,
    detectiveTarget: null,
    votes: new Map(),
    timer: null,
    lastActivity: Date.now(),
    nightActionsSubmitted: new Set(),
    started: false,
  };

  rooms.set(code, room);
  return room;
}

/** Get a room by code. Returns undefined if not found. */
export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

/** Delete a room and clear its timer */
export function deleteRoom(code: string): void {
  const room = rooms.get(code);
  if (room?.timer) clearTimeout(room.timer);
  rooms.delete(code);
}

/** Update the last-activity timestamp for a room */
export function touchRoom(code: string): void {
  const room = rooms.get(code);
  if (room) room.lastActivity = Date.now();
}

// ---------------------------------------------------------------------------
// Session / reconnect management
// ---------------------------------------------------------------------------

/** Register a session ID → current socket ID mapping */
export function registerSession(sessionId: string, socketId: string): void {
  sessionToSocket.set(sessionId, socketId);
}

/** Lookup current socket ID for a session */
export function socketForSession(sessionId: string): string | undefined {
  return sessionToSocket.get(sessionId);
}

/** Remove a session mapping */
export function removeSession(sessionId: string): void {
  sessionToSocket.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Start a periodic cleanup interval that removes rooms inactive for >10 minutes.
 * Call once on server startup.
 */
export function startCleanupInterval(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.lastActivity > ROOM_INACTIVITY_MS) {
        console.log(`[Cleanup] Removing inactive room ${code}`);
        deleteRoom(code);
      }
    }
  }, 60_000); // Check every minute
}

/** Get a list of all active room codes (for debugging) */
export function getAllRoomCodes(): string[] {
  return Array.from(rooms.keys());
}
