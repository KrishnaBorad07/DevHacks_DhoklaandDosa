// =============================================================================
// components/VotePanel.tsx – Day voting interface (click avatar to vote)
// =============================================================================
import { motion, AnimatePresence } from 'framer-motion';
import { renderAvatarSVG } from '../lib/avatarConfig';
import type { PublicPlayer } from '../types/game';

interface VotePanelProps {
  players: PublicPlayer[];
  myId: string | null;
  votes: Record<string, string>;
  voteTally: Record<string, number>;
  alive: boolean;
  onVote: (targetId: string) => void;
  phase: string;
}

export function VotePanel({ players, myId, votes, voteTally, alive, onVote, phase }: VotePanelProps) {
  const myVote = myId ? votes[myId] : null;
  const alivePlayers = players.filter((p) => p.alive);
  const totalVotes = Object.keys(votes).length;
  const aliveCount = alivePlayers.length;
  const maxVotes = Math.max(...Object.values(voteTally).map(Number), 0);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--noir-gold)',
            fontSize: '0.85rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {phase === 'vote' ? '⚖️ Cast Your Vote' : '💬 Discussion'}
        </h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--noir-text-dim)' }}>
          {totalVotes}/{aliveCount} voted
        </span>
      </div>

      {phase === 'day' && (
        <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.78rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>
          Discuss freely. Voting begins soon...
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '0.6rem',
        }}
      >
        <AnimatePresence>
          {alivePlayers.map((player) => {
            const voteCount = voteTally[player.id] ?? 0;
            const isTargeted = myVote === player.id;
            const hasMaxVotes = maxVotes > 0 && voteCount === maxVotes;
            const isSelf = player.id === myId;
            const svg = renderAvatarSVG(
              player.avatar.head,
              player.avatar.body,
              player.avatar.accessory,
              player.avatar.colors,
              64
            );

            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={alive && !isSelf && phase === 'vote' ? { scale: 1.06 } : {}}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.6rem 0.4rem',
                  background: isTargeted
                    ? 'rgba(200,0,0,0.15)'
                    : 'rgba(20,20,20,0.8)',
                  border: `1px solid ${
                    isTargeted
                      ? 'var(--noir-red)'
                      : hasMaxVotes
                      ? 'rgba(255,215,0,0.5)'
                      : 'rgba(255,215,0,0.1)'
                  }`,
                  borderRadius: 4,
                  cursor:
                    alive && !isSelf && phase === 'vote'
                      ? 'pointer'
                      : 'default',
                  boxShadow: isTargeted
                    ? 'var(--shadow-red)'
                    : hasMaxVotes
                    ? '0 0 10px rgba(255,215,0,0.25)'
                    : 'none',
                  transition: 'all 200ms',
                }}
                onClick={() => {
                  if (alive && !isSelf && phase === 'vote') onVote(player.id);
                }}
              >
                {/* Avatar */}
                <div
                  dangerouslySetInnerHTML={{ __html: svg }}
                  style={{ width: 64, height: 64 }}
                />

                {/* Name */}
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.06em',
                    color: isTargeted ? 'var(--noir-red)' : 'var(--noir-gold)',
                    textAlign: 'center',
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {player.name}
                  {isSelf && ' (you)'}
                </p>

                {/* Vote count badge */}
                {voteCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: hasMaxVotes ? 'var(--noir-red)' : 'rgba(255,215,0,0.8)',
                      color: '#000',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: hasMaxVotes ? 'var(--shadow-red)' : 'var(--shadow-gold)',
                    }}
                  >
                    {voteCount}
                  </motion.div>
                )}

                {/* Your vote indicator */}
                {isTargeted && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--noir-red)',
                      color: '#fff',
                      fontSize: '0.5rem',
                      letterSpacing: '0.08em',
                      padding: '1px 6px',
                      borderRadius: 2,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    YOUR VOTE
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!alive && (
        <p
          style={{
            marginTop: '1rem',
            textAlign: 'center',
            color: 'var(--noir-text-dim)',
            fontSize: '0.75rem',
            fontStyle: 'italic',
          }}
        >
          You are a spectator. Observe the living...
        </p>
      )}
    </div>
  );
}
