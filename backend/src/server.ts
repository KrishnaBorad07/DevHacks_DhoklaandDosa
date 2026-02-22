// =============================================================================
// server.ts – Who Lies Tonight (WLT) – Express + Socket.io v4.8 Server
// Handles all game logic, room management, and real-time communication.
// Port: 3001 (configure via PORT env var)
//
// FIX: socketToRoom Map tracks which room each socket is in so the disconnect
// handler can reliably find it (Socket.io removes the socket from adapter.rooms
// BEFORE the 'disconnect' event fires, so adapter iteration is unreliable).
// =============================================================================

import 'dotenv/config'; // ← load .env before anything else
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import os from 'os';
import {
  createRoom,
  getRoom,
  deleteRoom,
  touchRoom,
  registerSession,
  socketForSession,
  removeSession,
  startCleanupInterval,
} from './roomManager.js';
import {
  assignRoles,
  resolveNight,
  resolveDayVote,
  checkWinCondition,
  getAlivePlayers,
  getAliveMafia,
  sanitizeUsername,
  createPlayer,
  MIN_PLAYERS,
  MAX_PLAYERS,
  NIGHT_DURATION_MS,
  DAY_DISCUSS_MS,
  VOTE_DURATION_MS,
} from './gameLogic.js';
import { getNarratorText } from './narrator.js';
import { supabase } from './supabase.js';
import type {
  Avatar,
  PublicPlayer,
  ChatMessage,
  NarratePayload,
  CutscenePayload,
  VoteUpdatePayload,
  GameEndPayload,
} from './gameState.js';

// ---------------------------------------------------------------------------
// Express + HTTP + Socket.io setup
// ---------------------------------------------------------------------------

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production: restrict to your Vercel domain
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

app.use(cors());
app.use(express.json());

// ── Socket-to-room mapping ────────────────────────────────────────────────────
// Tracks which WLT room code each socket ID is currently in.
// Updated on join/create and cleared on leave/disconnect.
const socketToRoom = new Map<string, string>();

// ── WebRTC audio channel membership ─────────────────────────────────────────
// Per room-code: which socket IDs are in each audio channel.
const rtcChannels = new Map<string, { general: Set<string>; mafia: Set<string> }>();

function ensureRtcRoom(code: string) {
  if (!rtcChannels.has(code)) rtcChannels.set(code, { general: new Set(), mafia: new Set() });
  return rtcChannels.get(code)!;
}

