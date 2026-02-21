// =============================================================================
// components/GameEndScreen.tsx – Win/lose reveal screen
// =============================================================================
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { GameEndPayload } from '../types/game';
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

const ROLE_LABELS: Record<string, string> = {
  mafia: '🕶️ Gangster (Mafia)',
  doctor: '💉 Doctor',
  detective: '🕵️ Detective',
  citizen: '👤 Citizen',
};

const ROLE_COLORS: Record<string, string> = {
  mafia: 'var(--noir-red)',
  doctor: '#00ff88',
  detective: 'var(--noir-neon-blue)',
  citizen: 'var(--noir-text)',
};

const MEDALS = ['🥇', '🥈', '🥉'];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

export function GameEndScreen({ data, players, myId, roomCode, onPlayAgain, onLeave, isHost }: GameEndScreenProps) {
  const isMafiaWin = data.winner === 'mafia';
  const accentColor = isMafiaWin ? 'var(--noir-red)' : 'var(--noir-gold)';
  const accentShadow = isMafiaWin ? 'var(--shadow-red)' : 'var(--shadow-gold)';

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Current player's name (for highlighting in leaderboard)
  const myName = myId ? playerMap.get(myId)?.name ?? null : null;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    // Small delay so Supabase has time to commit the scores for this game
    const timer = setTimeout(() => {
      fetch(`${BACKEND_URL}/leaderboard?room=${encodeURIComponent(roomCode)}`)
        .then((r) => r.json())
        .then((data) => {
          setLeaderboard(data);
          setLbLoading(false);
        })
        .catch(() => setLbLoading(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.95)',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: 780, width: '100%', margin: '0 auto' }}>
        {/* Winner banner */}
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          <motion.div
            animate={{ rotate: [0, -3, 3, -3, 0] }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ fontSize: '4rem', marginBottom: '1rem' }}
          >
            {isMafiaWin ? '🕶️' : '⚖️'}
          </motion.div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 8vw, 4rem)',
              color: accentColor,
              textShadow: accentShadow,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              lineHeight: 1.1,
            }}
          >
            {isMafiaWin ? 'The Syndicate Wins' : 'Justice Prevails'}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-typewriter)',
              color: 'var(--noir-text-dim)',
              marginTop: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            {isMafiaWin
              ? 'The mob has swallowed the city. Another night of crime.'
              : "All the gangsters are behind bars. The city breathes again... for now."}
          </p>
        </motion.div>

        {/* Role reveal */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--noir-gold)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            The Truth Revealed
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {data.roles.map((roleEntry, i) => {
              const pub = playerMap.get(roleEntry.id);
              const headshotUrl = pub?.avatar?.url ? getHeadshotUrl(pub.avatar.url) : '';
              const isMe = roleEntry.id === myId;
              return (
                <motion.div
                  key={roleEntry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.6rem',
                    background: 'rgba(20,20,20,0.9)',
                    border: `1px solid ${isMe ? 'var(--noir-gold)' : 'rgba(255,215,0,0.12)'}`,
                    borderRadius: 4,
                    boxShadow: isMe ? 'var(--shadow-gold)' : 'none',
                  }}
                >
                  {headshotUrl ? (
                    <img
                      src={headshotUrl}
                      alt={roleEntry.name}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `1px solid ${isMe ? 'var(--noir-gold)' : 'rgba(255,215,0,0.25)'}`,
                        background: '#111',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: getAvatarColor(pub?.name ?? roleEntry.name),
                        border: `1px solid ${isMe ? 'var(--noir-gold)' : 'rgba(255,215,0,0.25)'}`,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: '0.95rem' }}>
                        {getInitials(pub?.name ?? roleEntry.name)}
                      </span>
                    </div>
                  )}
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.65rem',
                      color: 'var(--noir-gold)',
                      textAlign: 'center',
                    }}
                  >
                    {roleEntry.name}
                    {isMe && ' ⭐'}
                  </p>
                  <p
                    style={{
                      fontSize: '0.6rem',
                      color: ROLE_COLORS[roleEntry.role],
                      textAlign: 'center',
                    }}
                  >
                    {ROLE_LABELS[roleEntry.role]}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Leaderboard ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
          style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--noir-gold)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            🏆 Room Leaderboard
          </h3>

          {lbLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--noir-text-dim)', fontSize: '0.8rem', padding: '1rem 0', fontStyle: 'italic' }}>
              Tallying scores...
            </p>
          ) : leaderboard.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--noir-text-dim)', fontSize: '0.8rem', padding: '1rem 0', fontStyle: 'italic' }}>
              No scores yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr 4rem 4rem 4rem',
                gap: '0.5rem',
                padding: '0 0.75rem 0.5rem',
                borderBottom: '1px solid rgba(255,215,0,0.15)',
              }}>
                {['', 'Player', 'Score', 'Won', 'Games'].map((h) => (
                  <span key={h} style={{ fontSize: '0.6rem', color: 'var(--noir-text-dim)', letterSpacing: '0.12em', fontFamily: 'var(--font-display)', textTransform: 'uppercase', textAlign: h === '' ? 'left' : 'right' }}>
                    {h}
                  </span>
                ))}
              </div>

              <div style={{ maxHeight: '16rem', overflowY: 'auto' }}>
                {leaderboard.map((entry, idx) => {
                  const isMyRow = myName && entry.player_name.toLowerCase() === myName.toLowerCase();
                  return (
                    <motion.div
                      key={entry.player_name + idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2rem 1fr 4rem 4rem 4rem',
                        gap: '0.5rem',
                        alignItems: 'center',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 3,
                        background: isMyRow
                          ? 'rgba(255,215,0,0.08)'
                          : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        border: isMyRow ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: '1rem', textAlign: 'center' }}>
                        {MEDALS[idx] ?? `${idx + 1}`}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.82rem',
                        color: isMyRow ? 'var(--noir-gold)' : 'var(--noir-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.player_name}
                        {isMyRow && <span style={{ color: 'var(--noir-text-dim)', fontSize: '0.65rem', marginLeft: 6 }}>(you)</span>}
                      </span>
                      <span style={{ fontSize: '0.88rem', color: 'var(--noir-gold)', fontWeight: 700, textAlign: 'right' }}>
                        {entry.total_score}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#00ff88', textAlign: 'right' }}>
                        {entry.games_won}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--noir-text-dim)', textAlign: 'right' }}>
                        {entry.games_played}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 justify-center" style={{ flexWrap: 'wrap' }}>
          {isHost ? (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="btn-noir btn-filled-gold"
              style={{ fontSize: '0.85rem', padding: '0.8rem 2rem' }}
              onClick={onPlayAgain}
            >
              ↻ PLAY AGAIN
            </motion.button>
          ) : (
            <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.8rem 0' }}>
              Waiting for host to start a new round...
            </p>
          )}
          {onLeave && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="btn-noir btn-red"
              style={{ fontSize: '0.75rem', padding: '0.6rem 1.5rem' }}
              onClick={onLeave}
            >
              ✕ LEAVE ROOM
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
