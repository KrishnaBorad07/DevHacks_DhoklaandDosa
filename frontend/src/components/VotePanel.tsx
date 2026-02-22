// =============================================================================
// components/VotePanel.tsx – Day voting interface with confirmation dialog
// =============================================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { PublicPlayer } from '../types/game';

interface VotePanelProps {
  players: PublicPlayer[];
  myId: string | null;
  votes: Record<string, string>;
  voteTally: Record<string, number>;
  alive: boolean;
  onVote: (targetId: string) => void;
  phase: string;
  isHost?: boolean;
  onSkipDiscussion?: () => void;
}

function PlayerAvatar({ player, size = 64 }: { player: PublicPlayer; size?: number }) {
  const hs = player.avatar?.url ? getHeadshotUrl(player.avatar.url) : '';
  if (hs) {
    return <img src={hs} alt={player.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(player.name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: size * 0.32 }}>{getInitials(player.name)}</span>
    </div>
  );
}

/** Small headshot circle for the voter strip */
function VoterChip({ voter, hasMax }: { voter: PublicPlayer; hasMax: boolean }) {
  const hs = voter.avatar?.url ? getHeadshotUrl(voter.avatar.url) : '';
  return (
    <div
      title={voter.name}
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `1.5px solid ${hasMax ? 'var(--noir-red)' : 'rgba(255,215,0,0.7)'}`,
        overflow: 'hidden',
        flexShrink: 0,
        background: getAvatarColor(voter.name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hs
        ? <img src={hs} alt={voter.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: '0.42rem', color: '#fff', fontFamily: 'var(--font-display)' }}>{getInitials(voter.name)}</span>
      }
    </div>
  );
}

/** Confirmation dialog overlay */
function ConfirmVoteDialog({
  target,
  onConfirm,
  onCancel,
}: {
  target: PublicPlayer;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(10,4,4,0.96)',
          border: '1px solid rgba(200,30,30,0.65)',
          borderRadius: 8,
          padding: '1.8rem 2rem',
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 0 35px rgba(180,0,0,0.35), 0 8px 32px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          letterSpacing: '0.16em',
          color: 'var(--noir-text-dim)',
          textTransform: 'uppercase',
        }}>
          Confirm your vote
        </p>

        {/* Target avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <PlayerAvatar player={target} size={72} />
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            letterSpacing: '0.1em',
            color: 'var(--noir-red)',
            textTransform: 'uppercase',
            textShadow: '0 0 12px rgba(255,40,40,0.5)',
          }}>
            {target.name}
          </p>
        </div>

        <p style={{
          fontFamily: 'var(--font-typewriter)',
          fontSize: '0.78rem',
          color: 'var(--noir-text-dim)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Vote to eliminate this player?<br />
          <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>This action cannot be undone.</span>
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.55rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              color: 'var(--noir-text-dim)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '0.55rem',
              background: 'linear-gradient(135deg, rgba(180,0,0,0.5), rgba(120,0,0,0.4))',
              border: '1px solid rgba(220,50,50,0.7)',
              borderRadius: 4,
              color: '#ff7070',
              fontFamily: 'var(--font-display)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(200,0,0,0.3)',
            }}
          >
            ⚖ Vote
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function VotePanel({ players, myId, votes, voteTally, alive, onVote, phase, isHost, onSkipDiscussion }: VotePanelProps) {
  const [pendingTarget, setPendingTarget] = useState<PublicPlayer | null>(null);

  const myVote = myId ? votes[myId] : null;
  const alivePlayers = players.filter((p) => p.alive);
  const totalVotes = Object.keys(votes).length;
  const aliveCount = alivePlayers.length;
  const maxVotes = Math.max(...Object.values(voteTally).map(Number), 0);

  // Build a map: targetId → list of voter PublicPlayers (to show headshots)
  const votersByTarget: Record<string, PublicPlayer[]> = {};
  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = players.find((p) => p.id === voterId);
    if (!voter) continue;
    if (!votersByTarget[targetId]) votersByTarget[targetId] = [];
    votersByTarget[targetId].push(voter);
  }

  const handleCardClick = (player: PublicPlayer) => {
    // Lock: if already voted, no dialog — vote cannot be changed
    if (!alive || player.id === myId || phase !== 'vote' || !!myVote) return;
    setPendingTarget(player);
  };

  const handleConfirm = () => {
    if (!pendingTarget) return;
    onVote(pendingTarget.id);
    setPendingTarget(null);
  };

  const handleCancel = () => {
    setPendingTarget(null);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--noir-gold)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {phase === 'vote' ? '⚖️ Cast Your Vote' : '💬 Discussion'}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--noir-text-dim)' }}>
            {totalVotes}/{aliveCount} voted
          </span>
        </div>

        {phase === 'day' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.78rem', fontStyle: 'italic', marginBottom: isHost ? '0.75rem' : 0 }}>
              Discuss freely. Voting begins soon...
            </p>
            {isHost && onSkipDiscussion && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={onSkipDiscussion}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,180,0,0.08))',
                  border: '1px solid rgba(255,215,0,0.5)',
                  borderRadius: 4,
                  color: 'var(--noir-gold)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  textShadow: '0 0 8px rgba(255,215,0,0.4)',
                  boxShadow: '0 0 12px rgba(255,215,0,0.15)',
                }}
              >
                ⏭ SKIP TO VOTE
              </motion.button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
          <AnimatePresence>
            {alivePlayers.map((player) => {
              const voteCount = voteTally[player.id] ?? 0;
              const hasMaxVotes = maxVotes > 0 && voteCount === maxVotes;
              const isSelf = player.id === myId;
              const voters = votersByTarget[player.id] ?? [];
              const isVoted = myVote === player.id;

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
                    gap: '0.5rem',
                    padding: '0.8rem 0.5rem',
                    background: isVoted ? 'rgba(200,0,0,0.15)' : 'rgba(20,20,20,0.8)',
                    border: `1px solid ${isVoted ? 'var(--noir-red)' : hasMaxVotes ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.1)'}`,
                    borderRadius: 6,
                    cursor: alive && !isSelf && phase === 'vote' ? 'pointer' : 'default',
                    boxShadow: isVoted ? 'var(--shadow-red)' : hasMaxVotes ? '0 0 10px rgba(255,215,0,0.25)' : 'none',
                    transition: 'all 200ms',
                  }}
                  onClick={() => handleCardClick(player)}
                >
                  <PlayerAvatar player={player} size={84} />

                  {/* Voter headshot strip — below avatar, above name */}
                  {voters.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}
                    >
                      {voters.map((voter) => (
                        <VoterChip key={voter.id} voter={voter} hasMax={hasMaxVotes} />
                      ))}
                    </motion.div>
                  )}

                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.08em', color: isVoted ? 'var(--noir-red)' : 'var(--noir-gold)', textAlign: 'center', maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}{isSelf && ' (you)'}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {!alive && (
          <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--noir-text-dim)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            You are a spectator. Observe the living...
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {pendingTarget && (
          <ConfirmVoteDialog
            target={pendingTarget}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </>
  );
}
