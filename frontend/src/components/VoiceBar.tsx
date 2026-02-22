// =============================================================================
// components/VoiceBar.tsx – In-game voice chat HUD
// =============================================================================
import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceState } from '../hooks/useVoiceChat';
import type { PublicPlayer } from '../types/game';
import { getHeadshotUrl, getAvatarColor, getInitials } from '../lib/avatarUtils';

interface VoiceBarProps {
    voice: VoiceState;
    players: PublicPlayer[];
    myId: string | null;
    phase: string;
}

const CHANNEL_LABELS: Record<string, string> = {
    general: 'CITY RADIO',
    mafia: 'SYNDICATE',
};
const CHANNEL_COLORS: Record<string, string> = {
    general: 'var(--noir-gold)',
    mafia: 'var(--noir-red)',
};

function PeerAvatar({ player, speaking }: { player: PublicPlayer; speaking: boolean }) {
    const hs = player.avatar?.url ? getHeadshotUrl(player.avatar.url) : '';
    return (
        <div style={{ position: 'relative' }}>
            {/* Speaking pulse ring */}
            <AnimatePresence>
                {speaking && (
                    <motion.div
                        key="ring"
                        initial={{ scale: 0.9, opacity: 0.8 }}
                        animate={{ scale: 1.35, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            inset: -2,
                            borderRadius: '50%',
                            border: '2px solid rgba(100,220,100,0.9)',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </AnimatePresence>
            <div
                title={player.name}
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: speaking ? '2px solid rgba(100,220,100,0.9)' : '1.5px solid rgba(255,255,255,0.15)',
                    background: getAvatarColor(player.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color 200ms',
                }}
            >
                {hs
                    ? <img src={hs} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '0.4rem', color: '#fff', fontFamily: 'var(--font-display)' }}>{getInitials(player.name)}</span>
                }
            </div>
        </div>
    );
}

export function VoiceBar({ voice, players, myId, phase }: VoiceBarProps) {
    const { micOn, channel, speaking, peers, hasPermission, toggleMic } = voice;

    const channelLabel = CHANNEL_LABELS[channel] ?? 'RADIO';
    const channelColor = CHANNEL_COLORS[channel] ?? 'var(--noir-gold)';

    // Phases where mic is blocked by game rules
    const phaseMuted = phase === 'night' && channel === 'general' && !micOn;

    // Peers in channel (their player objects)
    const peerPlayers = peers
        .map((pid) => players.find((p) => p.id === pid))
        .filter(Boolean) as PublicPlayer[];

    // My own player
    const me = players.find((p) => p.id === myId);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 120,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.45rem 0.9rem',
                background: 'rgba(8,4,4,0.88)',
                border: `1px solid ${channelColor}44`,
                borderRadius: 40,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 0 24px ${channelColor}22, 0 4px 20px rgba(0,0,0,0.5)`,
                userSelect: 'none',
                minWidth: 180,
            }}
        >
            {/* Channel badge */}
            <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.52rem',
                letterSpacing: '0.14em',
                color: channelColor,
                textShadow: `0 0 8px ${channelColor}88`,
                textTransform: 'uppercase',
                paddingRight: '0.4rem',
                borderRight: '1px solid rgba(255,255,255,0.08)',
            }}>
                {channel === 'mafia' ? '🔴' : '📡'} {channelLabel}
            </div>

            {/* Mic toggle button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.93 }}
                onClick={toggleMic}
                title={
                    !hasPermission
                        ? 'Microphone permission denied'
                        : phaseMuted
                            ? 'Mic disabled during night'
                            : micOn
                                ? 'Mute mic'
                                : 'Unmute mic'
                }
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `1.5px solid ${micOn ? 'rgba(100,220,100,0.6)' : 'rgba(200,50,50,0.6)'}`,
                    background: micOn ? 'rgba(0,100,0,0.25)' : 'rgba(100,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: phaseMuted || !hasPermission ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    opacity: phaseMuted || !hasPermission ? 0.45 : 1,
                    transition: 'all 200ms',
                }}
            >
                {!hasPermission ? '⛔' : micOn ? '🎙' : '🔇'}
            </motion.button>

            {/* Self avatar (always shown) */}
            {me && (
                <PeerAvatar player={me} speaking={false} />
            )}

            {/* Peer speaking indicators */}
            {peerPlayers.length > 0 && (
                <>
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {peerPlayers.map((p) => (
                            <PeerAvatar key={p.id} player={p} speaking={speaking.has(p.id)} />
                        ))}
                    </div>
                </>
            )}

            {/* Phase mute tooltip */}
            {phaseMuted && (
                <span style={{
                    fontSize: '0.5rem',
                    color: 'rgba(200,80,80,0.8)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.06em',
                    maxWidth: 70,
                    lineHeight: 1.2,
                }}>
                    NIGHT SILENCE
                </span>
            )}
        </motion.div>
    );
}
