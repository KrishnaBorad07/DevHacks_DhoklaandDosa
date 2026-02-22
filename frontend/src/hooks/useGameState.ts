// =============================================================================
// hooks/useGameState.ts – Central game state hook with all socket listeners
// =============================================================================
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type {
  GameState,
  PublicPlayer,
  ChatMessage,
  CutscenePayload,
  GameEndPayload,
  GameStartPayload,
  NarratePayload,
  VoteUpdatePayload,
  DetectiveResult,
  Phase,
} from '../types/game';

const DEFAULT_STATE: GameState = {
  roomCode: null,
  myId: null,
  mySessionId: null,
  myRole: null,
  myMafiaTeam: [],
  players: [],
  phase: 'lobby',
  round: 0,
  timer: 0,
  votes: {},
  voteTally: {},
  messages: [],
  narratorText: null,
  narratorOutcome: null,
  cutscene: null,
  gameEnd: null,
  detectiveResults: [],
  error: null,
  started: false,
  nightActionSubmitted: false,
};

export function useGameState() {
  const socket = useSocket();
  const [state, setState] = useState<GameState>(() => {
    // Restore session from localStorage on mount
    const saved = localStorage.getItem('wlt_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_STATE;
  });

  // Persist session info to localStorage whenever it changes
  useEffect(() => {
    if (state.mySessionId && state.roomCode) {
      localStorage.setItem(
        'wlt_session',
        JSON.stringify({
          mySessionId: state.mySessionId,
          roomCode: state.roomCode,
          myId: state.myId,
        })
      );
    }
  }, [state.mySessionId, state.roomCode, state.myId]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const clearCutscene = useCallback(() => {
    setState((s) => ({ ...s, cutscene: null }));
  }, []);

  const clearNarrator = useCallback(() => {
    setState((s) => ({ ...s, narratorText: null, narratorOutcome: null }));
  }, []);

  useEffect(() => {
    // ── Room events ──────────────────────────────────────────────────────────
    socket.on('room_created', (data: { code: string; playerId: string; sessionId: string }) => {
      setState((s) => ({
        ...s,
        roomCode: data.code,
        myId: data.playerId,
        mySessionId: data.sessionId,
        phase: 'lobby',
        started: false,
      }));
    });

    socket.on('room_joined', (data: { code: string; playerId: string; sessionId: string }) => {
      setState((s) => ({
        ...s,
        roomCode: data.code,
        myId: data.playerId,
        mySessionId: data.sessionId,
        phase: 'lobby',
        started: false,
      }));
    });

    socket.on(
      'room_updated',
      (data: { code: string; phase: Phase; round: number; players: PublicPlayer[]; started: boolean }) => {
        setState((s) => ({
          ...s,
          players: data.players,
          phase: data.phase,
          round: data.round,
          started: data.started,
          roomCode: data.code,
        }));
      }
    );

    // ── Game start ───────────────────────────────────────────────────────────
    socket.on('game_started', (data: GameStartPayload) => {
      setState((s) => ({
        ...s,
        myRole: data.role,
        myMafiaTeam: data.mafiaTeam,
        players: data.players,
        phase: data.phase,
        started: true,
        nightActionSubmitted: false,
        cutscene: null,
        narratorText: null,
        gameEnd: null,
        detectiveResults: [],
        votes: {},
        voteTally: {},
      }));
    });

    // ── Phase changes ────────────────────────────────────────────────────────
    socket.on('phase_changed', (data: { phase: Phase; round: number; timer: number }) => {
      setState((s) => ({
        ...s,
        phase: data.phase,
        round: data.round,
        timer: data.timer,
        nightActionSubmitted: data.phase === 'night' ? false : s.nightActionSubmitted,
        votes: data.phase === 'night' ? {} : s.votes,
        voteTally: data.phase === 'night' ? {} : s.voteTally,
      }));
    });

    // ── Night actions ────────────────────────────────────────────────────────
    socket.on('detective_result', (data: DetectiveResult) => {
      setState((s) => ({
        ...s,
        detectiveResults: [...s.detectiveResults, data],
      }));
    });

    // ── Narrator ─────────────────────────────────────────────────────────────
    socket.on('narrate', (data: NarratePayload) => {
      setState((s) => ({
        ...s,
        narratorText: data.text,
        narratorOutcome: data.outcome,
      }));
    });

    // ── Cutscene ─────────────────────────────────────────────────────────────
    socket.on('cutscene', (data: CutscenePayload) => {
      setState((s) => ({ ...s, cutscene: data }));
    });

    // ── Voting ───────────────────────────────────────────────────────────────
    socket.on('vote_updated', (data: VoteUpdatePayload) => {
      setState((s) => {
        // Generate chat messages for OTHER players' new votes only
        // (own vote message is already injected immediately in submitDayVote)
        const newVoteMsgs: ChatMessage[] = [];
        for (const [voterId, targetId] of Object.entries(data.votes)) {
          if (voterId !== s.myId && s.votes[voterId] !== targetId) {
            const voter = s.players.find((p) => p.id === voterId);
            const target = s.players.find((p) => p.id === targetId);
            if (voter && target) {
              newVoteMsgs.push({
                senderId: 'vote',
                senderName: 'Vote',
                text: `${voter.name} voted for ${target.name}`,
                channel: 'global',
                timestamp: Date.now(),
              });
            }
          }
        }
        return {
          ...s,
          votes: data.votes,
          voteTally: data.tally,
          messages: newVoteMsgs.length > 0
            ? [...s.messages.slice(-200), ...newVoteMsgs]
            : s.messages,
        };
      });
    });

    // ── Eliminate ────────────────────────────────────────────────────────────
    socket.on(
      'player_eliminated',
      (data: { playerId: string; playerName: string; cause: string }) => {
        setState((s) => ({
          ...s,
          players: s.players.map((p) =>
            p.id === data.playerId ? { ...p, alive: false } : p
          ),
        }));
      }
    );

    // ── Chat ─────────────────────────────────────────────────────────────────
    socket.on('chat', (msg: ChatMessage) => {
      setState((s) => ({
        ...s,
        messages: [...s.messages.slice(-200), msg], // Keep last 200 msgs
      }));
    });

    // ── Game end ─────────────────────────────────────────────────────────────
    socket.on('game_ended', (data: GameEndPayload) => {
      setState((s) => ({ ...s, gameEnd: data, phase: 'ended' }));
    });

    // ── Reconnect ────────────────────────────────────────────────────────────
    socket.on(
      'reconnected',
      (data: { code: string; playerId: string; role: string; phase: Phase; players: PublicPlayer[] }) => {
        setState((s) => ({
          ...s,
          roomCode: data.code,
          myId: data.playerId,
          myRole: data.role as any,
          phase: data.phase,
          players: data.players,
        }));
      }
    );

    // ── Room reset (play again) ─────────────────────────────────────────────
    socket.on('room_reset', (data: { code: string; players: PublicPlayer[] }) => {
      setState((s) => ({
        ...s,
        phase: 'lobby',
        round: 0,
        started: false,
        myRole: null,
        myMafiaTeam: [],
        players: data.players,
        gameEnd: null,
        cutscene: null,
        narratorText: null,
        narratorOutcome: null,
        votes: {},
        voteTally: {},
        messages: [],
        detectiveResults: [],
        nightActionSubmitted: false,
        error: null,
      }));
    });

    // ── Errors ───────────────────────────────────────────────────────────────
    socket.on('error', (data: { message: string }) => {
      setState((s) => ({ ...s, error: data.message }));
      setTimeout(() => setState((s) => ({ ...s, error: null })), 4000);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('phase_changed');
      socket.off('detective_result');
      socket.off('narrate');
      socket.off('cutscene');
      socket.off('vote_updated');
      socket.off('player_eliminated');
      socket.off('chat');
      socket.off('game_ended');
      socket.off('reconnected');
      socket.off('room_reset');
      socket.off('error');
    };
  }, [socket]);

  // ── Action dispatchers ────────────────────────────────────────────────────

  const createRoom = useCallback(
    (username: string, avatar: import('../types/game').Avatar) => {
      socket.emit('create_room', { username, avatar });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (code: string, username: string, avatar: import('../types/game').Avatar) => {
      socket.emit('join_room', { code: code.toUpperCase(), username, avatar });
    },
    [socket]
  );

  const startGame = useCallback(
    (code: string) => {
      socket.emit('start_game', { code });
    },
    [socket]
  );

  const submitNightAction = useCallback(
    (code: string, action: 'kill' | 'save' | 'investigate', targetId: string) => {
      socket.emit('night_action', { code, action, targetId });
      setState((s) => ({ ...s, nightActionSubmitted: true }));
    },
    [socket]
  );

  const submitDayVote = useCallback(
    (code: string, targetId: string) => {
      socket.emit('day_vote', { code, targetId });
      // Inject vote message immediately for the local player
      setState((s) => {
        const voter = s.players.find((p) => p.id === s.myId);
        const target = s.players.find((p) => p.id === targetId);
        if (!voter || !target) return s;
        const voteMsg: ChatMessage = {
          senderId: 'vote',
          senderName: 'Vote',
          text: `${voter.name} voted for ${target.name}`,
          channel: 'global',
          timestamp: Date.now(),
        };
        return { ...s, messages: [...s.messages.slice(-200), voteMsg] };
      });
    },
    [socket]
  );

  const sendChat = useCallback(
    (code: string, text: string, channel: 'global' | 'mafia') => {
      socket.emit('chat_message', { code, text, channel });
    },
    [socket]
  );

  const attemptReconnect = useCallback(
    (sessionId: string, code: string) => {
      socket.emit('reconnect_player', { sessionId, code });
    },
    [socket]
  );

  const leaveRoom = useCallback(
    (code: string) => {
      socket.emit('leave_room', { code });
      setState(DEFAULT_STATE);
      localStorage.removeItem('wlt_session');
    },
    [socket]
  );

  const skipDiscussion = useCallback(
    (code: string) => {
      socket.emit('skip_discussion', { code });
    },
    [socket]
  );

  const playAgain = useCallback(
    (code: string) => {
      socket.emit('play_again', { code });
    },
    [socket]
  );

  return {
    state,
    clearError,
    clearCutscene,
    clearNarrator,
    createRoom,
    joinRoom,
    startGame,
    submitNightAction,
    submitDayVote,
    sendChat,
    attemptReconnect,
    leaveRoom,
    skipDiscussion,
    playAgain,
  };
}