function rtcRemoveSocket(socketId: string, code: string) {
  const ch = rtcChannels.get(code);
  if (!ch) return;
  ch.general.delete(socketId);
  ch.mafia.delete(socketId);
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Leaderboard endpoint – filtered by room code if ?room= param provided
app.get('/leaderboard', async (req, res) => {
  const roomCode = req.query.room as string | undefined;

  let query = supabase
    .from('player_scores')
    .select('player_name, total_score, games_won, games_played')
    .order('total_score', { ascending: false })
    .limit(10);

  if (roomCode) {
    query = query.eq('last_room_code', roomCode.toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Leaderboard] Supabase error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json(data ?? []);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

/** Helper: get all local IPv4 addresses (for LAN cross-device play) */
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const addrs of Object.values(interfaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Convert a room's players Map to a public players array (role hidden) */
function toPublicPlayers(room: ReturnType<typeof getRoom>, hostId: string): PublicPlayer[] {
  if (!room) return [];
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    alive: p.alive,
    connected: p.connected,
    isHost: p.id === hostId,
  }));
}

/** Emit room state to all players in a room */
function broadcastRoomUpdate(code: string): void {
  const room = getRoom(code);
  if (!room) return;
  io.to(code).emit('room_updated', {
    code: room.code,
    phase: room.phase,
    round: room.round,
    players: toPublicPlayers(room, room.hostId),
    started: room.started,
  });
}

/** Broadcast vote tally to all players in a room */
function broadcastVoteTally(code: string): void {
  const room = getRoom(code);
  if (!room) return;

  const votes: Record<string, string> = {};
  const tally: Record<string, number> = {};

  for (const [voterId, targetId] of room.votes) {
    votes[voterId] = targetId;
    tally[targetId] = (tally[targetId] ?? 0) + 1;
  }

  const payload: VoteUpdatePayload = { votes, tally };
  io.to(code).emit('vote_updated', payload);
}

/** Send a system chat message to a room */
function systemMessage(code: string, text: string): void {
  const msg: ChatMessage = {
    senderId: 'system',
    senderName: 'System',
    text,
    channel: 'global',
    timestamp: Date.now(),
  };
  io.to(code).emit('chat', msg);
}

// ---------------------------------------------------------------------------
// Phase state machine
// ---------------------------------------------------------------------------

/** Start the night phase for a room */
function startNightPhase(code: string): void {
  const room = getRoom(code);
  if (!room) return;

  // Clear previous night state
  room.phase = 'night';
  room.round += 1;
  room.mafiaVotes = [];
  room.doctorSave = null;
  room.detectiveTarget = null;
  room.nightActionsSubmitted = new Set();

  touchRoom(code);

  io.to(code).emit('phase_changed', {
    phase: 'night',
    round: room.round,
    timer: NIGHT_DURATION_MS,
  });

  systemMessage(code, `Night ${room.round} begins. The city goes dark...`);

  // Auto-advance after NIGHT_DURATION_MS
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => resolveNightPhase(code), NIGHT_DURATION_MS);
}

/** Resolve night phase – compute kills/saves, emit narrate + cutscene, start day */
function resolveNightPhase(code: string): void {
  const room = getRoom(code);
  if (!room || room.phase !== 'night') return;

  const result = resolveNight(room);

  // Apply kill if not saved
  let killedPlayer = null;
  if (result.killedPlayerId && !result.saved) {
    const target = room.players.get(result.killedPlayerId);
    if (target) {
      target.alive = false;
      killedPlayer = target;
      io.to(code).emit('player_eliminated', {
        playerId: target.id,
        playerName: target.name,
        cause: 'night_kill',
      });
    }
  }

  // Emit cutscene to all players (if kill or save happened)
  if (result.cutsceneVariant) {
    const victim = result.killedPlayerId ? room.players.get(result.killedPlayerId) : null;
    const cutscenePayload: CutscenePayload = {
      variant: result.cutsceneVariant,
      victimId: victim?.id ?? null,
      victimName: victim?.name ?? null,
      victimAvatar: victim?.avatar ?? null,
      saved: result.saved,
    };
    io.to(code).emit('cutscene', cutscenePayload);
  }

  // Emit narrator text
  const narrateText = getNarratorText(
    result.outcome,
    killedPlayer?.name ?? (result.killedPlayerId ? room.players.get(result.killedPlayerId)?.name ?? null : null)
  );
  const narratePayload: NarratePayload = {
    text: narrateText,
    outcome: result.outcome,
  };
  io.to(code).emit('narrate', narratePayload);

  // Check win after night
  const winResult = checkWinCondition(room);
  if (winResult) {
    endGame(code, winResult);
    return;
  }

  // Start day discussion phase after a short delay (let cutscene play)
  const cutsceneDelay = result.cutsceneVariant ? 12_000 : 2_000;
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => startDayPhase(code), cutsceneDelay);
}

/** Start the day discussion phase */
function startDayPhase(code: string): void {
  const room = getRoom(code);
  if (!room) return;

  room.phase = 'day';
  room.votes = new Map();
  touchRoom(code);

  io.to(code).emit('phase_changed', {
    phase: 'day',
    round: room.round,
    timer: DAY_DISCUSS_MS,
  });

  systemMessage(code, 'Dawn breaks. Discuss and find the traitors among you.');

  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => startVotePhase(code), DAY_DISCUSS_MS);
}

/** Start the voting sub-phase */
function startVotePhase(code: string): void {
  const room = getRoom(code);
  if (!room) return;

  room.phase = 'vote';
  touchRoom(code);

  io.to(code).emit('phase_changed', {
    phase: 'vote',
    round: room.round,
    timer: VOTE_DURATION_MS,
  });

  systemMessage(code, 'Vote now! The player with the most votes will be eliminated.');
  broadcastVoteTally(code);

  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => resolveVotePhase(code), VOTE_DURATION_MS);
}

