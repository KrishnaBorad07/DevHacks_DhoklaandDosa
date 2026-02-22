// =============================================================================
// components/Chat.tsx – Global + Mafia-only chat
// =============================================================================
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, ChatChannel } from '../types/game';

interface ChatProps {
  messages: ChatMessage[];
  myId: string | null;
  myRole: string | null;
  alive: boolean;
  roomCode: string;
  onSend: (code: string, text: string, channel: ChatChannel) => void;
  aliveMafiaCount: number;
}

export function Chat({ messages, myId, myRole, alive, roomCode, onSend, aliveMafiaCount }: ChatProps) {
  const [channel, setChannel] = useState<ChatChannel>('global');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUseMafiaChat = myRole === 'mafia' && aliveMafiaCount > 1;

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !alive) return;
    onSend(roomCode, trimmed, channel);
    setInput('');
  };

  const filteredMessages = messages.filter(
    (m) => m.channel === 'global' || (m.channel === 'mafia' && channel === 'mafia' && myRole === 'mafia')
  );

  const displayMessages = filteredMessages.filter((m) => {
    if (channel === 'mafia') return m.channel === 'mafia';
    return m.channel === 'global';
  });

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="glass-card flex flex-col"
      style={{
        height: '100%',
        minHeight: 300,
      }}
    >
      {/* Header tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,215,0,0.12)', flexShrink: 0 }}>
        <ChannelTab
          label="CITY RADIO"
          active={channel === 'global'}
          onClick={() => setChannel('global')}
          color="var(--noir-gold)"
        />
        {canUseMafiaChat && (
          <ChannelTab
            label="🔴 SYNDICATE"
            active={channel === 'mafia'}
            onClick={() => setChannel('mafia')}
            color="var(--noir-red)"
          />
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
      >
        <AnimatePresence initial={false}>
          {displayMessages.map((msg, i) => {
            const isSystem = msg.senderId === 'system';
            const isVote = msg.senderId === 'vote';
            const isKill = isSystem && msg.text.toLowerCase().includes('eliminated');

            // Choose left-border style
            let borderStyle: React.CSSProperties;
            if (isKill) {
              borderStyle = {
                borderLeft: '2px solid rgba(255,40,40,0.85)',
                paddingLeft: '0.5rem',
                background: 'rgba(80,0,0,0.28)',
                borderRadius: '0 3px 3px 0',
              };
            } else if (isVote) {
              borderStyle = {
                borderLeft: '2px solid rgba(255,100,40,0.9)',
                paddingLeft: '0.5rem',
                background: 'rgba(60,20,0,0.22)',
                borderRadius: '0 3px 3px 0',
              };
            } else {
              borderStyle = {
                borderLeft: `2px solid ${isSystem
                  ? 'rgba(255,215,0,0.3)'
                  : msg.channel === 'mafia'
                    ? 'var(--noir-red)'
                    : 'rgba(255,215,0,0.2)'
                  }`,
                paddingLeft: '0.5rem',
                opacity: isSystem ? 0.7 : 1,
              };
            }

            return (
              <motion.div
                key={`${msg.timestamp}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={borderStyle}
              >
                {/* Sender name row — only for real player messages */}
                {!isSystem && !isVote && (
                  <div className="flex items-center gap-2">
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.85rem',
                      color: msg.senderId === myId ? 'var(--noir-gold)' : '#c0a060',
                      letterSpacing: '0.08em',
                    }}>
                      {msg.senderName}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--noir-text-dim)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message body */}
                {isKill ? (
                  <p style={{
                    fontSize: '0.78rem',
                    color: '#ff5555',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.06em',
                    lineHeight: 1.4,
                    textShadow: '0 0 8px rgba(255,40,40,0.5)',
                  }}>
                    ☠ {msg.text}
                  </p>
                ) : isVote ? (
                  <p style={{
                    fontSize: '0.74rem',
                    color: '#ff7a40',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.05em',
                    lineHeight: 1.4,
                    textShadow: '0 0 6px rgba(255,80,20,0.4)',
                  }}>
                    ⚖ {msg.text}
                  </p>
                ) : (
                  <p style={{
                    fontSize: '0.8rem',
                    color: isSystem ? 'var(--noir-text-dim)' : 'var(--noir-text)',
                    fontStyle: isSystem ? 'italic' : 'normal',
                    lineHeight: 1.4,
                  }}>
                    {msg.text}
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {displayMessages.length === 0 && (
          <p style={{ color: 'var(--noir-text-dim)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>
            The city is quiet...
          </p>
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(255,215,0,0.1)', padding: '0.5rem 0.75rem', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input
          ref={inputRef}
          className="input-noir"
          type="text"
          placeholder={!alive ? 'Spectators cannot chat' : 'Message…'}
          value={input}
          disabled={!alive}
          maxLength={300}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
        />
        <button
          className="btn-noir btn-gold"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
          disabled={!alive || !input.trim()}
          onClick={handleSend}
        >
          ↵
        </button>
      </div>
    </div>
  );
}

function ChannelTab({
  label, active, onClick, color,
}: {
  label: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '0.5rem',
        fontFamily: 'var(--font-display)',
        fontSize: '0.6rem',
        letterSpacing: '0.1em',
        background: 'transparent',
        color: active ? color : 'var(--noir-text-dim)',
        border: 'none',
        borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 180ms',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}
