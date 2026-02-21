// =============================================================================
// components/GameEndScreen.tsx – Win/lose reveal screen
// =============================================================================
import { motion } from 'framer-motion';
import type { GameEndPayload } from '../types/game';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';

interface GameEndScreenProps {
  data: GameEndPayload;
  players: import('../types/game').PublicPlayer[];
  myId: string | null;
  onPlayAgain: () => void;
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

export function GameEndScreen({ data, players, myId, onPlayAgain }: GameEndScreenProps) {
  const isMafiaWin = data.winner === 'mafia';
  const accentColor = isMafiaWin ? 'var(--noir-red)' : 'var(--noir-gold)';
  const accentShadow = isMafiaWin ? 'var(--shadow-red)' : 'var(--shadow-gold)';

  const playerMap = new Map(players.map((p) => [p.id, p]));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.95)',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: 640, width: '100%' }}>
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
                    border: `1px solid ${
                      isMe ? 'var(--noir-gold)' : 'rgba(255,215,0,0.12)'
                    }`,
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

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="btn-noir btn-filled-gold"
            style={{ fontSize: '0.85rem', padding: '0.8rem 2rem' }}
            onClick={onPlayAgain}
          >
            ↻ PLAY AGAIN
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
