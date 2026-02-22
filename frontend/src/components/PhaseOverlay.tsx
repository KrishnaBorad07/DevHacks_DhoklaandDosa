// =============================================================================
// components/PhaseOverlay.tsx – Phase transition banner (non-blocking)
// Redesigned as a floating top-center pill — does NOT cover the game.
// pointerEvents: none throughout so the game is ALWAYS fully interactive.
// =============================================================================
import { motion, AnimatePresence } from 'framer-motion';
import type { Phase } from '../types/game';
import { useEffect, useState } from 'react';

interface PhaseOverlayProps {
  phase: Phase;
  round: number;
}

const PHASE_CONFIG = {
  night: {
    icon: '🌙',
    label: 'NIGHT FALLS',
    sub: (round: number) => `Round ${round} — The city goes dark`,
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.5)',
    bg: 'rgba(0,5,20,0.82)',
  },
  day: {
    icon: '☀️',
    label: 'DAY BREAKS',
    sub: () => 'Who will face the noose today?',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.5)',
    bg: 'rgba(20,15,0,0.82)',
  },
  vote: {
    icon: '⚖️',
    label: 'VOTE NOW',
    sub: () => 'Cast your ballot — the syndicate demands justice',
    color: '#ff4444',
    glow: 'rgba(255,0,0,0.5)',
    bg: 'rgba(20,0,0,0.82)',
  },
} as const;

export function PhaseOverlay({ phase, round }: PhaseOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [displayPhase, setDisplayPhase] = useState<Phase>(phase);
  const [lastPhase, setLastPhase] = useState<Phase>(phase);

  useEffect(() => {
    // When the game resets to lobby (Play Again), reset our tracking so the
    // NEXT real round-1 transition fires correctly — but show nothing now.
    if (phase === 'lobby') {
      setLastPhase('lobby');
      setVisible(false);
      return;
    }

    if (
      phase !== lastPhase &&
      (phase === 'night' || phase === 'day' || phase === 'vote') &&
      round >= 1   // Round 0 only appears during play-again reset — never show it
    ) {
      setLastPhase(phase);
      setDisplayPhase(phase);
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2200);
      return () => clearTimeout(t);
    }
  }, [phase, lastPhase, round]);

  const config = displayPhase in PHASE_CONFIG
    ? PHASE_CONFIG[displayPhase as keyof typeof PHASE_CONFIG]
    : null;

  if (!config) return null;

  return (
    // Outer wrapper: full-screen but completely non-interactive
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        pointerEvents: 'none',       // ← NEVER blocks interaction
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '4.5rem',        // below the top header bar
      }}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={`${displayPhase}-${round}`}
            initial={{ opacity: 0, y: -28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            style={{
              background: config.bg,
              border: `1px solid ${config.color}55`,
              borderRadius: 40,
              padding: '0.55rem 1.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              boxShadow: `0 0 24px ${config.glow}, 0 4px 20px rgba(0,0,0,0.6)`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            {/* Icon */}
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, delay: 0.05 }}
              style={{ fontSize: '1.4rem', lineHeight: 1 }}
            >
              {config.icon}
            </motion.span>

            {/* Text */}
            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.15em',
                  color: config.color,
                  textShadow: `0 0 12px ${config.glow}`,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                }}
              >
                {config.label}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontFamily: 'var(--font-typewriter)',
                  fontSize: '0.62rem',
                  color: 'var(--noir-text-dim)',
                  marginTop: '0.18rem',
                  letterSpacing: '0.08em',
                }}
              >
                {config.sub(round)}
              </motion.p>
            </div>

            {/* Pulsing dot */}
            <motion.div
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: config.color,
                boxShadow: `0 0 8px ${config.color}`,
                flexShrink: 0,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
