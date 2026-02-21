// =============================================================================
// components/CutscenePlayer.tsx – 4 cinematic cutscene variations
// Film-noir style using CSS animations + Framer Motion sequencing
// =============================================================================
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderAvatarSVG } from '../lib/avatarConfig';
import type { CutscenePayload, CutsceneVariant } from '../types/game';

interface CutscenePlayerProps {
  cutscene: CutscenePayload;
  onComplete: () => void;
}

/** Black silhouette SVG for anonymized Mafia / Doctor characters */
const SILHOUETTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="100%" height="100%">
  <rect x="16" y="60" width="48" height="40" rx="3" fill="#0a0a0a"/>
  <rect x="12" y="55" width="56" height="10" rx="2" fill="#0a0a0a"/>
  <ellipse cx="40" cy="38" rx="22" ry="25" fill="#0a0a0a"/>
  <ellipse cx="40" cy="18" rx="26" ry="10" fill="#050505"/>
  <rect x="18" y="10" width="44" height="14" rx="5" fill="#080808"/>
  <rect x="14" y="22" width="52" height="5" rx="1" fill="#0d0d0d"/>
</svg>`;

const DOCTOR_SILHOUETTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="100%" height="100%">
  <rect x="16" y="60" width="48" height="40" rx="3" fill="#003820"/>
  <ellipse cx="40" cy="38" rx="22" ry="25" fill="#004a28"/>
  <ellipse cx="40" cy="20" rx="18" ry="14" fill="#003820"/>
  <rect x="34" y="58" width="12" height="20" fill="#00ff88" opacity="0.4"/>
  <rect x="30" y="64" width="20" height="4" rx="2" fill="#00ff88" opacity="0.6"/>
</svg>`;

// Cutscene scene configs
const SCENE_CONFIGS: Record<CutsceneVariant, { title: string; bg: string; icon: string }> = {
  back_alley: {
    title: 'Back Alley',
    bg: 'linear-gradient(180deg, #000 0%, #050510 40%, #0a0508 100%)',
    icon: '🌧',
  },
  rooftop: {
    title: 'Rooftop Silencer',
    bg: 'linear-gradient(180deg, #020208 0%, #050520 50%, #000 100%)',
    icon: '⚡',
  },
  car_ambush: {
    title: 'Car Ambush',
    bg: 'linear-gradient(180deg, #000 0%, #0a0500 60%, #050000 100%)',
    icon: '🚗',
  },
  neon_club: {
    title: 'Neon Club',
    bg: 'linear-gradient(180deg, #0a0010 0%, #1a0030 50%, #050010 100%)',
    icon: '🎷',
  },
};

// Animation step indices
const STEPS: Record<CutsceneVariant, string[]> = {
  back_alley:   ['establish', 'victim_enter', 'mafia_emerge', 'flash', 'result'],
  rooftop:      ['establish', 'victim_edge', 'mafia_behind', 'flash', 'result'],
  car_ambush:   ['establish', 'victim_walk', 'car_shoot', 'flash', 'result'],
  neon_club:    ['establish', 'victim_bar', 'mafia_approach', 'flash', 'result'],
};

const STEP_DURATION_MS = 1800;

