// =============================================================================
// types/game.ts – Shared TypeScript interfaces (mirrors backend gameState.ts)
// =============================================================================

export type Role = 'mafia' | 'doctor' | 'detective' | 'citizen';
export type Phase = 'lobby' | 'night' | 'day' | 'vote' | 'ended';
export type CutsceneVariant = 'back_alley' | 'rooftop' | 'car_ambush' | 'neon_club';
export type NightOutcome = 'killed' | 'saved' | 'no_kill';
export type ChatChannel = 'global' | 'mafia';

export interface Avatar {
  url: string; // Ready Player Me GLB URL: https://models.readyplayer.me/{id}.glb
               // Empty string = no avatar created yet (shows initials fallback)
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: Avatar;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  channel: ChatChannel;
  timestamp: number;
}

export interface NarratePayload {
  text: string;
  outcome: NightOutcome;
}

export interface CutscenePayload {
  variant: CutsceneVariant;
  victimId: string | null;
  victimName: string | null;
  victimAvatar: Avatar | null;
  saved: boolean;
}

export interface VoteUpdatePayload {
  votes: Record<string, string>;
  tally: Record<string, number>;
}

export interface GameEndPayload {
  winner: 'mafia' | 'town';
  roles: Array<{ id: string; name: string; role: Role }>;
}

export interface GameStartPayload {
  role: Role;
  mafiaTeam: Array<{ id: string; name: string; avatar: Avatar }>;
  players: PublicPlayer[];
  phase: Phase;
}

export interface DetectiveResult {
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

/** Full local game state managed by the useGameState hook */
export interface GameState {
  roomCode: string | null;
  myId: string | null;
  mySessionId: string | null;
  myRole: Role | null;
  myMafiaTeam: Array<{ id: string; name: string; avatar: Avatar }>;
  players: PublicPlayer[];
  phase: Phase;
  round: number;
  timer: number; // ms remaining
  votes: Record<string, string>;
  voteTally: Record<string, number>;
  messages: ChatMessage[];
  narratorText: string | null;
  narratorOutcome: NightOutcome | null;
  cutscene: CutscenePayload | null;
  gameEnd: GameEndPayload | null;
  detectiveResults: DetectiveResult[];
  error: string | null;
  started: boolean;
  nightActionSubmitted: boolean;
}
