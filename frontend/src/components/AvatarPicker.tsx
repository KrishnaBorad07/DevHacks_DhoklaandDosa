// =============================================================================
// components/AvatarPicker.tsx – Ready Player Me 3D avatar creator
// FIXED: RPM modal uses createPortal to escape framer-motion transform context
//        so position:fixed is truly fullscreen.
// =============================================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import { getAvatarId, getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { Avatar } from '../types/game';

export const DEFAULT_AVATAR: Avatar = { url: '' };

// RPM demo subdomain — replace with your own after signing up at readyplayer.me/developers
const RPM_IFRAME_URL =
  'https://demo.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody';

// ── Headshot URL builder ──────────────────────────────────────────────────────
// RPM render API: https://models.readyplayer.me/{id}.png
// Extra params can break the render for demo avatars, so keep it simple.
function buildHeadshotUrl(url: string): string {
  if (!url) return '';
  const id = getAvatarId(url);
  return `https://models.readyplayer.me/${id}.png`;
}

// ── 3D Avatar preview ─────────────────────────────────────────────────────────
function AvatarModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <primitive
      object={scene}
      position={[0, -0.95, 0]}
      scale={1}
      rotation={[0, 0.3, 0]}
    />
  );
}

// ── Fallback initials circle ──────────────────────────────────────────────────
function InitialsFallback({ name, size = 80 }: { name: string; size?: number }) {
  const color = getAvatarColor(name || 'X');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(135deg, ${color}cc, ${color}44)`,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: `0 0 12px ${color}44`,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.32, color: '#fff', letterSpacing: '0.05em', lineHeight: 1 }}>
        {getInitials(name || '??')}
      </span>
    </div>
  );
}

// ── RPM Iframe modal — rendered via createPortal at document.body ─────────────
// This is CRITICAL: framer-motion applies CSS transforms on parent elements
// which create a new "containing block" for position:fixed, making it not
// actually fullscreen. createPortal escapes the transform context entirely.
function RPMModal({ onExport, onClose }: { onExport: (url: string) => void; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.source !== 'readyplayerme') return;

        if (data.eventName === 'v1.frame.ready') {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ target: 'readyplayerme', type: 'subscribe', eventName: 'v1.avatar.exported' }),
            '*'
          );
        }
        if (data.eventName === 'v1.avatar.exported' && data.data?.url) {
          onExport(data.data.url);
        }
      } catch { /* ignore non-JSON */ }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onExport]);

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 1.25rem', flexShrink: 0,
        background: 'rgba(5,5,5,0.95)',
        borderBottom: '1px solid rgba(255,215,0,0.15)',
      }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--noir-gold)', letterSpacing: '0.15em' }}>
            🎭 CREATE YOUR CHARACTER
          </p>
          <p style={{ fontSize: '0.68rem', color: 'var(--noir-text-dim)', marginTop: 2 }}>
            Design your look, then click <strong style={{ color: 'var(--noir-gold)' }}>Save</strong> inside the creator
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.4)', borderRadius: 4, color: '#ff6666', padding: '0.45rem 1rem', fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer' }}
        >
          ✕ CANCEL
        </button>
      </div>

      {/* Iframe — fills ALL remaining height */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', zIndex: 1 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ width: 44, height: 44, border: '3px solid rgba(255,215,0,0.15)', borderTopColor: 'var(--noir-gold)', borderRadius: '50%', marginBottom: '1rem' }}
            />
            <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.82rem', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>
              Loading Character Creator...
            </p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={RPM_IFRAME_URL}
          title="Ready Player Me Avatar Creator"
          allow="camera *; microphone *"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>{modal}</AnimatePresence>,
    document.body
  );
}

// ── Main AvatarPicker component ───────────────────────────────────────────────
interface AvatarPickerProps {
  value: Avatar;
  onChange: (avatar: Avatar) => void;
  playerName?: string;
}

export function AvatarPicker({ value, onChange, playerName = 'You' }: AvatarPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [headshotLoaded, setHeadshotLoaded] = useState(false);
  const [headshotError, setHeadshotError] = useState(false);
  const hasAvatar = Boolean(value.url);
  const headshotUrl = hasAvatar ? buildHeadshotUrl(value.url) : '';

  const handleExport = useCallback((url: string) => {
    onChange({ url });
    setShowModal(false);
    setHeadshotLoaded(false);
    setHeadshotError(false);
    // Try 3D first after a brief delay for the model to be ready
    setTimeout(() => setShow3D(true), 400);
  }, [onChange]);

  const handleModelError = useCallback(() => setShow3D(false), []);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--noir-text-dim)', textTransform: 'uppercase', textAlign: 'center' }}>
          🎭 Your Character
        </p>

        {/* ── Preview ── */}
        {hasAvatar && show3D ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ width: '100%', height: 340, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,215,0,0.2)', background: 'radial-gradient(ellipse at bottom, #0a0a0a, #000)' }}
          >
            <Canvas camera={{ position: [0, 0.9, 2.4], fov: 42 }} style={{ background: 'transparent' }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[2, 4, 2]} intensity={1.2} />
              <directionalLight position={[-2, 2, -2]} intensity={0.4} color="#ffd700" />
              <AvatarModel url={value.url} />
              <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.25} maxPolarAngle={Math.PI * 0.6} autoRotate autoRotateSpeed={1.5} />
              <Environment preset="city" />
            </Canvas>
          </motion.div>
        ) : hasAvatar ? (
          /* Headshot view */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}
          >
            {!headshotError ? (
              <div style={{ position: 'relative', width: 140, height: 140 }}>
                {/* Loading ring while headshot loads */}
                {!headshotLoaded && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,215,0,0.15)', borderTopColor: 'var(--noir-gold)' }}
                  />
                )}
                <img
                  src={headshotUrl}
                  alt={playerName}
                  onLoad={() => setHeadshotLoaded(true)}
                  onError={() => setHeadshotError(true)}
                  style={{
                    width: 140, height: 140, borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid rgba(255,215,0,0.4)',
                    boxShadow: '0 0 20px rgba(255,215,0,0.15)',
                    opacity: headshotLoaded ? 1 : 0,
                    transition: 'opacity 0.4s',
                  }}
                />
              </div>
            ) : (
              <InitialsFallback name={playerName} size={120} />
            )}
          </motion.div>
        ) : (
          /* No avatar yet */
          <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: '0.5rem' }}
          >
            <div style={{ fontSize: '4rem', filter: 'grayscale(1) opacity(0.3)' }}>🕵️</div>
            <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
              NO CHARACTER YET
            </p>
          </motion.div>
        )}

        {/* ── Action buttons ── */}
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="btn-noir btn-filled-red w-full"
          style={{ fontSize: '0.75rem', padding: '0.6rem 1rem' }}
        >
          {hasAvatar ? '✏️ CHANGE CHARACTER' : '🎭 CREATE YOUR CHARACTER'}
        </motion.button>

        {hasAvatar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
              <p style={{ color: '#00ff88', fontSize: '0.65rem', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                3D CHARACTER READY
              </p>
            </motion.div>
            <button
              onClick={() => setShow3D(!show3D)}
              style={{ background: 'none', border: 'none', color: 'var(--noir-text-dim)', fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '0.05em', textDecoration: 'underline' }}
            >
              {show3D ? 'Switch to headshot view' : 'Switch to 3D view'}
            </button>
          </>
        )}
      </div>

      {/* RPM Modal rendered via portal to escape framer-motion transform stacking context */}
      {showModal && (
        <RPMModal
          onExport={handleExport}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
