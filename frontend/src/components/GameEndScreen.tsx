// =============================================================================
// components/GameEndScreen.tsx – Win/lose reveal screen – INTENSE DARK NOIR
// =============================================================================
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import type { GameEndPayload, Role } from '../types/game';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';

interface GameEndScreenProps {
  data: GameEndPayload;
  players: import('../types/game').PublicPlayer[];
  myId: string | null;
  roomCode: string;
  onPlayAgain: () => void;
  onLeave?: () => void;
  isHost?: boolean;
}

interface LeaderboardEntry {
  player_name: string;
  total_score: number;
  games_won: number;
  games_played: number;
}

const ROLE_LABELS: Record<Role, string> = {
  mafia: 'GANGSTER',
  doctor: 'DOCTOR',
  detective: 'DETECTIVE',
  citizen: 'CITIZEN',
};

const ROLE_COLORS: Record<Role, string> = {
  mafia: 'var(--noir-red)',
  doctor: '#00ff88',
  detective: 'var(--noir-neon-blue)',
  citizen: '#ffffff',
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

export function GameEndScreen({ data, players, myId, roomCode, onPlayAgain, onLeave, isHost }: GameEndScreenProps) {
  const isMafiaWin = data.winner === 'mafia';
  const themeColor = isMafiaWin ? 'var(--noir-red)' : 'var(--noir-gold)';

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const myName = useMemo(() => (myId ? playerMap.get(myId)?.name ?? null : null), [myId, playerMap]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${BACKEND_URL}/leaderboard?room=${encodeURIComponent(roomCode)}`)
        .then((r) => r.json())
        .then((data) => {
          setLeaderboard(data);
          setLbLoading(false);
        })
        .catch(() => setLbLoading(false));
    }, 1500);
    return () => clearTimeout(timer);
  }, [roomCode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
        overflowY: 'auto',
        overflowX: 'hidden',
        color: '#fff',
      }}
    >
      <style>{`
        @keyframes bloodDrip {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes noirGlitch {
          0% { transform: translate(0); }
          2% { transform: translate(-5px, 2px); filter: brightness(1.5); }
          4% { transform: translate(5px, -2px); filter: contrast(2); }
          6% { transform: translate(0); }
          100% { transform: translate(0); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.02); }
          20% { transform: scale(1); }
          30% { transform: scale(1.02); }
        }
        .blood-stream {
          position: fixed;
          top: 0;
          width: 2px;
          background: linear-gradient(to bottom, #7a0000, #ff0000);
          box-shadow: 0 0 10px #ff0000;
          animation: bloodDrip 4s linear infinite;
          z-index: 1;
          pointer-events: none;
        }
        .big-red-button {
          background: #ff0000 !important;
          color: #000 !important;
          font-weight: 900 !important;
          letter-spacing: 0.2em !important;
          border: 4px solid #fff !important;
          box-shadow: 0 0 40px #ff0000, 0 0 80px rgba(255,0,0,0.4) !important;
          text-transform: uppercase !important;
          padding: 1.5rem 4rem !important;
          font-size: 1.4rem !important;
          cursor: pointer;
          transition: all 0.2s;
        }
        .big-red-button:hover {
          transform: scale(1.05) rotate(1deg);
          box-shadow: 0 0 60px #ff0000, 0 0 100px rgba(255,0,0,0.6) !important;
        }
      `}</style>

      {/* ── Background Effects ─────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Heartbeat pulse overlay */}
        <motion.div
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
          style={{ position: 'absolute', inset: 0, background: isMafiaWin ? '#ff0000' : '#ffd700', zIndex: 1 }}
        />

        {/* Deep radial gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 40%, ${isMafiaWin ? 'rgba(150,0,0,0.3)' : 'rgba(150,120,0,0.2)'} 0%, #000 70%)`
        }} />

        {/* Blood Drips */}
        {[15, 45, 75, 90].map((left, i) => (
          <div key={i} className="blood-stream" style={{ left: `${left}%`, animationDelay: `${i * 1.2}s`, height: '120px' }} />
        ))}

        {/* Heavy rim vignette */}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 400px #000' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '6rem 1.5rem 8rem' }}>

        {/* ── Hero Title Section ──────────────────────────────────────────── */}
        <motion.div
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ textAlign: 'center', marginBottom: '6rem' }}
        >
          <motion.h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4rem, 15vw, 10rem)',
              lineHeight: 0.85,
              textTransform: 'uppercase',
              letterSpacing: '-0.04em',
              color: themeColor,
              marginBottom: '1.5rem',
              whiteSpace: 'pre-line',
              animation: 'noirGlitch 6s infinite',
              filter: `drop-shadow(0 0 30px ${themeColor}aa)`,
              fontWeight: 900
            }}
          >
            {isMafiaWin ? 'SYNDICATE\nWINS' : 'JUSTICE\nPREVAILS'}
          </motion.h1>

          <p style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '1.2rem',
            opacity: 0.8,
            maxWidth: 700,
            margin: '0 auto',
            letterSpacing: '0.1em',
            lineHeight: 1.8,
            color: '#fff',
            textTransform: 'uppercase'
          }}>
            {isMafiaWin
              ? "The crime lords have seized total control. The streets run crimson under the cold neon moon."
              : "The purge is complete. The rats have been exterminated from the shadows... for now."
            }
          </p>
        </motion.div>

        {/* ── Two Column Reveal & Leaderboard ──────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '4rem',
          alignItems: 'start'
        }}>

          {/* LEFT: Role Reveal Dossiers */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: themeColor,
              marginBottom: '2.5rem',
              textAlign: 'center',
              fontWeight: 800
            }}>
              CONFIDENTIAL RECORDS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              {data.roles.map((roleEntry, i) => {
                const pub = playerMap.get(roleEntry.id);
                const headshot = pub?.avatar?.url ? getHeadshotUrl(pub.avatar.url) : null;
                const isMe = roleEntry.id === myId;

                return (
                  <motion.div
                    key={roleEntry.id}
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    style={{
                      background: isMe ? 'rgba(255,255,255,0.05)' : 'rgba(10,10,10,0.9)',
                      border: `2px solid ${isMe ? themeColor : 'rgba(255,255,255,0.1)'}`,
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                      background: ROLE_COLORS[roleEntry.role],
                      boxShadow: `0 0 15px ${ROLE_COLORS[roleEntry.role]}`
                    }} />

                    <div style={{
                      width: 64, height: 64, borderRadius: 4, overflow: 'hidden',
                      background: '#111', flexShrink: 0,
                      border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                      {headshot ? (
                        <img src={headshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: getAvatarColor(roleEntry.name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 900 }}>{getInitials(roleEntry.name)}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.2rem',
                        color: isMe ? themeColor : '#fff',
                        margin: 0,
                        fontWeight: 900,
                        letterSpacing: '0.05em'
                      }}>
                        {roleEntry.name}
                        {isMe && <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: 10 }}>[ SUBJECT ]</span>}
                      </p>
                      <p style={{
                        fontSize: '0.8rem',
                        letterSpacing: '0.3em',
                        color: ROLE_COLORS[roleEntry.role],
                        margin: '0.2rem 0 0',
                        fontWeight: 900
                      }}>
                        {ROLE_LABELS[roleEntry.role]}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Amazing Leaderboard */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              color: themeColor,
              marginBottom: '2.5rem',
              textAlign: 'center',
              fontWeight: 800
            }}>
              KILLER STANDINGS
            </h2>

            <div style={{
              background: 'rgba(5,5,5,0.8)',
              padding: '2rem',
              border: '2px solid rgba(255,255,255,0.05)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              {lbLoading ? (
                <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 40, height: 40, border: '4px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {leaderboard.map((entry, idx) => {
                    const isMyRow = myName && entry.player_name.toLowerCase() === myName.toLowerCase();
                    const isTop3 = idx < 3;
                    const rankColor = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'rgba(255,255,255,0.4)';

                    return (
                      <motion.div
                        key={entry.player_name + idx}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 + idx * 0.05 }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '4rem 1fr 6rem',
                          alignItems: 'center',
                          padding: isTop3 ? '1.5rem 0' : '0.75rem 0',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          background: isMyRow ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }}
                      >
                        {/* Rank Number */}
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: isTop3 ? '3.5rem' : '1.8rem',
                          color: rankColor,
                          fontWeight: 900,
                          textAlign: 'center',
                          lineHeight: 1,
                          textShadow: isTop3 ? `0 0 20px ${rankColor}66` : 'none'
                        }}>
                          {idx + 1}
                        </div>

                        {/* Name & Stats */}
                        <div style={{ paddingLeft: '2rem' }}>
                          <p style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: isTop3 ? '1.6rem' : '1.1rem',
                            color: isMyRow ? 'var(--noir-gold)' : '#fff',
                            margin: 0,
                            fontWeight: 800,
                            letterSpacing: '0.05em'
                          }}>
                            {entry.player_name}
                            {isMyRow && <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 12 }}>YOU</span>}
                          </p>
                          <div style={{ display: 'flex', gap: '1.2rem', opacity: 0.6, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            <span>WON: {entry.games_won}</span>
                            <span>TOTAL: {entry.games_played}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-typewriter)',
                          fontSize: isTop3 ? '2.2rem' : '1.4rem',
                          color: isTop3 ? '#fff' : 'rgba(255,255,255,0.5)',
                          fontWeight: 900
                        }}>
                          {entry.total_score}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer Actions ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          style={{
            marginTop: '8rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3rem'
          }}
        >
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="big-red-button"
            >
              RUN NEW OPERATION
            </button>
          ) : (
            <div style={{
              fontFamily: 'var(--font-typewriter)',
              color: 'var(--noir-text-dim)',
              fontSize: '1.2rem',
              letterSpacing: '0.3em',
              fontWeight: 900,
              textAlign: 'center',
              animation: 'flicker 2s infinite'
            }}>
              WAITING FOR THE BOSS...
            </div>
          )}

          {onLeave && (
            <button
              onClick={onLeave}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--noir-red)',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                letterSpacing: '0.4em',
                cursor: 'pointer',
                opacity: 0.5,
                padding: '1rem',
                transition: 'all 0.4s',
                fontWeight: 900,
                textDecoration: 'underline'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.letterSpacing = '0.5em';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.5';
                e.currentTarget.style.letterSpacing = '0.4em';
                e.currentTarget.style.color = 'var(--noir-red)';
              }}
            >
              EXIT THE CITY
            </button>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
}
