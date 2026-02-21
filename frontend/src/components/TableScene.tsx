// =============================================================================
// components/TableScene.tsx – PixiJS round table with positioned player avatars
// =============================================================================
import { useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { renderAvatarSVG } from '../lib/avatarConfig';
import type { PublicPlayer } from '../types/game';

interface TableSceneProps {
  players: PublicPlayer[];
  myId: string | null;
  voteTally: Record<string, number>;
  phase: string;
  /** Called when a player's avatar is clicked (for voting etc.) */
  onPlayerClick?: (playerId: string) => void;
}

export const TableScene = memo(function TableScene({
  players,
  myId,
  voteTally,
  phase,
  onPlayerClick,
}: TableSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasSize = 420;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const tableR = 110;
  const avatarR = 155;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: canvasSize,
        height: canvasSize,
        flexShrink: 0,
        margin: '0 auto',
      }}
    >
      {/* SVG table canvas */}
      <svg
        width={canvasSize}
        height={canvasSize}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Rug / felt background */}
        <defs>
          <radialGradient id="tableGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a0a"/>
            <stop offset="70%" stopColor="#0d0d05"/>
            <stop offset="100%" stopColor="#050500"/>
          </radialGradient>
          <radialGradient id="feltGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d1a0d"/>
            <stop offset="100%" stopColor="#050d05"/>
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Outer table wood ring */}
        <circle cx={cx} cy={cy} r={tableR + 18} fill="url(#tableGrad)" stroke="#ffd700" strokeWidth="2" opacity="0.5"/>
        {/* Gold decorative ring */}
        <circle cx={cx} cy={cy} r={tableR + 12} fill="none" stroke="#ffd700" strokeWidth="0.5" opacity="0.4" strokeDasharray="6 4"/>
        {/* Inner felt */}
        <circle cx={cx} cy={cy} r={tableR} fill="url(#feltGrad)"/>
        {/* Felt inner ring */}
        <circle cx={cx} cy={cy} r={tableR - 10} fill="none" stroke="rgba(255,215,0,0.15)" strokeWidth="1"/>

        {/* WLT monogram */}
        <text
          x={cx} y={cy + 6}
          textAnchor="middle"
          fontFamily="Cinzel, serif"
          fontSize="22"
          fontWeight="700"
          fill="#ffd700"
          opacity="0.3"
          letterSpacing="4"
        >
          WLT
        </text>

        {/* Seat positions - lines from table edge to avatar slots */}
        {players.map((_, i) => {
          const angle = (2 * Math.PI / players.length) * i - Math.PI / 2;
          const sx = cx + (tableR + 4) * Math.cos(angle);
          const sy = cy + (tableR + 4) * Math.sin(angle);
          const ex = cx + (avatarR - 36) * Math.cos(angle);
          const ey = cy + (avatarR - 36) * Math.sin(angle);
          return (
            <line
              key={i}
              x1={sx} y1={sy} x2={ex} y2={ey}
              stroke="rgba(255,215,0,0.1)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          );
        })}

        {/* Vote arcs (when there are votes) */}
        {players
          .filter((p) => voteTally[p.id] > 0)
          .map((player) => {
            const i = players.indexOf(player);
            const angle = (2 * Math.PI / players.length) * i - Math.PI / 2;
            const ax = cx + avatarR * Math.cos(angle);
            const ay = cy + avatarR * Math.sin(angle);
            return (
              <circle
                key={`vote-${player.id}`}
                cx={ax} cy={ay}
                r={36}
                fill="none"
                stroke="#ff0000"
                strokeWidth="2"
                opacity="0.5"
                filter="url(#glow)"
              />
            );
          })}
      </svg>

      {/* Player avatar HTML overlays */}
      {players.map((player, i) => {
        const angle = (2 * Math.PI / players.length) * i - Math.PI / 2;
        const ax = cx + avatarR * Math.cos(angle);
        const ay = cy + avatarR * Math.sin(angle);
        const isMe = player.id === myId;
        const hasVotes = (voteTally[player.id] ?? 0) > 0;
        const svgStr = renderAvatarSVG(
          player.avatar.head,
          player.avatar.body,
          player.avatar.accessory,
          player.avatar.colors,
          56
        );

        return (
          <motion.div
            key={player.id}
            style={{
              position: 'absolute',
              left: ax - 36,
              top: ay - 48,
              width: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: onPlayerClick ? 'pointer' : 'default',
            }}
            animate={
              player.alive
                ? { opacity: 1, scale: isMe ? 1.08 : 1 }
                : { opacity: 0.3, scale: 0.9 }
            }
            whileHover={onPlayerClick && player.alive ? { scale: 1.15, y: -4 } : {}}
            onClick={() => onPlayerClick && player.alive && onPlayerClick(player.id)}
          >
            {/* Vote ring */}
            {hasVotes && player.alive && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                style={{
                  position: 'absolute',
                  inset: -4,
                  top: -4,
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: '2px solid var(--noir-red)',
                  boxShadow: 'var(--shadow-red)',
                }}
              />
            )}
            {/* My indicator */}
            {isMe && (
              <div
                style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--noir-gold)',
                  boxShadow: 'var(--shadow-gold)',
                }}
              />
            )}
            {/* Avatar rendering */}
            <div
              dangerouslySetInnerHTML={{ __html: svgStr }}
              style={{
                width: 56,
                height: 56,
                filter: !player.alive
                  ? 'grayscale(1) brightness(0.4)'
                  : !player.connected
                  ? 'grayscale(0.5) brightness(0.7)'
                  : undefined,
              }}
            />
            {/* Name tag */}
            <div
              style={{
                background: 'rgba(0,0,0,0.85)',
                border: `1px solid ${
                  hasVotes ? 'var(--noir-red)' : isMe ? 'var(--noir-gold)' : 'rgba(255,215,0,0.2)'
                }`,
                borderRadius: 2,
                padding: '1px 5px',
                marginTop: 2,
                maxWidth: 70,
                overflow: 'hidden',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.52rem',
                  letterSpacing: '0.05em',
                  color: hasVotes
                    ? 'var(--noir-red)'
                    : isMe
                    ? 'var(--noir-gold)'
                    : 'var(--noir-text)',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {!player.alive ? '💀 ' : ''}{player.name}
              </p>
            </div>
            {/* Disconnected tag */}
            {!player.connected && player.alive && (
              <p style={{ fontSize: '0.45rem', color: 'var(--noir-red)', textAlign: 'center' }}>
                offline
              </p>
            )}
          </motion.div>
        );
      })}

      {/* Center rain/fog effect */}
      <div
        style={{
          position: 'absolute',
          left: cx - 50,
          top: cy - 50,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'rain-fall 2s linear infinite',
        }}
      />
    </div>
  );
});
