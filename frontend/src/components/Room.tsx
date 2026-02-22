// =============================================================================
// components/Room.tsx – Master game room view
// Assembles all sub-components and manages game flow
// =============================================================================
import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TableScene } from './TableScene';
import { NarratorBox } from './NarratorBox';
import { Chat } from './Chat';
import { CutscenePlayer } from './CutscenePlayer';
import { PhaseOverlay } from './PhaseOverlay';
import { NightActionModal } from './NightActionModal';
import { VotePanel } from './VotePanel';
import { GameEndScreen } from './GameEndScreen';
import { RoleRevealScreen } from './RoleRevealScreen';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { VoiceBar } from './VoiceBar';
import { useSocket } from '../hooks/useSocket';
import type { useGameState } from '../hooks/useGameState';

type GameStateApi = ReturnType<typeof useGameState>;

interface RoomProps {
  api: GameStateApi;
}

// Role emojis and labels
const ROLE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  mafia: { icon: '🕶️', label: 'Gangster', color: 'var(--noir-red)' },
  doctor: { icon: '💉', label: 'Doctor', color: '#00ff88' },
  detective: { icon: '🕵️', label: 'Detective', color: 'var(--noir-neon-blue)' },
  citizen: { icon: '👤', label: 'Citizen', color: 'var(--noir-text)' },
};

// Real countdown timer — counts down from timerMs on each phase change
function usePhaseTimer(timerMs: number, phase: string) {
  const [remaining, setRemaining] = useState(timerMs);

  // Reset whenever a new phase arrives with a fresh timer value
  useEffect(() => {
    if (timerMs <= 0) return;
    setRemaining(timerMs);
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerMs, phase]); // re-run when phase changes (new phase brings new timerMs)

  const totalSec = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const secs = (totalSec % 60).toString().padStart(2, '0');
  return { seconds: totalSec, label: `${mins}:${secs}`, urgent: totalSec <= 10 && totalSec > 0 };
}

