// =============================================================================
// components/NarratorBox.tsx – 1930s crime-boss narrator with speech bubble
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NightOutcome } from '../types/game';

interface NarratorBoxProps {
  text: string | null;
  outcome: NightOutcome | null;
  onDone?: () => void;
}

/** SVG of the 1930s crime boss narrator */
const NARRATOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100%" height="100%">
  <!-- Pinstripe suit body -->
  <rect x="10" y="72" width="80" height="48" rx="4" fill="#1a1a2e"/>
  <line x1="20" y1="72" x2="20" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <line x1="30" y1="72" x2="30" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <line x1="40" y1="72" x2="40" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <line x1="50" y1="72" x2="50" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <line x1="60" y1="72" x2="60" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <line x1="70" y1="72" x2="70" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <line x1="80" y1="72" x2="80" y2="120" stroke="#ffd700" stroke-width="0.6" opacity="0.4"/>
  <!-- Red tie -->
  <path d="M46 72 L54 72 L52 100 L50 110 L48 100 Z" fill="#cc0000"/>
  <!-- White shirt -->
  <rect x="42" y="72" width="16" height="30" rx="1" fill="#f0e6d3"/>
  <!-- Lapels -->
  <path d="M30 72 L50 85 L30 100 Z" fill="#0d0d1e"/>
  <path d="M70 72 L50 85 L70 100 Z" fill="#0d0d1e"/>
  <!-- Gold pocket watch chain -->
  <path d="M55 88 Q65 90 70 88" stroke="#ffd700" stroke-width="1.5" fill="none"/>
  <circle cx="70" cy="88" r="3" fill="#ffd700"/>
  <!-- Neck -->
  <rect x="42" y="62" width="16" height="14" rx="4" fill="#6b4f3a"/>
  <!-- Head - shadowed face -->
  <ellipse cx="50" cy="45" rx="26" ry="28" fill="#3a2a1a"/>
  <!-- Shadow overlay on face -->
  <ellipse cx="50" cy="40" rx="22" ry="20" fill="#1a0f08" opacity="0.7"/>
  <!-- Glowing red/neon eyes -->
  <ellipse cx="40" cy="42" rx="5" ry="3.5" fill="#ff0000" opacity="0.9"/>
  <ellipse cx="60" cy="42" rx="5" ry="3.5" fill="#ff0000" opacity="0.9"/>
  <ellipse cx="40" cy="42" rx="3" ry="2" fill="#ff4444"/>
  <ellipse cx="60" cy="42" rx="3" ry="2" fill="#ff4444"/>
  <!-- Eye glow rings -->
  <ellipse cx="40" cy="42" rx="7" ry="5" fill="none" stroke="#ff0000" stroke-width="0.8" opacity="0.4"/>
  <ellipse cx="60" cy="42" rx="7" ry="5" fill="none" stroke="#ff0000" stroke-width="0.8" opacity="0.4"/>
  <!-- Slick hair -->
  <ellipse cx="50" cy="20" rx="26" ry="14" fill="#0a0a0a"/>
  <path d="M24 28 Q30 16 50 14 Q70 16 76 28" fill="#0a0a0a"/>
  <path d="M30 22 Q38 14 50 16" stroke="#222" stroke-width="3" fill="none"/>
  <!-- Fedora brim -->
  <ellipse cx="50" cy="22" rx="32" ry="8" fill="#080808"/>
  <!-- Fedora crown -->
  <rect x="24" y="4" width="52" height="20" rx="6" fill="#0d0d0d"/>
  <rect x="26" y="6" width="48" height="8" rx="3" fill="#1a1a1a"/>
  <!-- Gold hatband -->
  <rect x="24" y="20" width="52" height="4" rx="1" fill="#ffd700" opacity="0.8"/>
  <!-- Cigar -->
  <rect x="60" y="54" width="18" height="3" rx="1.5" fill="#c8a050"/>
  <rect x="75" y="54" width="4" height="3" rx="1" fill="#e8602c"/>
  <circle cx="78" cy="55" r="2" fill="#ff6600" opacity="0.8"/>
  <!-- Cigar smoke -->
  <path d="M79 52 Q82 48 80 44 Q78 40 82 36" stroke="#888" stroke-width="1.5" fill="none" opacity="0.4"/>
  <!-- Gold ring -->
  <rect x="16" y="95" width="8" height="4" rx="2" fill="#ffd700" opacity="0.7"/>
  <!-- Gold watch -->
  <circle cx="85" cy="90" r="4" fill="#ffd700" opacity="0.6"/>
