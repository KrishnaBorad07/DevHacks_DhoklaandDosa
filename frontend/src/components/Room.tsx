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
        minHeight: '100dvh',
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
          onPlayAgain={() => roomCode && playAgain(roomCode)}
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
        <div>
          <p style={{ fontSize: '0.6rem', color: 'var(--noir-text-dim)', letterSpacing: '0.15em', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
            Room Code
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.25em', color: 'var(--noir-gold)', textShadow: 'var(--shadow-gold)' }}>
            {roomCode}
          </p>
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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            gap: '1.5rem',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ width: '100%', maxWidth: 520, padding: '1.5rem' }}
          >
            <h2 className="heading-gold text-center" style={{ fontSize: '1.1rem', marginBottom: '1.25rem', letterSpacing: '0.12em' }}>
              👥 SYNDICATE ROSTER
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
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

          {/* Lobby chat */}
          <div style={{ width: '100%', maxWidth: 520 }}>
            <Chat
              messages={messages}
              myId={myId}
              myRole={myRole}
              alive={true}
              roomCode={roomCode ?? ''}
              onSend={sendChat}
              aliveMafiaCount={0}
            />
          </div>
        </div>
      )}

      {/* ── Active game layout ─────────────────────────────────────────────── */}
      {phase !== 'lobby' && !gameEnd && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.55fr) minmax(320px, 400px)',
            gridTemplateRows: 'auto 1fr',
            gap: '0.75rem',
            padding: '0.75rem',
            maxWidth: 1480,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* ── LEFT: Table + Narrator + Night actions ──────────────────── */}
          <div
            style={{
              gridRow: '1 / 3',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Round/phase info */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0',
              }}
            >
              <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                {players.filter((p) => p.alive).length} players alive
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem' }}>
                  {phase === 'night' && '🌙 Night Phase'}
                  {phase === 'day' && '☀️ Discussion'}
                  {phase === 'vote' && '⚖️ Voting'}
                </p>
                {phase === 'day' && isHost && (
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
                    }}
                    onClick={() => roomCode && skipDiscussion(roomCode)}
                  >
                    ⏭ SKIP TO VOTE
                  </motion.button>
                )}
              </div>
            </div>

            {/* Round table */}
            {players.length > 0 && (
              <TableScene
                players={players}
                myId={myId}
                myRole={myRole}
                voteTally={voteTally}
                phase={phase}
                onPlayerClick={phase === 'vote' && isAlive ? handleVote : undefined}
                showLabels={!showRoleReveal && !cutscene}
              />
            )}

            {/* Narrator box (day start) */}
            {(phase === 'day' || phase === 'vote') && narratorText && (
              <div style={{ width: '100%', maxWidth: 520 }}>
                <NarratorBox
                  text={narratorText}
                  outcome={narratorOutcome}
                  onDone={clearNarrator}
                />
              </div>
            )}

            {/* Detective results history */}
            {myRole === 'detective' && detectiveResults.length > 0 && (
              <div
                className="glass-card"
                style={{ width: '100%', maxWidth: 520, padding: '0.75rem' }}
              >
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--noir-neon-blue)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                  🕵️ YOUR INVESTIGATION NOTES
                </h4>
                {detectiveResults.map((r, i) => (
                  <p key={i} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
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
              <div
                className="glass-card"
                style={{
                  width: '100%',
                  maxWidth: 520,
                  padding: '0.75rem',
                  border: '1px solid rgba(255,0,0,0.3)',
                }}
              >
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--noir-red)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                  🕶️ YOUR SYNDICATE
                </h4>
                <div className="flex gap-2">
                  {myMafiaTeam.map((m) => {
                    const pub = players.find((p) => p.id === m.id);
                    const memberHeadshot = m.avatar?.url ? getHeadshotUrl(m.avatar.url) : '';
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {memberHeadshot
                          ? <img src={memberHeadshot} alt={m.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(m.name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '0.8rem' }}>{getInitials(m.name)}</span>
                          </div>
                        }
                        <p style={{ fontSize: '0.7rem', color: pub?.alive === false ? 'var(--noir-text-dim)' : 'var(--noir-red)' }}>
                          {m.name} {pub?.alive === false ? '(dead)' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Action panels + Chat ──────────────────────────────── */}
          <div
            style={{
              gridRow: '1 / 3',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              overflowY: 'auto',
            }}
          >
            {/* Night action modal */}
            {phase === 'night' && myRole && roomCode && (
              <div>
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
              <div className="glass-card" style={{ padding: '1rem' }}>
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

            {/* Chat */}
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
      )}
    </div>
  );
}
