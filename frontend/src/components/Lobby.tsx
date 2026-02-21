// =============================================================================
// components/Lobby.tsx – Room creation / join screen
// =============================================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarPicker, DEFAULT_AVATAR } from './AvatarPicker';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { Avatar } from '../types/game';
import type { useGameState } from '../hooks/useGameState';

type GameStateApi = ReturnType<typeof useGameState>;

interface LobbyProps {
  api: GameStateApi;
}

type Tab = 'create' | 'join';

export function Lobby({ api }: LobbyProps) {
  const { state, createRoom, joinRoom } = api;
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('create');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [avatar, setAvatar] = useState<Avatar>(() => {
    try {
      const saved = localStorage.getItem('wlt_avatar');
      return saved ? JSON.parse(saved) : DEFAULT_AVATAR;
    } catch { return DEFAULT_AVATAR; }
  });

  // Persist avatar to localStorage
  useEffect(() => {
    localStorage.setItem('wlt_avatar', JSON.stringify(avatar));
  }, [avatar]);

  // Navigate when room code assigned
  useEffect(() => {
    if (state.roomCode) {
      navigate(`/room/${state.roomCode}`);
    }
  }, [state.roomCode, navigate]);

  const handleCreate = () => {
    if (!username.trim()) return;
    createRoom(username.trim(), avatar);
  };

  const handleJoin = () => {
    if (!username.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.toUpperCase(), username.trim(), avatar);
  };

  const headshotUrl = avatar.url ? getHeadshotUrl(avatar.url) : '';

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center"
      style={{ padding: '2rem 1rem' }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1
          className="heading-gold neon-flicker"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', letterSpacing: '0.05em', lineHeight: 1.1 }}
        >
          WHO LIES
          <br />
          <span style={{ color: 'var(--noir-red)', textShadow: 'var(--shadow-red)' }}>TONIGHT?</span>
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '0.85rem',
            color: 'var(--noir-text-dim)',
            marginTop: '0.75rem',
            letterSpacing: '0.1em',
          }}
        >
          A MULTIPLAYER MAFIA GAME — 1920s·CRIME·SYNDICATE
        </p>

        {/* Decorative line */}
        <div
          style={{
            margin: '1.5rem auto 0',
            width: '200px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, var(--noir-gold), transparent)',
          }}
        />
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: 820, padding: 0, overflow: 'hidden' }}
      >
        {/* Two-column layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 1px minmax(0,1fr)',
          }}
        >
          {/* LEFT: Avatar picker */}
          <div style={{ padding: '1.5rem' }}>
            <AvatarPicker value={avatar} onChange={setAvatar} playerName={username || 'You'} />
          </div>

          {/* Divider */}
          <div style={{ background: 'rgba(255,215,0,0.1)' }} />

          {/* RIGHT: Create/Join form */}
          <div style={{ padding: '1.5rem' }}>
            {/* Tab switcher */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255,215,0,0.15)',
                marginBottom: '1.5rem',
              }}
            >
              {(['create', 'join'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    color: tab === t ? 'var(--noir-gold)' : 'var(--noir-text-dim)',
                    border: 'none',
                    borderBottom: tab === t
                      ? '2px solid var(--noir-gold)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {t === 'create' ? '+ Create Room' : '→ Join Room'}
                </button>
              ))}
            </div>

            {/* Username  */}
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span className="text-xs" style={{
                color: 'var(--noir-text-dim)', letterSpacing: '0.12em',
                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
              }}>
                Your Alias (3–16 chars)
              </span>
              <input
                className="input-noir mt-2"
                type="text"
                placeholder="e.g. Scarface, Bonnie..."
                value={username}
                maxLength={16}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin();
                }}
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
                  <span className="text-xs" style={{
                    color: 'var(--noir-text-dim)', letterSpacing: '0.12em',
                    fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                  }}>
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
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.3em',
                      fontSize: '1.2rem',
                      textAlign: 'center',
                    }}
                  />
                </motion.label>
              )}
            </AnimatePresence>

            <div
              className="flex items-center gap-2"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,215,0,0.1)',
                borderRadius: 4,
                padding: '0.5rem 0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* Avatar preview: headshot or initials fallback */}
              {headshotUrl ? (
                <img
                  src={headshotUrl}
                  alt="avatar"
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,215,0,0.3)', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: `radial-gradient(135deg, ${getAvatarColor(username || 'X')}aa, ${getAvatarColor(username || 'X')}44)`,
                  border: `2px solid ${getAvatarColor(username || 'X')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#fff' }}>
                    {getInitials(username || '??')}
                  </span>
                </div>
              )}
              <div>
                <p style={{ color: 'var(--noir-gold)', fontFamily: 'var(--font-display)', fontSize: '0.75rem' }}>
                  {username || 'Your Alias'}
                </p>
                <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.7rem' }}>
                  {avatar.url ? 'Custom 3D character' : 'Ready to enter the city'}
                </p>
              </div>
            </div>

            {/* Action button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-noir btn-filled-red w-full"
              style={{ fontSize: '0.85rem', padding: '0.8rem' }}
              onClick={tab === 'create' ? handleCreate : handleJoin}
              disabled={!username.trim() || (tab === 'join' && roomCode.length < 6)}
            >
              {tab === 'create' ? '⚔ CREATE ROOM' : '⤵ JOIN ROOM'}
            </motion.button>

            <p
              className="text-center mt-4"
              style={{ color: 'var(--noir-text-dim)', fontSize: '0.72rem', lineHeight: 1.6 }}
            >
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
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: '2rem',
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          color: 'var(--noir-text-dim)',
          fontFamily: 'var(--font-typewriter)',
          textAlign: 'center',
        }}
      >
        NO REGISTRATION · ANONYMOUS PLAY · SERVER-AUTHORITATIVE
      </motion.p>
    </div>
  );
}
