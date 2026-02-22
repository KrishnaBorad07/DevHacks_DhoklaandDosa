





















































// =============================================================================
// components/Lobby.tsx – Room creation / join screen  ✦ REVOLUTIONARY EDITION
// =============================================================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarPicker, DEFAULT_AVATAR } from './AvatarPicker';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { Avatar } from '../types/game';
import type { useGameState } from '../hooks/useGameState';

type GameStateApi = ReturnType<typeof useGameState>;
interface LobbyProps { api: GameStateApi; }
type Tab = 'create' | 'join';

// ── Title letters for staggered animation ────────────────────────────────────
const LINE1 = 'WHO LIES'.split('');
const LINE2 = 'TONIGHT?'.split('');

// ── Ember particle positions (static, CSS animated) ──────────────────────────
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: `${8 + Math.floor(((i * 137.5) % 84))}%`,
  delay: `${((i * 0.43) % 4).toFixed(2)}s`,
  dur: `${(3 + (i % 4)).toFixed(1)}s`,
  size: `${2 + (i % 3)}px`,
  opacity: 0.3 + (i % 5) * 0.12,
}));

export function Lobby({ api }: LobbyProps) {
  const { state, createRoom, joinRoom } = api;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>('create');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [avatar, setAvatar] = useState<Avatar>(() => {
    try {
      const saved = localStorage.getItem('wlt_avatar');
      if (saved) {
        const parsed = JSON.parse(saved) as any;
        return { ...DEFAULT_AVATAR, ...parsed, ...(parsed.colors ? { colors: { ...(DEFAULT_AVATAR as any).colors, ...parsed.colors } } : {}) } as Avatar;
      }
      return DEFAULT_AVATAR;
    } catch { return DEFAULT_AVATAR; }
  });

  // 3-D card tilt on mouse move
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const rx = ((e.clientY - top) / height - 0.5) * -14;
    const ry = ((e.clientX - left) / width - 0.5) * 14;
    setTilt({ x: rx, y: ry });
  };
  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  useEffect(() => { localStorage.setItem('wlt_avatar', JSON.stringify(avatar)); }, [avatar]);
  useEffect(() => { if (state.roomCode) navigate(`/room/${state.roomCode}`); }, [state.roomCode, navigate]);

  const handleCreate = () => { if (!username.trim()) return; createRoom(username.trim(), avatar); };
  const handleJoin = () => { if (!username.trim() || !roomCode.trim()) return; joinRoom(roomCode.toUpperCase(), username.trim(), avatar); };
  const headshotUrl = avatar.url ? getHeadshotUrl(avatar.url) : '';

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center"
      style={{ padding: '1.5rem 1rem', overflow: 'hidden' }}
    >
      {/* ── Global styles + keyframes ──────────────────────────────────────── */}
      <style>{`
        @keyframes ember {
          0%   { transform: translateY(0)    scale(1)   rotate(0deg);   opacity: 0; }
          15%  { opacity: var(--op); }
          80%  { opacity: var(--op); }
          100% { transform: translateY(-240px) scale(0.3) rotate(360deg); opacity: 0; }
        }
        @keyframes bloodDrip {
          0%   { transform: scaleY(0) translateY(-4px); opacity: 0; }
          12%  { opacity: 1;  transform: scaleY(1) translateY(0); }
          88%  { opacity: 1; }
          100% { transform: scaleY(2.8) translateY(50px); opacity: 0; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg)   translateX(56px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(56px) rotate(-360deg); }
        }
        @keyframes orbitReverse {
          from { transform: rotate(0deg)   translateX(70px) rotate(0deg); }
          to   { transform: rotate(-360deg) translateX(70px) rotate(360deg); }
        }
        @keyframes skullFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-10px) scale(1.04); }
        }
        @keyframes ringRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ringCounterRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes letterDrop {
          0%   { opacity: 0; transform: translateY(-60px) rotateX(90deg); }
          100% { opacity: 1; transform: translateY(0)    rotateX(0deg); }
        }
        @keyframes redPulse {
          0%,100% { text-shadow: 0 0 24px #ff0000, 0 0 60px #ff000055; }
          50%     { text-shadow: 0 0 40px #ff0000, 0 0 90px #ff000099; }
        }
        @keyframes glitch {
          0%,92%,100% { clip-path: none; transform: none; }
          93% { clip-path: inset(30% 0 40% 0); transform: translateX(-6px); }
          95% { clip-path: inset(60% 0 10% 0); transform: translateX(6px); }
          97% { clip-path: none; transform: none; }
        }
        @keyframes scanline {
          0%   { top: -10%; }
          100% { top: 110%; }
        }
        .letter-line1 span, .letter-line2 span {
          display: inline-block;
          animation: letterDrop 0.45s cubic-bezier(.22,1,.36,1) both;
        }
        .card-3d {
          transform-style: preserve-3d;
          transition: transform 0.15s ease;
          will-change: transform;
        }
        .ember-particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, #ff6600, #ff0000);
          animation: ember linear infinite;
          pointer-events: none;
        }
        .blood-drip {
          position: absolute;
          width: 6px;
          border-radius: 0 0 50% 50%;
          background: linear-gradient(#cc0000, #660000);
          transform-origin: top center;
          animation: bloodDrip linear infinite;
        }
        .orbit-dot {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          top: 50%; left: 50%;
          margin: -4px 0 0 -4px;
          animation: orbit 3s linear infinite;
        }
        .orbit-dot-rev {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          top: 50%; left: 50%;
          margin: -3px 0 0 -3px;
          animation: orbitReverse 4.5s linear infinite;
        }
      `}</style>

      {/* ── Ember particles (background) ──────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {EMBERS.map((e) => (
          <div
            key={e.id}
            className="ember-particle"
            style={{
              left: e.x,
              bottom: '0',
              width: e.size,
              height: e.size,
              animationDelay: e.delay,
              animationDuration: e.dur,
              ['--op' as any]: e.opacity,
              opacity: 0,
            }}
          />
        ))}
        {/* Slow scanline effect */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '2px',
          background: 'linear-gradient(to right, transparent, rgba(255,0,0,0.15), transparent)',
          animation: 'scanline 8s linear infinite',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>

        {/* Skull with spinning rings + blood drips */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 160, height: 160, marginBottom: '0.5rem' }}>

          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(255,0,0,0.4)',
            animation: 'ringRotate 6s linear infinite',
            boxShadow: '0 0 12px #ff000033',
          }}>
            {/* 4 dots on outer ring */}
            {[0, 90, 180, 270].map((deg) => (
              <div key={deg} style={{
                position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                background: '#ff3300', boxShadow: '0 0 8px #ff3300',
                top: '50%', left: '50%',
                transform: `rotate(${deg}deg) translateX(78px) translateY(-4px)`,
              }} />
            ))}
          </div>

          {/* Inner ring (counter-rotate) */}
          <div style={{
            position: 'absolute', inset: 12, borderRadius: '50%',
            border: '1px dashed rgba(255,215,0,0.3)',
            animation: 'ringCounterRotate 4s linear infinite',
          }}>
            {[45, 135, 225, 315].map((deg) => (
              <div key={deg} style={{
                position: 'absolute', width: 5, height: 5, borderRadius: '50%',
                background: '#ffd700', boxShadow: '0 0 6px #ffd700',
                top: '50%', left: '50%',
                transform: `rotate(${deg}deg) translateX(61px) translateY(-2.5px)`,
              }} />
            ))}
          </div>

          {/* The skull */}
          <div style={{
            fontSize: '5rem', lineHeight: 1,
            animation: 'skullFloat 3s ease-in-out infinite',
            filter: 'drop-shadow(0 0 14px #ff0000) drop-shadow(0 0 40px #ff000066)',
            position: 'relative', zIndex: 2,
          }}>
            💀
            {/* Blood drips */}
            {[
              { left: '22%', h: '28px', d: '0s', dur: '1.5s' },
              { left: '38%', h: '42px', d: '0.35s', dur: '1.9s' },
              { left: '52%', h: '20px', d: '0.7s', dur: '1.3s' },
              { left: '67%', h: '35px', d: '0.15s', dur: '1.7s' },
              { left: '80%', h: '15px', d: '0.55s', dur: '1.2s' },
            ].map((b, i) => (
              <div key={i} className="blood-drip" style={{ left: b.left, height: b.h, animationDelay: b.d, animationDuration: b.dur, top: '78%' }} />
            ))}
          </div>
        </div>

        {/* WHO LIES — staggered letter drop */}
        <div style={{ perspective: '600px', perspectiveOrigin: '50% 50%' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 11vw, 6.5rem)',
              letterSpacing: '0.06em',
              lineHeight: 1,
              textTransform: 'uppercase',
              animation: 'glitch 7s ease-in-out infinite',
              marginBottom: 0,
            }}
          >
            {/* Line 1: WHO LIES — blood red */}
            <div className="letter-line1" style={{ color: '#ff1a1a', animation: 'redPulse 3s ease-in-out infinite' }}>
              {LINE1.map((ch, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.06}s`, color: ch === ' ' ? 'transparent' : undefined }}>
                  {ch === ' ' ? '\u00A0' : ch}
                </span>
              ))}
            </div>
            {/* Line 2: TONIGHT? — gold with red glow */}
            <div className="letter-line2" style={{ color: '#FFD700', textShadow: '0 0 22px #ff0000, 0 0 55px #ff000066' }}>
              {LINE2.map((ch, i) => (
                <span key={i} style={{ animationDelay: `${0.48 + i * 0.07}s` }}>
                  {ch}
                </span>
              ))}
            </div>
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          style={{
            fontFamily: 'var(--font-typewriter)',
            color: 'rgba(255,110,110,0.85)',
            fontSize: '0.88rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: '0.75rem',
          }}
        >
          ☠ A GAME OF DECEPTION &amp; DEDUCTION ☠
        </motion.p>

        {/* Separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          style={{
            margin: '1rem auto 0', width: '300px', height: '2px',
            background: 'linear-gradient(to right, transparent, #ff0000 40%, #ffd700 60%, transparent)',
            boxShadow: '0 0 14px #ff000066',
          }}
        />
      </div>

      {/* ── Main card (3-D tilt) ───────────────────────────────────────────── */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', damping: 18 }}
        className="glass-card card-3d"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          width: '100%', maxWidth: 860, padding: 0, overflow: 'hidden',
          position: 'relative', zIndex: 1,
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          boxShadow: `0 0 60px rgba(255,0,0,0.15), inset 0 1px 0 rgba(255,215,0,0.08), 0 30px 80px rgba(0,0,0,0.6)`,
          border: '1px solid rgba(255,0,0,0.2)',
        }}
      >
        {/* Inner glow shimmer layer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,0,0,0.06) 0%, transparent 70%)',
        }} />

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 1px minmax(0,1fr)', position: 'relative', zIndex: 1 }}>

          {/* LEFT: Avatar picker */}
          <div style={{ padding: '1.75rem' }}>
            <AvatarPicker value={avatar} onChange={setAvatar} playerName={username || 'You'} />
          </div>

          {/* Divider with glow */}
          <div style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,0,0,0.3), rgba(255,215,0,0.3), transparent)' }} />

          {/* RIGHT: Create/Join form */}
          <div style={{ padding: '1.75rem' }}>

            {/* Tab switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,0,0,0.2)', marginBottom: '1.5rem' }}>
              {(['create', 'join'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '0.65rem',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.78rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                    background: 'transparent',
                    color: tab === t ? '#FFD700' : 'var(--noir-text-dim)',
                    border: 'none',
                    borderBottom: tab === t ? '2px solid #FFD700' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 200ms',
                    textShadow: tab === t ? '0 0 12px #ffd70066' : 'none',
                  }}
                >
                  {t === 'create' ? '⚔ Create Room' : '⤵ Join Room'}
                </button>
              ))}
            </div>

            {/* Username */}
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--noir-text-dim)', letterSpacing: '0.12em', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                Your Alias (3–16 chars)
              </span>
              <input
                className="input-noir mt-2"
                type="text"
                placeholder="e.g. Scarface, Bonnie..."
                value={username}
                maxLength={16}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin(); }}
                style={{ fontSize: '1rem' }}
              />
            </label>

            <AnimatePresence mode="wait">
              {tab === 'join' && (
                <motion.label
                  key="join-code"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'block', marginBottom: '1rem', overflow: 'hidden' }}
                >
                  <span style={{ color: 'var(--noir-text-dim)', letterSpacing: '0.12em', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    Room Code
                  </span>
                  <input
                    className="input-noir mt-2"
                    type="text"
                    placeholder="e.g. X7K9P2"
                    value={roomCode}
                    maxLength={6}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '1.3rem', textAlign: 'center' }}
                  />
                </motion.label>
              )}
            </AnimatePresence>

            {/* Avatar preview */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,0,0,0.18)',
              borderRadius: 6, padding: '0.6rem 0.85rem', marginBottom: '1.5rem',
              boxShadow: 'inset 0 0 20px rgba(255,0,0,0.04)',
            }}>
              {headshotUrl ? (
                <img src={headshotUrl} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,215,0,0.4)', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: `radial-gradient(circle, ${getAvatarColor(username || 'X')}aa, ${getAvatarColor(username || 'X')}33)`,
                  border: `2px solid ${getAvatarColor(username || 'X')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#fff' }}>
                    {getInitials(username || '??')}
                  </span>
                </div>
              )}
              <div>
                <p style={{ color: '#FFD700', fontFamily: 'var(--font-display)', fontSize: '0.8rem', textShadow: '0 0 8px #ffd70044' }}>
                  {username || 'Your Alias'}
                </p>
                <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.7rem' }}>
                  {avatar.url ? '✦ Custom 3D character' : '○ Ready to enter the city'}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="btn-noir btn-filled-red w-full"
              style={{
                fontSize: '1.05rem', padding: '1.1rem', letterSpacing: '0.12em',
                fontWeight: 700,
                boxShadow: '0 0 24px rgba(255,0,0,0.35), 0 4px 20px rgba(255,0,0,0.2)',
                border: '1px solid rgba(255,60,60,0.5)',
                transition: 'all 0.2s',
                marginBottom: '0.75rem',
              }}
              onClick={tab === 'create' ? handleCreate : handleJoin}
              disabled={!username.trim() || (tab === 'join' && roomCode.length < 6)}
            >
              {tab === 'create' ? '⚔  CREATE ROOM' : '⤵  JOIN ROOM'}
            </motion.button>

            <p style={{ textAlign: 'center', color: 'var(--noir-text-dim)', fontSize: '0.7rem', lineHeight: 1.6 }}>
              {tab === 'create'
                ? 'A 6-character code will be generated. Minimum 4 players to start.'
                : 'Enter the code shared by your host to join the syndicate.'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 1.8 }}
        style={{ marginTop: '1.5rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--noir-text-dim)', fontFamily: 'var(--font-typewriter)', textAlign: 'center', zIndex: 1, position: 'relative' }}
      >
        NO REGISTRATION · ANONYMOUS PLAY · SERVER-AUTHORITATIVE
      </motion.p>
    </div>
  );
}
