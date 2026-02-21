// =============================================================================
// components/RoleRevealScreen.tsx – Among Us-style role reveal at game start
// Shows for ~6 seconds (or until dismissed) after the host starts the game.
// =============================================================================
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Role } from '../types/game';

interface MafiaTeammate {
  id: string;
  name: string;
}

interface RoleRevealScreenProps {
  role: Role;
  mafiaTeam: MafiaTeammate[];
  onDismiss: () => void;
}

const ROLE_DATA: Record<Role, {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  objective: string;
  color: string;
  glowColor: string;
  bgGradient: string;
}> = {
  mafia: {
    icon: '🕶️',
    title: 'GANGSTER',
    subtitle: 'The Syndicate',
    description: 'You are part of the criminal underworld. The city is yours to control.',
    objective: 'Each night, choose a citizen to eliminate. Win when your numbers match the town.',
    color: '#ff2222',
    glowColor: 'rgba(255,0,0,0.6)',
    bgGradient: 'radial-gradient(ellipse at center, #1a0000 0%, #050000 60%, #000 100%)',
  },
  doctor: {
    icon: '💉',
    title: 'DOCTOR',
    subtitle: 'The Underground Medic',
    description: 'You move through the shadows with a needle and steady hands.',
    objective: "Each night, choose one player to protect — including yourself. If the mafia targets them, they survive.",
    color: '#00e676',
    glowColor: 'rgba(0,230,118,0.6)',
    bgGradient: 'radial-gradient(ellipse at center, #001a0a 0%, #000a05 60%, #000 100%)',
  },
  detective: {
    icon: '🕵️',
    title: 'DETECTIVE',
    subtitle: 'The Private Eye',
    description: "You see through lies. The city's secrets are yours to uncover.",
    objective: 'Each night, investigate one player. You will learn if they are in the mafia.',
    color: '#00b8d9',
    glowColor: 'rgba(0,184,217,0.6)',
    bgGradient: 'radial-gradient(ellipse at center, #00101a 0%, #000508 60%, #000 100%)',
  },
  citizen: {
    icon: '👤',
    title: 'CITIZEN',
    subtitle: 'The Ordinary Folk',
    description: 'You are an honest resident of this corrupt city — a rare thing.',
    objective: 'Use the day phase to discuss, accuse, and vote out the mafia. You have no night action.',
    color: '#ffd700',
    glowColor: 'rgba(255,215,0,0.4)',
    bgGradient: 'radial-gradient(ellipse at center, #1a1400 0%, #080600 60%, #000 100%)',
  },
};

const AUTO_DISMISS_MS = 7000;

export function RoleRevealScreen({ role, mafiaTeam, onDismiss }: RoleRevealScreenProps) {
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState(0);
  const data = ROLE_DATA[role];

  // Flip card after 1.2s
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Progress bar + auto dismiss
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / AUTO_DISMISS_MS, 1));
      if (elapsed >= AUTO_DISMISS_MS) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onDismiss]);

  const isMafia = role === 'mafia';
  const teammates = mafiaTeam.filter((m) => true); // all teammates including self

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: data.bgGradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={flipped ? onDismiss : undefined}
    >
      {/* Animated background rings */}
      {[1.4, 1.8, 2.4].map((scale, i) => (
        <motion.div
          key={scale}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.15, 0], scale }}
          transition={{ delay: 0.3 + i * 0.25, duration: 2.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: `2px solid ${data.color}`,
            boxShadow: `0 0 30px ${data.glowColor}`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* "Your role is..." banner */}
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.8rem',
          letterSpacing: '0.3em',
          color: 'var(--noir-text-dim)',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}
      >
        Your role has been assigned
      </motion.p>

      {/* 3D Flip Card */}
      <div style={{ perspective: 1000, marginBottom: '2rem' }}>
        <motion.div
          animate={{ rotateY: flipped ? 0 : 180 }}
          initial={{ rotateY: 180 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            width: 260,
            height: 360,
            transformStyle: 'preserve-3d',
            position: 'relative',
          }}
        >
          {/* Card back (shown before flip) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #111 0%, #1a1a1a 50%, #111 100%)',
              border: '2px solid rgba(255,215,0,0.3)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🃏</div>
              <p style={{
                fontFamily: 'var(--font-display)',
                color: 'rgba(255,215,0,0.4)',
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
              }}>
                WHO LIES TONIGHT?
              </p>
            </div>
          </div>

          {/* Card front (shown after flip) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              background: `linear-gradient(160deg, ${data.color}18 0%, #0a0a0a 40%, #050505 100%)`,
              border: `2px solid ${data.color}`,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem 1.25rem',
              boxShadow: `0 20px 60px rgba(0,0,0,0.9), 0 0 40px ${data.glowColor}`,
              gap: '0.75rem',
            }}
          >
            {/* Role icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={flipped ? { scale: 1, rotate: [0, -10, 10, 0] } : { scale: 0 }}
              transition={{ delay: 0.3, type: 'spring', damping: 10 }}
              style={{
                fontSize: '5rem',
                lineHeight: 1,
                filter: `drop-shadow(0 0 20px ${data.glowColor})`,
              }}
            >
              {data.icon}
            </motion.div>

            {/* Role title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={flipped ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ delay: 0.5 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                letterSpacing: '0.12em',
                color: data.color,
                textShadow: `0 0 20px ${data.glowColor}`,
                lineHeight: 1,
                textTransform: 'uppercase',
              }}>
                {data.title}
              </p>
              <p style={{
                fontFamily: 'var(--font-typewriter)',
                fontSize: '0.7rem',
                color: 'var(--noir-text-dim)',
                letterSpacing: '0.15em',
                marginTop: '0.25rem',
              }}>
                {data.subtitle}
              </p>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={flipped ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              style={{
                width: '100%',
                height: 1,
                background: `linear-gradient(90deg, transparent, ${data.color}, transparent)`,
              }}
            />

            {/* Objective */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={flipped ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.7 }}
              style={{
                fontSize: '0.72rem',
                color: 'var(--noir-text)',
                textAlign: 'center',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              {data.objective}
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Mafia team reveal */}
      <AnimatePresence>
        {flipped && isMafia && teammates.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            style={{
              background: 'rgba(60,0,0,0.6)',
              border: '1px solid rgba(255,0,0,0.4)',
              borderRadius: 8,
              padding: '0.75rem 1.25rem',
              textAlign: 'center',
              marginBottom: '1rem',
              backdropFilter: 'blur(4px)',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              color: '#ff4444',
              marginBottom: '0.5rem',
            }}>
              YOUR SYNDICATE
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {teammates.map((m) => (
                <div key={m.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem' }}>🕶️</div>
                  <p style={{ fontSize: '0.75rem', color: '#ff6666', fontWeight: 600 }}>{m.name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar + dismiss hint */}
      {flipped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{ textAlign: 'center', width: '100%', maxWidth: 280 }}
        >
          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: 2,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
            marginBottom: '0.75rem',
            overflow: 'hidden',
          }}>
            <motion.div
              style={{
                height: '100%',
                background: data.color,
                width: `${(1 - progress) * 100}%`,
                boxShadow: `0 0 6px ${data.color}`,
              }}
            />
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            color: 'var(--noir-text-dim)',
          }}>
            CLICK ANYWHERE TO CONTINUE
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
