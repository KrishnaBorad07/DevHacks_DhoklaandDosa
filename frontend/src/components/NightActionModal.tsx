// =============================================================================
// components/NightActionModal.tsx – Role-specific night action UI
// =============================================================================
import { motion, AnimatePresence } from 'framer-motion';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { PublicPlayer, Role } from '../types/game';

interface NightActionModalProps {
  myRole: Role;
  myId: string;
  players: PublicPlayer[];
  submitted: boolean;
  roomCode: string;
  onSubmit: (code: string, action: 'kill' | 'save' | 'investigate', targetId: string) => void;
}

const ROLE_CONFIG: Record<
  'mafia' | 'doctor' | 'detective',
  { label: string; action: 'kill' | 'save' | 'investigate'; description: string; buttonClass: string; icon: string }
> = {
  mafia: {
    label: 'Choose Your Target',
    action: 'kill',
    description: 'Select a citizen to eliminate tonight. The syndicate has spoken.',
    buttonClass: 'btn-filled-red',
    icon: '🔫',
  },
  doctor: {
    label: 'Choose Who to Protect',
    action: 'save',
    description: 'Select a player to shelter from the mob tonight. You can protect yourself.',
    buttonClass: 'btn-filled-gold',
    icon: '💉',
  },
  detective: {
    label: 'Choose Who to Investigate',
    action: 'investigate',
    description: 'Choose a suspect. You will learn if they are in the mafia.',
    buttonClass: 'btn-gold',
    icon: '🕵️',
  },
};

function PlayerAvatar({ player, size = 48 }: { player: PublicPlayer; size?: number }) {
  const hs = player.avatar?.url ? getHeadshotUrl(player.avatar.url) : '';
  if (hs) {
    return (
      <img
        src={hs}
        alt={player.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarColor(player.name),
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: size * 0.35 }}>
        {getInitials(player.name)}
      </span>
    </div>
  );
}

export function NightActionModal({
  myRole,
  myId,
  players,
  submitted,
  roomCode,
  onSubmit,
}: NightActionModalProps) {
  // Citizens and spectators have no night action
  if (myRole === 'citizen' || submitted) {
    if (submitted) return null; // No UI after submitting — silently wait
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-6 text-center"
        style={{ maxWidth: 400, margin: '0 auto' }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌙</div>
        <h3 className="heading-gold" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Rest, Citizen
        </h3>
        <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.82rem' }}>
          Only the specialists move in the night. Lie low and wait for dawn.
        </p>
      </motion.div>
    );
  }

  const config = ROLE_CONFIG[myRole as 'mafia' | 'doctor' | 'detective'];
  if (!config) return null;

  const validTargets = players.filter((p) => {
    if (!p.alive) return false;
    if (myRole === 'mafia' && p.id === myId) return false;
    return true;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card"
        style={{
          maxWidth: 440,
          margin: '0 auto',
          overflow: 'hidden',
          border: `1px solid ${myRole === 'mafia' ? 'var(--noir-red)' : 'var(--noir-gold)'}`,
          boxShadow: myRole === 'mafia' ? 'var(--shadow-red)' : 'var(--shadow-gold)',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: myRole === 'mafia' ? 'rgba(200,0,0,0.2)' : 'rgba(255,215,0,0.1)',
            padding: '0.75rem 1.25rem',
            borderBottom: `1px solid ${myRole === 'mafia' ? 'rgba(255,0,0,0.3)' : 'rgba(255,215,0,0.2)'}`,
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              letterSpacing: '0.12em',
              color: myRole === 'mafia' ? 'var(--noir-red)' : 'var(--noir-gold)',
            }}
          >
            {config.icon} {config.label}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--noir-text-dim)', marginTop: '0.25rem' }}>
            {config.description}
          </p>
        </div>

        {/* Player list */}
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 320, overflowY: 'auto' }}>
          {validTargets.map((player) => (
            <motion.button
              key={player.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSubmit(roomCode, config.action, player.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(26,26,26,0.8)',
                border: '1px solid rgba(255,215,0,0.12)',
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = myRole === 'mafia' ? 'var(--noir-red)' : 'var(--noir-gold)';
                e.currentTarget.style.background = 'rgba(40,30,20,0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,215,0,0.12)';
                e.currentTarget.style.background = 'rgba(26,26,26,0.8)';
              }}
            >
              <PlayerAvatar player={player} size={48} />
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--noir-text)', letterSpacing: '0.06em' }}>
                  {player.name}
                  {player.id === myId && (
                    <span style={{ color: 'var(--noir-gold)', marginLeft: '0.4rem', fontSize: '0.65rem' }}>(you)</span>
                  )}
                </p>
                {!player.connected && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--noir-red)' }}>disconnected</p>
                )}
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '1.2rem', opacity: 0.5 }}>
                {config.icon}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
