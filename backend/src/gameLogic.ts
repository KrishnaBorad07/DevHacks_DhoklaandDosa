// =============================================================================
// gameLogic.ts – Core game logic for Who Lies Tonight (WLT)
// Handles role assignment, night resolution, day voting, win conditions.
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { Room, Player, Role, Avatar, CutsceneVariant } from './gameState.js';

/** Minimum players required to start (host-configurable, min 4) */
export const MIN_PLAYERS = 4;
/** Maximum players allowed in a room */
export const MAX_PLAYERS = 12;
/** Night phase duration in milliseconds */
export const NIGHT_DURATION_MS = 60_000;
/** Day discussion phase duration in milliseconds */
export const DAY_DISCUSS_MS = 90_000;
/** Day voting phase duration in milliseconds */
export const VOTE_DURATION_MS = 30_000;

// ---------------------------------------------------------------------------
// Role assignment
// ---------------------------------------------------------------------------

/**
 * Assign roles to all players in the room.
 * Mafia = ~33% (min 1), Doctor = always 1, Detective = only if >4 players,
 * remainder = citizens.
 *
 * @param players - Array of player socket IDs to assign roles to
 * @returns Map of socketId → Role
 */
export function assignRoles(playerIds: string[]): Map<string, Role> {
  const n = playerIds.length;
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const roleMap = new Map<string, Role>();

  // Calculate mafia count: 33% rounded down, min 1
  const mafiaCount = Math.max(1, Math.floor(n * 0.33));
  // Detective only when player count > 4
  const hasDetective = n > 4;
  // Doctor always present
  const hasDoctor = true;

  let idx = 0;

  // Assign mafia
  for (let i = 0; i < mafiaCount; i++) {
    roleMap.set(shuffled[idx++], 'mafia');
  }

  // Assign doctor
  if (hasDoctor && idx < n) {
    roleMap.set(shuffled[idx++], 'doctor');
  }

  // Assign detective (only if >4 players)
  if (hasDetective && idx < n) {
    roleMap.set(shuffled[idx++], 'detective');
  }

  // Remaining players are citizens
  while (idx < n) {
    roleMap.set(shuffled[idx++], 'citizen');
  }

  return roleMap;
}

// ---------------------------------------------------------------------------
// Night resolution
// ---------------------------------------------------------------------------

/** Result of resolving a night phase */
export interface NightResolutionResult {
  /** Player who was killed (null if no kill or saved) */
  killedPlayerId: string | null;
  /** Whether the kill was prevented by doctor */
  saved: boolean;
  /** Outcome category for narrator selection */
  outcome: 'killed' | 'saved' | 'no_kill';
  /** Cutscene variant to play (null if no cutscene needed) */
  cutsceneVariant: CutsceneVariant | null;
}

/** Pick a random cutscene variant */
function randomCutscene(): CutsceneVariant {
  const variants: CutsceneVariant[] = [
    'back_alley',
    'rooftop',
    'car_ambush',
    'neon_club',
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Resolve all night actions and return what happened.
 * Mafia vote is tallied; majority target (or random tiebreak) is the kill target.
 */
export function resolveNight(room: Room): NightResolutionResult {
  const { mafiaVotes, doctorSave, players } = room;

  // ── Tally mafia votes ──────────────────────────────────────────────────────
  const tally: Record<string, number> = {};
  for (const { targetId } of mafiaVotes) {
    tally[targetId] = (tally[targetId] ?? 0) + 1;
  }

  // Find target with most votes (or random among tied)
  let mafiaTarget: string | null = null;
  if (Object.keys(tally).length > 0) {
    const maxVotes = Math.max(...Object.values(tally));
    const candidates = Object.keys(tally).filter((k) => tally[k] === maxVotes);
    mafiaTarget = candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ── Resolve against doctor save ────────────────────────────────────────────
  if (!mafiaTarget) {
    return { killedPlayerId: null, saved: false, outcome: 'no_kill', cutsceneVariant: null };
  }

  if (mafiaTarget === doctorSave) {
    // Saved!
    return {
      killedPlayerId: mafiaTarget,
      saved: true,
      outcome: 'saved',
      cutsceneVariant: randomCutscene(),
    };
  }

  // Kill successful
  const target = players.get(mafiaTarget);
  if (!target || !target.alive) {
    // Target already dead (edge case) – no kill
    return { killedPlayerId: null, saved: false, outcome: 'no_kill', cutsceneVariant: null };
  }

  return {
    killedPlayerId: mafiaTarget,
    saved: false,
    outcome: 'killed',
    cutsceneVariant: randomCutscene(),
  };
}

// ---------------------------------------------------------------------------
// Day vote / lynch
// ---------------------------------------------------------------------------

/** Result of resolving a day vote */
export interface LynchResult {
  /** Player socket ID who was lynched, or null if no majority */
  lynchedPlayerId: string | null;
}

/**
 * Resolve day votes. A player is lynched if they have a strict majority of votes
 * among all alive voters. On tie → no elimination.
 */
export function resolveDayVote(room: Room): LynchResult {
  const tally: Record<string, number> = {};
  for (const [, targetId] of room.votes) {
    tally[targetId] = (tally[targetId] ?? 0) + 1;
  }

  let topCandidate: string | null = null;
  let topCount = 0;
  let isTied = false;

  for (const [playerId, count] of Object.entries(tally)) {
    if (count > topCount) {
      topCount = count;
      topCandidate = playerId;
      isTied = false;
    } else if (count === topCount) {
      isTied = true;
    }
  }

  // Plurality logic:
  // 1. Must have at least one vote cast
  // 2. Must not be a tie for the top spot
  if (!topCandidate || isTied || topCount === 0) {
    return { lynchedPlayerId: null };
  }

  return { lynchedPlayerId: topCandidate };
}

// ---------------------------------------------------------------------------
// Win condition
// ---------------------------------------------------------------------------

/** Possible game winners */
export type WinResult = 'mafia' | 'town' | null;

/**
 * Check if there is a winner after an elimination.
 * - Mafia wins when alive mafia ≥ alive town
 * - Town wins when all mafia are dead
 * Returns null if the game continues.
 */
export function checkWinCondition(room: Room): WinResult {
  const alive = getAlivePlayers(room);
  const aliveMafia = alive.filter((p) => p.role === 'mafia');
  const aliveTown = alive.filter((p) => p.role !== 'mafia');

  if (aliveMafia.length === 0) return 'town';
  if (aliveMafia.length >= aliveTown.length) return 'mafia';
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get list of alive players */
export function getAlivePlayers(room: Room): Player[] {
  return Array.from(room.players.values()).filter((p) => p.alive);
}

/** Get alive mafia players */
export function getAliveMafia(room: Room): Player[] {
  return getAlivePlayers(room).filter((p) => p.role === 'mafia');
}

/** Generate a cryptographically-adequate 6-char alphanumeric room code */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Unambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Sanitize a username: strip HTML chars, trim, enforce 3–16 chars */
export function sanitizeUsername(raw: string): string | null {
  const cleaned = raw
    .replace(/[<>&"'/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 3 || cleaned.length > 16) return null;
  return cleaned;
}

/** Create a blank player object */
export function createPlayer(socketId: string, name: string, avatar: Avatar): Player {
  return {
    id: socketId,
    sessionId: uuidv4(),
    name,
    avatar,
    role: 'citizen', // placeholder until game starts
    alive: true,
    connected: true,
    disconnectedAt: null,
    chatCount: 0,
    chatWindowStart: Date.now(),
  };
}