export function CutscenePlayer({ cutscene, onComplete }: CutscenePlayerProps) {
  const { variant, victimAvatar, victimName, saved } = cutscene;
  const [stepIndex, setStepIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [showDoctor, setShowDoctor] = useState(false);
  const [completed, setCompleted] = useState(false);

  const steps = STEPS[variant];
  const config = SCENE_CONFIGS[variant];

  const victimSVG = victimAvatar
    ? renderAvatarSVG(victimAvatar.head, victimAvatar.body, victimAvatar.accessory, victimAvatar.colors, 80)
    : null;

  useEffect(() => {
    setStepIndex(0);
    setShowFlash(false);
    setShowDoctor(false);
    setCompleted(false);
  }, [cutscene]);

  useEffect(() => {
    if (completed) return;

    const timer = setTimeout(() => {
      if (stepIndex < steps.length - 1) {
        // Flash step
        if (steps[stepIndex + 1] === 'flash') {
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 500);
        }
        // Result step – show doctor if saved
        if (steps[stepIndex + 1] === 'result' && saved) {
          setTimeout(() => setShowDoctor(true), 400);
        }
        setStepIndex((s) => s + 1);
      } else {
        setCompleted(true);
      }
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [stepIndex, steps, saved, completed]);

  useEffect(() => {
    if (completed) {
      const t = setTimeout(onComplete, 2200);
      return () => clearTimeout(t);
    }
  }, [completed, onComplete]);

  const currentStep = steps[stepIndex] ?? 'establish';
  const victimFell = stepIndex >= steps.indexOf('flash');
  const victimDead = victimFell && !saved;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: config.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Film-grain overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Neon rain lines (variant-specific) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: variant === 'neon_club' ? 0 : 0.6,
        }}
      >
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${i * 5}%`,
              top: -20,
              width: 1,
              height: '30%',
              background: 'rgba(0,212,255,0.15)',
              animation: `rain-fall ${0.3 + Math.random() * 0.4}s linear infinite`,
              animationDelay: `${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Neon club pulsing lights */}
      {variant === 'neon_club' && (
        <>
          {['#9b00ff', '#ff0066', '#00d4ff'].map((color, i) => (
            <motion.div
              key={color}
              animate={{ opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 0.8 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at ${20 + i * 30}% 50%, ${color}22 0%, transparent 60%)`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </>
      )}

      {/* Scene title */}
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.25em',
          color: 'var(--noir-gold)',
          textTransform: 'uppercase',
          opacity: 0.7,
        }}
      >
        {config.icon} SCENE: {config.title.toUpperCase()}
      </motion.div>

      {/* Main scene */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          height: 280,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '4rem',
          padding: '0 2rem',
        }}
      >
        {/* Mafia silhouette */}
        <AnimatePresence>
          {stepIndex >= 2 && (
            <motion.div
              key="mafia"
              initial={{
                x: variant === 'car_ambush' ? 0 : -120,
                opacity: 0,
                scale: 0.8,
              }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 18, stiffness: 140 }}
              style={{
                width: 80,
                height: 100,
                filter: 'drop-shadow(0 0 20px rgba(255,0,0,0.6))',
                flexShrink: 0,
              }}
              dangerouslySetInnerHTML={{ __html: SILHOUETTE_SVG }}
            />
          )}
        </AnimatePresence>

        {/* Victim */}
        {victimSVG && (
          <motion.div
            animate={{
              y: victimDead ? 40 : 0,
              rotate: victimDead ? 90 : 0,
              opacity: victimDead ? 0.4 : 1,
              filter: victimDead
                ? 'grayscale(100%) brightness(0.5)'
                : 'none',
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ width: 80, height: 100, flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: victimSVG }}
          />
        )}

        {/* Doctor silhouette (if saved) */}
        <AnimatePresence>
          {showDoctor && (
            <motion.div
              key="doctor"
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 16 }}
              style={{
                width: 80,
                height: 100,
                filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.7))',
                flexShrink: 0,
              }}
              dangerouslySetInnerHTML={{ __html: DOCTOR_SILHOUETTE_SVG }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Muzzle flash / knife flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.8, 0] }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: saved
                ? 'radial-gradient(circle at 50% 60%, rgba(0,255,136,0.5) 0%, transparent 60%)'
                : 'radial-gradient(circle at 50% 60%, rgba(255,200,0,0.7) 0%, rgba(255,0,0,0.4) 40%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Blood splatter (if killed) */}
      <AnimatePresence>
        {victimDead && (
          <motion.div
            key="blood"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.8, 0.5], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              position: 'absolute',
              bottom: '28%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 60,
              height: 30,
              background: 'radial-gradient(ellipse, rgba(200,0,0,0.8) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
        )}
      </AnimatePresence>

      {/* Gold sparks (if saved) */}
      <AnimatePresence>
        {showDoctor && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`spark-${i}`}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos((i / 8) * Math.PI * 2) * 60,
                  y: Math.sin((i / 8) * Math.PI * 2) * 40 - 20,
                  scale: [0, 1.5, 0],
                }}
                transition={{ duration: 0.8, delay: i * 0.04 }}
                style={{
                  position: 'absolute',
                  bottom: '37%',
                  left: '50%',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#ffd700',
                  boxShadow: '0 0 8px #ffd700',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '4rem',
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '1rem',
            color: saved ? '#00ff88' : 'var(--noir-red)',
            letterSpacing: '0.1em',
            textShadow: saved
              ? '0 0 20px rgba(0,255,136,0.8)'
              : 'var(--shadow-red)',
          }}
        >
          {completed
            ? saved
              ? `${victimName ?? 'They'} survived — barely.`
              : `${victimName ?? 'Someone'} has been silenced.`
            : currentStep === 'establish'
            ? 'The hour is late...'
            : currentStep.includes('victim')
            ? `${victimName ?? 'A figure'} walks into the dark...`
            : currentStep.includes('mafia') || currentStep.includes('car')
            ? 'A shadow emerges from the night...'
            : currentStep === 'flash'
            ? '💥'
            : saved
            ? 'The medic arrives in time...'
            : 'Another soul claimed by the city...'}
        </p>
      </motion.div>

      {/* Skip button */}
      <button
        onClick={onComplete}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          background: 'rgba(20,20,20,0.8)',
          border: '1px solid rgba(255,215,0,0.3)',
          color: 'var(--noir-text-dim)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          padding: '0.4rem 0.8rem',
          borderRadius: 2,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        SKIP →
      </button>
    </motion.div>
  );
}
