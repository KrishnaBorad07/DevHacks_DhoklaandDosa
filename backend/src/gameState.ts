// =============================================================================
// gameState.ts – TypeScript interfaces for Who Lies Tonight (WLT)
// =============================================================================

/** Available player roles in WLT */
export type Role = 'mafia' | 'doctor' | 'detective' | 'citizen';

/** Game phases */
export type Phase = 'lobby' | 'night' | 'day' | 'vote' | 'ended';

/** Cutscene type identifiers */
export type CutsceneVariant =
  | 'back_alley'
  | 'rooftop'
  | 'car_ambush'
  | 'neon_club';

/** Night outcome types used for narrator selection */
export type NightOutcome = 'killed' | 'saved' | 'no_kill';

/** Modular avatar definition */
export interface Avatar {
  url: string; // Ready Player Me GLB URL
}

/** Single player state */
export interface Player {
  /** Socket ID (reconnectable) */
  id: string;
  /** Stable session ID stored in localStorage for reconnect */
  sessionId: string;
  /** Display name (sanitized, 3–16 chars) */
  name: string;
  /** Modular avatar configuration */
  avatar: Avatar;
  /** Assigned game role */
  role: Role;
  /** Whether the player is still in the game */
  alive: boolean;
  /** Whether the socket is currently connected */
  connected: boolean;
  /** Timestamp of disconnect (for 30s grace window) */
  disconnectedAt: number | null;
  /** Per-night chat rate limit counter */
  chatCount: number;
  /** Timestamp when chat rate window started */
  chatWindowStart: number;
}

/** Night vote entry: who the mafia member wants to kill */
export interface MafiaVote {
  voterId: string;
  targetId: string;
}

/** Full room state */
export interface Room {
  /** 6-char alphanumeric room code */
  code: string;
  /** Socket ID of the host */
  hostId: string;
  /** All players keyed by socket ID */
  players: Map<string, Player>;
  /** Current game phase */
  phase: Phase;
  /** Current round number (increments each Night) */
  round: number;
  /** Individual mafia member votes (for majority) */
  mafiaVotes: MafiaVote[];
  /** Socket ID of player Doctor chose to protect */
  doctorSave: string | null;
  /** Detective result (private, only sent to detective) */
  detectiveTarget: string | null;
  /** Day-phase lynch votes: voterSocketId → targetSocketId */
  votes: Map<string, string>;
  /** Active phase timer reference */
  timer: ReturnType<typeof setTimeout> | null;
  /** Epoch ms of last activity (for cleanup) */
  lastActivity: number;
  /** Set of player socket IDs who have submitted a night action */
  nightActionsSubmitted: Set<string>;
  /** Whether the game has started */
  started: boolean;
  /** ISO timestamp of when the game started (for Supabase insert at end) */
  gameStartedAt?: string;
}

/** Payload sent to clients when a room is updated */
export interface RoomUpdatePayload {
  code: string;
  phase: Phase;
  round: number;
  players: PublicPlayer[];
  started: boolean;
}

/** Public (role-hidden) player info for broadcasts */
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: Avatar;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
}

/** Game-start payload sent privately to each player */
export interface GameStartPayload {
  role: Role;
  mafiaTeam: string[]; // only populated for mafia players
  players: PublicPlayer[];
  phase: Phase;
}

/** Chat message payload */
export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  channel: 'global' | 'mafia';
  timestamp: number;
}

/** Narrator event payload */
export interface NarratePayload {
  text: string;
  outcome: NightOutcome;
}

/** Cutscene trigger payload */
export interface CutscenePayload {
  variant: CutsceneVariant;
  victimId: string | null;
  victimName: string | null;
  victimAvatar: Avatar | null;
  saved: boolean;
}

/** Vote update payload */
export interface VoteUpdatePayload {
  votes: Record<string, string>; // voterSocketId → targetSocketId
  tally: Record<string, number>; // targetSocketId → count
}

/** Game-end payload */
export interface GameEndPayload {
  winner: 'mafia' | 'town';
  roles: Array<{ id: string; name: string; role: Role }>;
}