</svg>`;

import { generateNarratorAudio } from '../lib/elevenlabs';

export function NarratorBox({ text, outcome, onDone }: NarratorBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIndexRef = useRef(0);

  // Audio playback ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Typewriter and Audio effect
  useEffect(() => {
    // Cleanup any previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (!text) {
      setDisplayedText('');
      setIsDone(false);
      return;
    }

    charIndexRef.current = 0;
    setDisplayedText('');
    setIsDone(false);

    if (intervalRef.current) clearInterval(intervalRef.current);

    // 1. Start typewriter effect
    intervalRef.current = setInterval(() => {
      charIndexRef.current += 1;
      setDisplayedText(text.slice(0, charIndexRef.current));
      if (charIndexRef.current >= text.length) {
        clearInterval(intervalRef.current!);
        setIsDone(true);
      }
    }, 32); // Slightly slower to match speaking pace

    // 2. Fetch and play ElevenLabs audio (async)
    let isMounted = true;
    generateNarratorAudio(text).then((audioUrl) => {
      if (isMounted && audioUrl && !isDone) {
        const audio = new Audio(audioUrl);
        audio.volume = 0.8;
        audio.play().catch(e => console.error("Narrator audio playback blocked:", e));
        audioRef.current = audio;
      }
    });

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [text]);

  // Skip to end on click
  const skipToEnd = () => {
    if (text && !isDone) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayedText(text);
      setIsDone(true);

      // Stop audio immediately if user skips the animation
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  // Outcome accent color
  const outcomeBorderColor
    = outcome === 'killed' ? 'var(--noir-red)'
      : outcome === 'saved' ? '#00ff88'
        : 'var(--noir-gold)';

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, x: -60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          {/* Narrator figure */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{
              width: 90,
              height: 110,
              flexShrink: 0,
              filter: 'drop-shadow(0 0 12px rgba(255,0,0,0.5))',
            }}
            dangerouslySetInnerHTML={{ __html: NARRATOR_SVG }}
          />

          {/* Speech bubble */}
          <div
            onClick={skipToEnd}
            style={{
              flex: 1,
              position: 'relative',
              background: 'rgba(8,8,8,0.95)',
              border: `1px solid ${outcomeBorderColor}`,
              borderRadius: '4px 4px 4px 4px',
              padding: '1rem 1.25rem',
              cursor: isDone ? 'default' : 'pointer',
              boxShadow: `0 0 20px ${outcomeBorderColor}33`,
            }}
          >
            {/* Tail pointing left toward narrator */}
            <div
              style={{
                position: 'absolute',
                left: -10,
                top: 20,
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderRight: `10px solid ${outcomeBorderColor}`,
              }}
            />

            {/* Narrator label */}
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: outcomeBorderColor,
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                opacity: 0.85,
              }}
            >
              THE NARRATOR
            </p>

            {/* Typewriter text */}
            <p className="typewriter-text" style={{ minHeight: '3rem' }}>
              {displayedText}
              {!isDone && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: '1em',
                    background: outcomeBorderColor,
                    marginLeft: 2,
                    animation: 'blink-cursor 0.7s step-end infinite',
                  }}
                />
              )}
            </p>

            {isDone && onDone && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onDone}
                style={{
                  marginTop: '0.75rem',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  color: 'var(--noir-gold)',
                  background: 'transparent',
                  border: '1px solid var(--noir-gold)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 2,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                CONTINUE →
              </motion.button>
            )}

            {!isDone && (
              <p style={{ fontSize: '0.6rem', color: 'var(--noir-text-dim)', marginTop: '0.5rem' }}>
                (click to skip)
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Blink cursor CSS injected once
if (typeof document !== 'undefined' && !document.getElementById('blink-css')) {
  const style = document.createElement('style');
  style.id = 'blink-css';
  style.textContent = `@keyframes blink-cursor { 0%,100%{opacity:1} 50%{opacity:0} }`;
  document.head.appendChild(style);
}