/** Resolve day vote – lynch player if majority, then check win or start next night */
function resolveVotePhase(code: string): void {
  const room = getRoom(code);
  if (!room || room.phase !== 'vote') return;

  const result = resolveDayVote(room);

  if (result.lynchedPlayerId) {
    const lynched = room.players.get(result.lynchedPlayerId);
    if (lynched) {
      lynched.alive = false;
      io.to(code).emit('player_eliminated', {
        playerId: lynched.id,
        playerName: lynched.name,
        cause: 'lynch',
      });
      systemMessage(code, `${lynched.name} has been eliminated by vote.`);
    }
  } else {
    systemMessage(code, 'No majority reached. No one is eliminated today.');
  }

  broadcastRoomUpdate(code);

  // Check win after lynch
  const winResult = checkWinCondition(room);
  if (winResult) {
    endGame(code, winResult);
    return;
  }

  // Continue to next night
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => startNightPhase(code), 3_000);
}


/** End the game and broadcast roles */
function endGame(code: string, winner: 'mafia' | 'town'): void {
  const room = getRoom(code);
  if (!room) return;

  room.phase = 'ended';
  if (room.timer) clearTimeout(room.timer);

  const payload: GameEndPayload = {
    winner,
    roles: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
    })),
  };

  io.to(code).emit('game_ended', payload);
  systemMessage(
    code,
    winner === 'mafia'
      ? 'The syndicate wins! The city falls to the mob.'
      : 'The townspeople win! Justice prevails... for now.'
  );
  touchRoom(code);

  console.log(`[endGame] Triggered for room=${code} winner=${winner}`);
  console.log(`[endGame] Players in room: ${room.players.size}`);

  // ── Persist result to Supabase ──────────────────────────────────────────────
  const endedAt = new Date().toISOString();
  supabase
    .from('game_sessions')
    .insert({
      room_code: code,
      winner,
      total_rounds: room.round,
      total_players: room.players.size,
      started_at: room.gameStartedAt ?? endedAt,
      ended_at: endedAt,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[Supabase] CRITICAL: insert game_sessions failed:', error.message);
      } else {
        console.log(`[Supabase] SUCCESS: game_sessions saved ✓`);
      }
    });

  // ── Upsert player scores ───────────────────────────────────────────────────
  // NOTE: We look up by session_id (a stable UUID per browser/device), NOT by
  // player_name. This ensures two different people named "Deep" in separate
  // rooms each get their own row, while a player who plays again in the same
  // room (same sessionId persisted in localStorage) correctly accumulates stats.
  for (const player of room.players.values()) {
    const isWinnerSide =
      (winner === 'mafia' && player.role === 'mafia') ||
      (winner === 'town' && player.role !== 'mafia');
    const scoreGain = isWinnerSide ? (winner === 'mafia' ? 10 : 5) : 0;

    console.log(`[endGame] Processing score for ${player.name} (session=${player.sessionId}): role=${player.role} win=${isWinnerSide} gain=${scoreGain}`);

    supabase
      .from('player_scores')
      .select('session_id, player_name, total_score, games_won, games_played')
      .eq('session_id', player.sessionId)
      .maybeSingle()
      .then(async ({ data: existing, error: selectErr }) => {
        if (selectErr) {
          console.error(`[Supabase] player_scores select for session ${player.sessionId}:`, selectErr.message);
          return;
        }

        console.log(`[Supabase] Player check: ${player.name} (session=${player.sessionId}) exists=${!!existing}`);

        if (existing) {
          // Update existing record — also refresh displayed name in case it changed
          const { error: updateErr } = await supabase
            .from('player_scores')
            .update({
              player_name: player.name, // keep name up-to-date
              total_score: (existing.total_score || 0) + scoreGain,
              games_won: (existing.games_won || 0) + (isWinnerSide ? 1 : 0),
              games_played: (existing.games_played || 0) + 1,
              last_room_code: code,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', player.sessionId);

          if (updateErr) {
            console.error(`[Supabase] player_scores update for ${player.name}:`, updateErr.message);
          } else {
            console.log(`[Supabase] leaderboard updated ✓ ${player.name} (session=${player.sessionId}) +${scoreGain}pts`);
          }
        } else {
          // First time this session plays — create a new row
          const { error: insertErr } = await supabase
            .from('player_scores')
            .insert({
              session_id: player.sessionId,
              player_name: player.name,
              total_score: scoreGain,
              games_won: isWinnerSide ? 1 : 0,
              games_played: 1,
              last_room_code: code,
              updated_at: new Date().toISOString(),
            });

          if (insertErr) {
            console.error(`[Supabase] player_scores insert for ${player.name}:`, insertErr.message);
          } else {
            console.log(`[Supabase] leaderboard created ✓ ${player.name} (session=${player.sessionId}) ${scoreGain}pts`);
          }
        }
      });
  }
}

// ---------------------------------------------------------------------------
// Socket.io event handlers
// ---------------------------------------------------------------------------

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── CREATE ROOM ────────────────────────────────────────────────────────────
  socket.on(
    'create_room',
    (data: { username: string; avatar: Avatar }, callback?: Function) => {
      const name = sanitizeUsername(data.username);
      if (!name) {
        socket.emit('error', { message: 'Invalid username (3–16 chars).' });
        return;
      }

      const room = createRoom(socket.id);
      const player = createPlayer(socket.id, name, data.avatar);
      room.players.set(socket.id, player);

      socket.join(room.code);
      socketToRoom.set(socket.id, room.code); // ← Track socket→room
      registerSession(player.sessionId, socket.id);

      socket.emit('room_created', {
        code: room.code,
        playerId: socket.id,
        sessionId: player.sessionId,
      });

      broadcastRoomUpdate(room.code);
      console.log(`[Room] Created: ${room.code} by ${name}`);

      if (callback) callback({ code: room.code });
    }
  );

  // ── JOIN ROOM ──────────────────────────────────────────────────────────────
  socket.on(
    'join_room',
    (data: { code: string; username: string; avatar: Avatar }, callback?: Function) => {
      const roomCode = data.code.toUpperCase().trim();
      const room = getRoom(roomCode);

      if (!room) {
        socket.emit('error', { message: `Room "${roomCode}" not found. Check the code and try again.` });
        return;
      }
      if (room.started) {
        socket.emit('error', { message: 'Game already in progress.' });
        return;
      }
      if (room.players.size >= MAX_PLAYERS) {
        socket.emit('error', { message: 'Room is full (max 12 players).' });
        return;
      }

      const name = sanitizeUsername(data.username);
      if (!name) {
        socket.emit('error', { message: 'Invalid username (3–16 chars).' });
        return;
      }

      // Check name uniqueness in room
      const nameTaken = Array.from(room.players.values()).some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (nameTaken) {
        socket.emit('error', { message: 'Username already taken in this room.' });
        return;
      }

      const player = createPlayer(socket.id, name, data.avatar);
      room.players.set(socket.id, player);
      socket.join(roomCode);
      socketToRoom.set(socket.id, roomCode); // ← Track socket→room
      registerSession(player.sessionId, socket.id);
      touchRoom(roomCode);

      socket.emit('room_joined', {
        code: roomCode,
        playerId: socket.id,
        sessionId: player.sessionId,
      });

      broadcastRoomUpdate(roomCode);
      systemMessage(roomCode, `${name} joined the room.`);
      console.log(`[Room] ${name} joined ${roomCode}`);

      if (callback) callback({ success: true });
    }
  );

  // ── START GAME ─────────────────────────────────────────────────────────────
  socket.on('start_game', (data: { code: string }) => {
    const room = getRoom(data.code);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only the host can start.' });
    if (room.started) return socket.emit('error', { message: 'Game already started.' });
    if (room.players.size < MIN_PLAYERS) {
      return socket.emit('error', { message: `Need at least ${MIN_PLAYERS} players to start.` });
    }

    room.started = true;

    // Assign roles
    const playerIds = Array.from(room.players.keys());
    const roleMap = assignRoles(playerIds);
    for (const [id, role] of roleMap) {
      const p = room.players.get(id);
      if (p) p.role = role;
    }

    // Collect mafia team for cross-team visibility
    const mafiaPlayers = Array.from(room.players.values()).filter((p) => p.role === 'mafia');
    const mafiaTeamIds = mafiaPlayers.map((p) => p.id);
    const mafiaTeamNames = mafiaPlayers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }));

    // Send personalized game-start event to each player
    for (const player of room.players.values()) {
      const targetSocket = io.sockets.sockets.get(player.id);
      if (!targetSocket) continue;

      targetSocket.emit('game_started', {
        role: player.role,
        // Mafia players learn their teammates; others get empty array
        mafiaTeam: player.role === 'mafia' ? mafiaTeamNames : [],
        players: toPublicPlayers(room, room.hostId),
        phase: 'night',
      });
    }

    // Record game start time (used for Supabase insert when game ends)
    room.gameStartedAt = new Date().toISOString();

    touchRoom(data.code);
    console.log(`[Game] Started in room ${data.code} with ${playerIds.length} players`);

    // Begin first night after 3s countdown
    setTimeout(() => startNightPhase(data.code), 3_000);
  });

  // ── NIGHT ACTION ───────────────────────────────────────────────────────────
  socket.on(
    'night_action',
    (data: { code: string; action: 'kill' | 'save' | 'investigate'; targetId: string }) => {
      const room = getRoom(data.code);
      if (!room) return socket.emit('error', { message: 'Room not found.' });
      if (room.phase !== 'night') return socket.emit('error', { message: 'Not night phase.' });

      const player = room.players.get(socket.id);
      if (!player || !player.alive) return socket.emit('error', { message: 'You are not alive.' });
      if (room.nightActionsSubmitted.has(socket.id)) {
        return socket.emit('error', { message: 'You already submitted a night action.' });
      }

      const target = room.players.get(data.targetId);
      if (!target || !target.alive) return socket.emit('error', { message: 'Invalid target.' });

      switch (data.action) {
        case 'kill': {
          if (player.role !== 'mafia') return socket.emit('error', { message: 'Only mafia can kill.' });
          if (data.targetId === socket.id) return socket.emit('error', { message: 'Cannot target yourself.' });
          // Store the mafia vote — only the first valid kill vote counts
          if (room.mafiaVotes.length === 0) {
            room.mafiaVotes.push({ voterId: socket.id, targetId: data.targetId });
          }
          break; // Fall through to register "submitted" and check if ALL roles are done
        }
        case 'save': {
          if (player.role !== 'doctor') return socket.emit('error', { message: 'Only doctor can save.' });
          room.doctorSave = data.targetId;
          break;
        }
        case 'investigate': {
          if (player.role !== 'detective') return socket.emit('error', { message: 'Only detective can investigate.' });
          const isMafia = target.role === 'mafia';
          room.detectiveTarget = data.targetId;
          // Private result only to detective
          socket.emit('detective_result', {
            targetId: data.targetId,
            targetName: target.name,
            isMafia,
          });
          break;
        }
        default:
          return socket.emit('error', { message: 'Unknown action.' });
      }

      room.nightActionsSubmitted.add(socket.id);
      touchRoom(data.code);

      // Check if all required night actions are submitted → auto-advance
      checkNightActionsComplete(data.code);
    }
  );

  // ── DAY VOTE ───────────────────────────────────────────────────────────────
  socket.on('day_vote', (data: { code: string; targetId: string }) => {
    const room = getRoom(data.code);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.phase !== 'vote') return socket.emit('error', { message: 'Not voting phase.' });

    const voter = room.players.get(socket.id);
    if (!voter || !voter.alive) return socket.emit('error', { message: 'You cannot vote.' });

    const target = room.players.get(data.targetId);
    if (!target || !target.alive) return socket.emit('error', { message: 'Invalid vote target.' });
    if (data.targetId === socket.id) return socket.emit('error', { message: 'Cannot vote for yourself.' });

    room.votes.set(socket.id, data.targetId);
    touchRoom(data.code);
    broadcastVoteTally(data.code);

    // Check if all alive players voted → early resolve
    const alive = getAlivePlayers(room);
    if (room.votes.size >= alive.length) {
      if (room.timer) clearTimeout(room.timer);
      resolveVotePhase(data.code);
    }
  });

  // ── SKIP DISCUSSION (host only) ───────────────────────────────────────────
  socket.on('skip_discussion', (data: { code: string }) => {
    const room = getRoom(data.code);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only the host can skip discussion.' });
    if (room.phase !== 'day') return socket.emit('error', { message: 'Can only skip during discussion phase.' });

    // Clear the day-discussion timer and jump straight to vote
    if (room.timer) clearTimeout(room.timer);
    systemMessage(data.code, 'Host skipped discussion — voting begins now!');
    startVotePhase(data.code);
  });

  // ── PLAY AGAIN (host only) ────────────────────────────────────────────────
  socket.on('play_again', (data: { code: string }) => {
    const room = getRoom(data.code);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only the host can restart.' });
    if (room.phase !== 'ended') return socket.emit('error', { message: 'Game is still in progress.' });

    // Reset room state to lobby
    room.phase = 'lobby';
    room.round = 0;
    room.started = false;
    room.mafiaVotes = [];
    room.doctorSave = null;
    room.detectiveTarget = null;
    room.votes = new Map();
    room.nightActionsSubmitted = new Set();
    room.gameStartedAt = undefined;
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;

    // Reset all players
    for (const player of room.players.values()) {
      player.alive = true;
      player.role = 'citizen'; // Reset role — will be reassigned on next start
      player.connected = true;
      player.disconnectedAt = null;
      player.chatCount = 0;
      player.chatWindowStart = Date.now();
    }

    touchRoom(data.code);

    // Notify all clients
    io.to(data.code).emit('room_reset', {
      code: data.code,
      players: toPublicPlayers(room, room.hostId),
    });

    broadcastRoomUpdate(data.code);
    systemMessage(data.code, 'The host started a new round! Waiting for players...');
    console.log(`[Room] Play again in ${data.code} — back to lobby`);
  });

  // ── CHAT ───────────────────────────────────────────────────────────────────
  socket.on(
    'chat_message',
    (data: { code: string; text: string; channel: 'global' | 'mafia' }) => {
      const room = getRoom(data.code);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // Spectators cannot chat in global, dead players can't speak
      if (!player.alive && data.channel === 'global') {
        return socket.emit('error', { message: 'Spectators cannot send messages.' });
      }

      // Mafia chat: only if player is mafia and >1 mafia alive
      if (data.channel === 'mafia') {
        if (player.role !== 'mafia') {
          return socket.emit('error', { message: 'Only mafia can use mafia chat.' });
        }
        const aliveMafiaCount = getAliveMafia(room).length;
        if (aliveMafiaCount <= 1) {
          return socket.emit('error', { message: 'Mafia chat disabled (only 1 mafia left).' });
        }
      }

      // Rate limit: max 10 messages per 5 seconds
      const now = Date.now();
      if (now - player.chatWindowStart > 5_000) {
        player.chatCount = 0;
        player.chatWindowStart = now;
      }
      player.chatCount++;
      if (player.chatCount > 10) {
        return socket.emit('error', { message: 'Slow down! (rate limit)' });
      }

      // Sanitize text
      const text = data.text
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 300);
      if (!text) return;

      const msg: ChatMessage = {
        senderId: socket.id,
        senderName: player.name,
        text,
        channel: data.channel,
        timestamp: Date.now(),
      };

      if (data.channel === 'mafia') {
        // Send to: alive mafia + eliminated mafia (spectators can watch)
        for (const p of room.players.values()) {
          if (p.role === 'mafia') {
            io.sockets.sockets.get(p.id)?.emit('chat', msg);
          }
        }
      } else {
        io.to(data.code).emit('chat', msg);
      }

      touchRoom(data.code);
    }
  );

  // ── RECONNECT ──────────────────────────────────────────────────────────────
  socket.on('reconnect_player', (data: { sessionId: string; code: string }) => {
    const room = getRoom(data.code);
    if (!room) return socket.emit('error', { message: 'Room not found.' });

    // Find player by session ID
    let foundPlayer = null;
    for (const player of room.players.values()) {
      if (player.sessionId === data.sessionId) {
        foundPlayer = player;
        break;
      }
    }

    if (!foundPlayer) return socket.emit('error', { message: 'Session not found.' });

    // Check 30s reconnect window
    if (
      foundPlayer.disconnectedAt &&
      Date.now() - foundPlayer.disconnectedAt > 30_000
    ) {
      return socket.emit('error', { message: 'Reconnect window expired.' });
    }

    // Transfer player to new socket
    const oldId = foundPlayer.id;
    room.players.delete(oldId);
    socketToRoom.delete(oldId); // ← Remove old mapping
    foundPlayer.id = socket.id;
    foundPlayer.connected = true;
    foundPlayer.disconnectedAt = null;
    room.players.set(socket.id, foundPlayer);
    socketToRoom.set(socket.id, data.code); // ← Update mapping

    // Update host if needed
    if (room.hostId === oldId) room.hostId = socket.id;

    registerSession(data.sessionId, socket.id);
    socket.join(data.code);

    socket.emit('reconnected', {
      code: data.code,
      playerId: socket.id,
      role: foundPlayer.role,
      phase: room.phase,
      players: toPublicPlayers(room, room.hostId),
    });

    broadcastRoomUpdate(data.code);
    touchRoom(data.code);
    console.log(`[Reconnect] ${foundPlayer.name} reconnected to ${data.code}`);
  });

  // ── LEAVE ROOM ─────────────────────────────────────────────────────────────
  socket.on('leave_room', (data: { code: string }) => {
    socketToRoom.delete(socket.id);
  });

  // ── WebRTC SIGNALING ───────────────────────────────────────────────────────
  // Pure relay — server never touches audio data.

  socket.on('rtc:join', (data: { code: string; channel: 'general' | 'mafia' }) => {
    console.log(`[RTC] rtc:join received from ${socket.id}, code=${data.code}, channel=${data.channel}`);
    const room = getRoom(data.code);
    if (!room) {
      console.log(`[RTC] ❌ room not found: ${data.code}`);
      return;
    }
    const player = room.players.get(socket.id);
    if (!player) {
      console.log(`[RTC] ❌ player not found for socketId=${socket.id} in room ${data.code}. Players:`, [...room.players.keys()]);
      return;
    }

    // Enforce mafia-only channel
    if (data.channel === 'mafia' && player.role !== 'mafia') return;

    const ch = ensureRtcRoom(data.code);

    // Remove from previous channel first
    ch.general.delete(socket.id);
    ch.mafia.delete(socket.id);

    const channelSet = data.channel === 'mafia' ? ch.mafia : ch.general;

    // Tell all existing peers in this channel that we joined (they initiate the offer)
    console.log(`[RTC] Channel '${data.channel}' currently has ${channelSet.size} peer(s)`);
    for (const peerId of channelSet) {
      if (peerId === socket.id) continue;
      io.sockets.sockets.get(peerId)?.emit('rtc:peer-joined', { peerId: socket.id, channel: data.channel });
      // Also tell us about existing peers so we can display them
      socket.emit('rtc:peer-exists', { peerId, channel: data.channel });
    }

    channelSet.add(socket.id);
    console.log(`[RTC] ✅ ${player.name} joined '${data.channel}' in room ${data.code}, total peers: ${channelSet.size}`);
  });

  socket.on('rtc:leave', (data: { code: string }) => {
    const code = data.code;
    const ch = rtcChannels.get(code);
    if (!ch) return;
    ch.general.delete(socket.id);
    ch.mafia.delete(socket.id);
    // Notify all peers in this room
    for (const ch2 of [ch.general, ch.mafia]) {
      for (const peerId of ch2) {
        io.sockets.sockets.get(peerId)?.emit('rtc:peer-left', { peerId: socket.id });
      }
    }
  });

  socket.on('rtc:offer', (data: { to: string; offer: object }) => {
    io.sockets.sockets.get(data.to)?.emit('rtc:offer', { from: socket.id, offer: data.offer });
  });

  socket.on('rtc:answer', (data: { to: string; answer: object }) => {
    io.sockets.sockets.get(data.to)?.emit('rtc:answer', { from: socket.id, answer: data.answer });
  });

  socket.on('rtc:ice', (data: { to: string; candidate: object }) => {
    io.sockets.sockets.get(data.to)?.emit('rtc:ice', { from: socket.id, candidate: data.candidate });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    const code = socketToRoom.get(socket.id);
    if (code) {
      rtcRemoveSocket(socket.id, code);
      // Notify RTC peers
      const ch = rtcChannels.get(code);
      if (ch) {
        for (const peerId of [...ch.general, ...ch.mafia]) {
          io.sockets.sockets.get(peerId)?.emit('rtc:peer-left', { peerId: socket.id });
        }
      }
      handleDisconnect(socket, code, false);
      socketToRoom.delete(socket.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Disconnect handler
// ---------------------------------------------------------------------------

/**
 * Handle a player disconnecting from a room.
 * - permanent=true  (leave_room event): remove immediately
 * - permanent=false (socket disconnect):
 *     - Lobby: give a 15s grace so navigation blips don't wipe the room
 *     - Mid-game: give a 30s grace so players can reconnect
 */
function handleDisconnect(socket: Socket, code: string, permanent: boolean): void {
  const room = getRoom(code);
  if (!room) return;

  const player = room.players.get(socket.id);
  if (!player) return;

  if (permanent) {
    // Explicit leave — remove immediately
    room.players.delete(socket.id);
    removeSession(player.sessionId);
    socket.leave(code);

    if (room.hostId === socket.id && room.players.size > 0) {
      room.hostId = room.players.keys().next().value as string;
      systemMessage(code, `${room.players.get(room.hostId)?.name} is now the host.`);
    }

    if (room.players.size === 0) {
      deleteRoom(code);
      return;
    }

    systemMessage(code, `${player.name} left the room.`);
    broadcastRoomUpdate(code);
  } else {
    // Unintentional disconnect — always give a grace window
    const gracePeriodMs = room.phase === 'lobby' ? 15_000 : 30_000;

    player.connected = false;
    player.disconnectedAt = Date.now();

    if (room.phase !== 'lobby') {
      systemMessage(code, `${player.name} disconnected. ${gracePeriodMs / 1000}s to reconnect...`);
      broadcastRoomUpdate(code);
    }
    // (In lobby we stay silent — avoids alarming other players for a navigation blip)

    setTimeout(() => {
      const updatedRoom = getRoom(code);
      if (!updatedRoom) return;
      const updatedPlayer = updatedRoom.players.get(socket.id);

      // If still disconnected after grace period
      if (updatedPlayer && !updatedPlayer.connected) {
        if (updatedRoom.phase === 'lobby') {
          // Now remove from lobby
          updatedRoom.players.delete(socket.id);
          removeSession(player.sessionId);

          if (updatedRoom.hostId === socket.id && updatedRoom.players.size > 0) {
            updatedRoom.hostId = updatedRoom.players.keys().next().value as string;
            systemMessage(code, `${updatedRoom.players.get(updatedRoom.hostId)?.name} is now the host.`);
          }

          if (updatedRoom.players.size === 0) {
            deleteRoom(code);
          } else {
            systemMessage(code, `${player.name} left the lobby.`);
            broadcastRoomUpdate(code);
          }
        } else {
          // Mid-game: treat as eliminated
          updatedPlayer.alive = false;
          systemMessage(code, `${updatedPlayer.name} failed to reconnect.`);
          broadcastRoomUpdate(code);

          const win = checkWinCondition(updatedRoom);
          if (win) endGame(code, win);
        }
      }
    }, gracePeriodMs);
  }
}

// ---------------------------------------------------------------------------
// Night action completeness check
// ---------------------------------------------------------------------------

/**
 * Check if all alive role-holders have submitted their night actions.
 * If yes, resolve night phase early.
 */
function checkNightActionsComplete(code: string): void {
  const room = getRoom(code);
  if (!room || room.phase !== 'night') return;

  const alivePlayers = getAlivePlayers(room);
  const required: string[] = [];

  // At least 1 mafia member must vote
  const aliveMafia = alivePlayers.filter((p) => p.role === 'mafia');
  const mafiaVoters = room.mafiaVotes.map((v) => v.voterId);
  const allMafiaVoted = aliveMafia.length > 0 &&
    aliveMafia.every((p) => mafiaVoters.includes(p.id));

  const hasDoctor = alivePlayers.some((p) => p.role === 'doctor');
  const doctorActed = hasDoctor ? room.doctorSave !== null : true;

  const hasDetective = alivePlayers.some((p) => p.role === 'detective');
  const detectiveActed = hasDetective ? room.detectiveTarget !== null : true;

  if (allMafiaVoted && doctorActed && detectiveActed) {
    console.log(`[Night] All actions submitted early in room ${code}`);
    if (room.timer) clearTimeout(room.timer);
    resolveNightPhase(code);
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

startCleanupInterval();

// Bind to 0.0.0.0 so LAN/other-device friends can connect using your local IP
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  console.log(`🎭 Who Lies Tonight – Server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  if (localIPs.length > 0) {
    console.log(`   Network: http://${localIPs[0]}:${PORT}  ← share this with LAN friends`);
  }
  console.log(`   Min players: ${MIN_PLAYERS} | Max: ${MAX_PLAYERS}`);
});

export { io };