export function Room({ api }: RoomProps) {
  const { code: urlCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    state,
    clearCutscene,
    clearNarrator,
    startGame,
    submitNightAction,
    submitDayVote,
    sendChat,
    leaveRoom,
    attemptReconnect,
    skipDiscussion,
    playAgain,
  } = api;

  const {
    roomCode, myId, myRole, mySessionId, players, phase, round, timer,
    votes, voteTally, messages, narratorText, narratorOutcome,
    cutscene, gameEnd, detectiveResults, started, nightActionSubmitted,
    myMafiaTeam,
  } = state;

  // Reconnect attempt on mount if session info exists
  useEffect(() => {
    if (mySessionId && urlCode && !myId) {
      attemptReconnect(mySessionId, urlCode);
    }
  }, []);

  // Among Us-style role reveal: show once when game first starts
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  useEffect(() => {
    if (started && myRole) {
      setShowRoleReveal(true);
    }
    // Only re-run when `started` changes (false → true on game start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const myPlayer = players.find((p) => p.id === myId);
  const isAlive = myPlayer?.alive ?? false;
  const isHost = myPlayer?.isHost ?? false;

  const aliveMafiaCount = players.filter(
    (p) => p.alive && detectiveResults // just count from playerlist perspective
  ).length;

  // Actual alive mafia count: only know for certain if we are mafia
  const mafiaAliveCount = myRole === 'mafia'
    ? myMafiaTeam.filter((m) => players.find((p) => p.id === m.id && p.alive)).length
    : players.filter((p) => p.alive).length; // fallback — server controls mafia chat

  // ── Voice chat (uses mafiaAliveCount for channel gating) ─────────────────────
  const gameSocket = useSocket(); // same socket instance used to join the room
  const voice = useVoiceChat(
    gameSocket,
    roomCode,
    phase,
    myRole,
    isAlive,
    mafiaAliveCount,
  );

  const handleVote = useCallback(
    (targetId: string) => {
      if (roomCode && phase === 'vote' && isAlive) {
        submitDayVote(roomCode, targetId);
      }
    },
    [roomCode, phase, isAlive, submitDayVote]
  );

  const handleNightAction = useCallback(
    (code: string, action: 'kill' | 'save' | 'investigate', targetId: string) => {
      submitNightAction(code, action, targetId);
    },
    [submitNightAction]
  );

  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Leaderboard shown in lobby after Play Again
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';
  interface LbEntry { player_name: string; total_score: number; games_won: number; games_played: number; }
  const [lobbyLeaderboard, setLobbyLeaderboard] = useState<LbEntry[] | null>(null);
  const [lbRoomCode, setLbRoomCode] = useState<string | null>(null);

  const handlePlayAgain = () => {
    if (!roomCode) return;
    const code = roomCode;
    playAgain(code);
    // Fetch leaderboard for this room so it shows in the lobby while waiting
    setTimeout(() => {
      fetch(`${BACKEND_URL}/leaderboard?room=${encodeURIComponent(code)}`)
        .then((r) => r.json())
        .then((data) => { setLobbyLeaderboard(data); setLbRoomCode(code); })
        .catch(() => { });
    }, 1500);
  };

  const handleLeave = () => {
    if (roomCode) leaveRoom(roomCode);
    navigate('/');
  };

  const roleInfo = myRole ? ROLE_INFO[myRole] : null;
  // ── Countdown timer ──
  const countdown = usePhaseTimer(timer, phase);

  const headshotUrl = myPlayer?.avatar?.url ? getHeadshotUrl(myPlayer.avatar.url) : '';

  return (
    <div
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--noir-text)',
        position: 'relative',
      }}
    >
      {/* ── Role reveal (Among Us style) ──────────────────────────────── */}
      <AnimatePresence>
        {showRoleReveal && myRole && (
          <RoleRevealScreen
            role={myRole}
            mafiaTeam={myMafiaTeam}
            onDismiss={() => setShowRoleReveal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Phase transitions overlay ─────────────────────────────────────── */}
      <PhaseOverlay phase={phase} round={round} />

      {/* ── Cutscene ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cutscene && (
          <CutscenePlayer cutscene={cutscene} onComplete={clearCutscene} />
        )}
      </AnimatePresence>

      {/* ── Game end screen ───────────────────────────────────────────────── */}
      {gameEnd && (
        <GameEndScreen
          data={gameEnd}
          players={players}
          myId={myId}
          roomCode={roomCode ?? ''}
          onPlayAgain={handlePlayAgain}
          onLeave={handleLeave}
          isHost={isHost}
        />
      )}

      {/* ── Voice chat HUD ──────────────────────────────────────────────────── */}
      {roomCode && (
        <VoiceBar
          voice={voice}
          players={players}
          myId={myId}
          phase={phase}
        />
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header
        className="glass-card"
        style={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          padding: '0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Room code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.6rem', color: 'var(--noir-text-dim)', letterSpacing: '0.15em', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
              Room Code
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.25em', color: 'var(--noir-gold)', textShadow: 'var(--shadow-gold)' }}>
              {roomCode}
            </p>
          </div>
          <button
            onClick={copyRoomCode}
            title="Copy room code"
            style={{
              background: copied ? 'rgba(0,255,136,0.12)' : 'rgba(255,215,0,0.08)',
              border: `1px solid ${copied ? 'rgba(0,255,136,0.5)' : 'rgba(255,215,0,0.25)'}`,
              borderRadius: 4,
              color: copied ? '#00ff88' : 'var(--noir-gold)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              transition: 'all 200ms',
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>

        {/* Phase indicator */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--noir-text-dim)', letterSpacing: '0.15em', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
            {phase === 'lobby' ? 'Waiting' : `Round ${round}`}
          </p>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: phase === 'night' ? '#00d4ff' : phase === 'vote' ? 'var(--noir-red)' : 'var(--noir-gold)',
          }}>
            {phase === 'lobby' ? 'Lobby' :
              phase === 'night' ? '🌙 Night' :
                phase === 'day' ? '☀️ Day' :
                  phase === 'vote' ? '⚖️ Vote' : '🏁 Ended'}
          </p>
        </div>

        {/* ── Countdown timer: night / discussion / vote ── */}
        {['night', 'day', 'vote'].includes(phase) && (
          <div style={{ textAlign: 'center', minWidth: 68 }}>
            <p style={{
              fontSize: '0.5rem',
              color: 'var(--noir-text-dim)',
              letterSpacing: '0.14em',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              marginBottom: '0.1rem',
            }}>
              {phase === 'night' ? 'NIGHT ENDS IN'
                : phase === 'vote' ? 'VOTE ENDS IN'
                  : 'DISCUSSION ENDS IN'}
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              letterSpacing: '0.1em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: countdown.urgent
                ? '#ff3333'
                : phase === 'night' ? '#00d4ff'
                  : phase === 'vote' ? 'var(--noir-red)'
                    : 'var(--noir-gold)',
              textShadow: countdown.urgent
                ? '0 0 14px rgba(255,40,40,0.95)'
                : phase === 'night' ? '0 0 10px rgba(0,212,255,0.6)'
                  : phase === 'vote' ? '0 0 10px rgba(200,0,0,0.5)'
                    : '0 0 10px rgba(255,215,0,0.5)',
              animation: countdown.urgent ? 'urgent-pulse 0.55s ease-in-out infinite alternate' : 'none',
            }}>
              {countdown.label}
            </p>
            {/* Inline keyframe for the urgent pulse — only injected once */}
            <style>{`@keyframes urgent-pulse { from { opacity: 1; } to { opacity: 0.35; } }`}</style>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {myPlayer && (
            headshotUrl
              ? <img src={headshotUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,215,0,0.3)' }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(myPlayer.name), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: '#fff' }}>{getInitials(myPlayer.name)}</span>
              </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--noir-gold)' }}>
              {myPlayer?.name ?? '—'}
            </p>
            {roleInfo && started && (
              <p style={{
                fontSize: '0.65rem',
                color: roleInfo.color,
                fontWeight: 600,
                letterSpacing: '0.06em',
              }}>
                {roleInfo.icon} {roleInfo.label}
              </p>
            )}
            {!isAlive && started && (
              <span className="spectator-badge">SPECTATOR</span>
            )}
          </div>
        </div>

        {/* Leave */}
        <button
          className="btn-noir btn-red"
          style={{ fontSize: '0.65rem', padding: '0.35rem 0.75rem' }}
          onClick={handleLeave}
        >
          ✕ LEAVE
        </button>
      </header>

      {/* ── Lobby view ────────────────────────────────────────────────────── */}
      {phase === 'lobby' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            gap: '1.25rem',
            maxWidth: 1100,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {/* LEFT: Roster */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card"
            style={{ flex: '0 0 420px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
          >
            <h2 className="heading-gold text-center" style={{ fontSize: '1.1rem', marginBottom: '1.25rem', letterSpacing: '0.12em' }}>
              👥 SYNDICATE ROSTER
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', marginBottom: '1.25rem' }}>
              {players.map((player, i) => {
                const playerHeadshot = player.avatar?.url ? getHeadshotUrl(player.avatar.url) : '';
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(26,26,26,0.9)', border: `1px solid ${player.id === myId ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.1)'}`, borderRadius: 3 }}
                  >
                    {playerHeadshot
                      ? <img src={playerHeadshot} alt={player.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: '50%', background: getAvatarColor(player.name), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '0.85rem' }}>{getInitials(player.name)}</span>
                      </div>
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--noir-gold)' }}>
                        {player.name}
                        {player.id === myId && <span style={{ color: 'var(--noir-text-dim)', marginLeft: 6, fontSize: '0.6rem' }}>(you)</span>}
                      </p>
                      {player.isHost && (
                        <p style={{ fontSize: '0.6rem', color: 'var(--noir-red)', letterSpacing: '0.1em' }}>⭐ HOST</p>
                      )}
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: player.connected ? '#00ff88' : '#ff4444',
                      boxShadow: `0 0 6px ${player.connected ? '#00ff88' : '#ff4444'}`,
                    }} />
                  </motion.div>
                );
              })}
            </div>

            <div className="divider-gold" />

            <div className="flex items-center justify-between gap-3 mt-4">
              <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem' }}>
                {players.length}/12 players · Min 4 to start
              </p>
              <div className="flex items-center gap-2">
                {isHost && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    className="btn-noir btn-filled-red"
                    style={{ fontSize: '0.75rem', padding: '0.55rem 1.2rem' }}
                    disabled={players.length < 4}
                    onClick={() => roomCode && startGame(roomCode)}
                  >
                    ⚔ START GAME
                  </motion.button>
                )}
                {!isHost && (
                  <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Waiting for host to start...
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Leaderboard (after play again) + Chat */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Leaderboard panel — only shows after Play Again */}
            {lobbyLeaderboard && lobbyLeaderboard.length > 0 && (
              <div className="glass-card" style={{ padding: '1rem', flexShrink: 0 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--noir-gold)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
                  🏆 {lbRoomCode} &mdash; Last Game Leaderboard
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {/* Header — fixed, then scrollable rows */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5rem 1fr 3.5rem 3rem 3.5rem', gap: '0.4rem', padding: '0 0.5rem 0.4rem', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
                    {['', 'Player', 'Score', 'Won', 'Games'].map((h) => (
                      <span key={h} style={{ fontSize: '0.55rem', color: 'var(--noir-text-dim)', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', textTransform: 'uppercase', textAlign: h === '' ? 'left' : 'right' }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ maxHeight: '13rem', overflowY: 'auto' }}>
                    {lobbyLeaderboard.map((entry, idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const myName = players.find((p) => p.id === myId)?.name ?? '';
                      const isMe = myName && entry.player_name.toLowerCase() === myName.toLowerCase();
                      return (
                        <div key={entry.player_name + idx} style={{ display: 'grid', gridTemplateColumns: '1.5rem 1fr 3.5rem 3rem 3.5rem', gap: '0.4rem', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 3, background: isMe ? 'rgba(255,215,0,0.07)' : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', border: isMe ? '1px solid rgba(255,215,0,0.25)' : '1px solid transparent' }}>
                          <span style={{ fontSize: '0.85rem', textAlign: 'center' }}>{medals[idx] ?? `${idx + 1}`}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: isMe ? 'var(--noir-gold)' : 'var(--noir-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.player_name}{isMe && <span style={{ color: 'var(--noir-text-dim)', fontSize: '0.6rem', marginLeft: 4 }}>(you)</span>}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--noir-gold)', fontWeight: 700, textAlign: 'right' }}>{entry.total_score}</span>
                          <span style={{ fontSize: '0.78rem', color: '#00ff88', textAlign: 'right' }}>{entry.games_won}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--noir-text-dim)', textAlign: 'right' }}>{entry.games_played}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <Chat
              messages={messages}
              myId={myId}
              myRole={myRole}
              alive={true}
              roomCode={roomCode ?? ''}
              onSend={sendChat}
              aliveMafiaCount={0}
            />
          </motion.div>
        </div>
      )}

      {/* ── Active game layout ─────────────────────────────────────────────── */}
      {phase !== 'lobby' && !gameEnd && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '70fr 30fr',
            gap: '0.75rem',
            padding: '0.75rem',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* ── LEFT COLUMN (70% width) ─────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: '72fr 28fr',
              gap: '0.75rem',
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {/* Top section (72% height) - 3D Scene */}
            <div
              className="glass-card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                padding: 0,
                border: '1px solid rgba(255,215,0,0.15)',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: '0.75rem', left: '1rem', zIndex: 5 }}>
                <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                  {players.filter((p) => p.alive).length} players alive
                </p>
                <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {phase === 'night' && '🌙 Night Phase'}
                  {phase === 'day' && '☀️ Discussion'}
                  {phase === 'vote' && '⚖️ Voting'}
                </p>
              </div>

              {phase === 'day' && isHost && (
                <div style={{ position: 'absolute', top: '0.75rem', right: '1rem', zIndex: 5 }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-noir"
                    style={{
                      fontSize: '0.6rem',
                      padding: '0.25rem 0.6rem',
                      color: 'var(--noir-gold)',
                      border: '1px solid rgba(255,215,0,0.4)',
                      cursor: 'pointer',
                      letterSpacing: '0.06em',
                      background: 'rgba(5,5,5,0.6)',
                    }}
                    onClick={() => roomCode && skipDiscussion(roomCode)}
                  >
                    ⏭ SKIP TO VOTE
                  </motion.button>
                </div>
              )}

              <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0, borderRadius: 4, overflow: 'hidden' }}>
                {players.length > 0 && (
                  <TableScene
                    players={players}
                    myId={myId}
                    myRole={myRole}
                    voteTally={voteTally}
                    phase={phase}
                    onPlayerClick={phase === 'vote' && isAlive ? handleVote : undefined}
                  />
                )}
              </div>
            </div>

            {/* Bottom section (25% height) - AI Narrator Container */}
            <div
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 0,
                padding: '0.75rem',
                border: '1px solid rgba(255,215,0,0.15)',
                background: 'rgba(5,5,5,0.7)',
                overflow: 'hidden',
              }}
            >
              <div style={{ flex: 1, maxWidth: 600, height: '100%', display: 'flex', alignItems: 'center' }}>
                <AnimatePresence mode="wait">
                  {(phase === 'day' || phase === 'vote') && narratorText ? (
                    <motion.div
                      key="narrator-active"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
                    >
                      <NarratorBox
                        text={narratorText}
                        outcome={narratorOutcome}
                        onDone={clearNarrator}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="narrator-idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      style={{ textAlign: 'center', width: '100%' }}
                    >
                      <p style={{ fontSize: '0.7rem', letterSpacing: '0.3em', fontFamily: 'var(--font-display)' }}>
                        OBSERVING CITY STREETS...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          {/* ── RIGHT COLUMN (30% width) ────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: '35fr 65fr',
              gap: '0.75rem',
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {/* Top section (35% height) - Actions / Voting / Notes */}
            <div
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                minHeight: 0,
                padding: '0.75rem',
                border: '1px solid rgba(255,215,0,0.15)',
                overflowY: 'auto',
                background: 'rgba(10,10,10,0.85)',
              }}
            >
              {/* Night action modal — dead players cannot use powers */}
              {phase === 'night' && myRole && roomCode && isAlive && (
                <div style={{ flexShrink: 0 }}>
                  <NightActionModal
                    myRole={myRole}
                    myId={myId ?? ''}
                    players={players}
                    submitted={nightActionSubmitted}
                    roomCode={roomCode}
                    onSubmit={handleNightAction}
                  />
                </div>
              )}

              {/* Day vote panel */}
              {(phase === 'day' || phase === 'vote') && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <VotePanel
                    players={players}
                    myId={myId}
                    votes={votes}
                    voteTally={voteTally}
                    alive={isAlive}
                    onVote={handleVote}
                    phase={phase}
                    isHost={isHost}
                    onSkipDiscussion={() => roomCode && skipDiscussion(roomCode)}
                  />
                </div>
              )}

              {/* Detective results history */}
              {myRole === 'detective' && detectiveResults.length > 0 && (
                <div style={{ flexShrink: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4, border: '1px solid rgba(0, 212, 255, 0.2)' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', color: 'var(--noir-neon-blue)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                    🕵️ INVESTIGATION NOTES
                  </h4>
                  {detectiveResults.map((r, i) => (
                    <p key={i} style={{ fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'var(--noir-gold)' }}>{r.targetName}</span>
                      {' — '}
                      <span style={{ color: r.isMafia ? 'var(--noir-red)' : '#00ff88' }}>
                        {r.isMafia ? '🔴 MAFIA' : '✅ INNOCENT'}
                      </span>
                    </p>
                  ))}
                </div>
              )}

              {/* Mafia team visibility */}
              {myRole === 'mafia' && myMafiaTeam.length > 1 && (
                <div style={{ flexShrink: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4, border: '1px solid rgba(255, 0, 0, 0.2)' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', color: 'var(--noir-red)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                    🕶️ YOUR SYNDICATE
                  </h4>
                  <div className="flex flex-col gap-2">
                    {myMafiaTeam.map((m) => {
                      const pub = players.find((p) => p.id === m.id);
                      const memberHeadshot = m.avatar?.url ? getHeadshotUrl(m.avatar.url) : '';
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {memberHeadshot
                            ? <img src={memberHeadshot} alt={m.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(m.name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '0.6rem' }}>{getInitials(m.name)}</span>
                            </div>
                          }
                          <p style={{ fontSize: '0.65rem', color: pub?.alive === false ? 'var(--noir-text-dim)' : 'var(--noir-red)' }}>
                            {m.name} {pub?.alive === false ? '(dead)' : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom section (65% height) - Chat */}
            <div
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                border: '1px solid rgba(255,215,0,0.15)',
                overflow: 'hidden',
                background: 'rgba(10,10,10,0.85)',
              }}
            >
              <Chat
                messages={messages}
                myId={myId}
                myRole={myRole}
                alive={isAlive}
                roomCode={roomCode ?? ''}
                onSend={sendChat}
                aliveMafiaCount={myRole === 'mafia' ? mafiaAliveCount : 0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
