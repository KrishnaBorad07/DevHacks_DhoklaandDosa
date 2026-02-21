// =============================================================================
// components/AvatarPicker.tsx – Lego-style modular avatar customizer
// =============================================================================
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HEADS,
  BODIES,
  ACCESSORIES,
  AVATAR_COLORS,
  COLOR_KEYS,
  DEFAULT_AVATAR,
  renderAvatarSVG,
} from '../lib/avatarConfig';
import type { Avatar } from '../types/game';

interface AvatarPickerProps {
  value: Avatar;
  onChange: (avatar: Avatar) => void;
}

type ColorKey = 'skin' | 'hair' | 'outfit' | 'accent';

const COLOR_KEY_LABELS: Record<ColorKey, string> = {
  skin: 'Skin',
  hair: 'Hair',
  outfit: 'Outfit',
  accent: 'Accent',
};

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [activeColorKey, setActiveColorKey] = useState<ColorKey>('skin');

  const setHead      = useCallback((h: number) => onChange({ ...value, head: h }), [value, onChange]);
  const setBody      = useCallback((b: number) => onChange({ ...value, body: b }), [value, onChange]);
  const setAccessory = useCallback((a: number) => onChange({ ...value, accessory: a }), [value, onChange]);
  const setColor     = useCallback(
    (color: string) => onChange({ ...value, colors: { ...value.colors, [activeColorKey]: color } }),
    [value, onChange, activeColorKey]
  );

  const svgString = renderAvatarSVG(value.head, value.body, value.accessory, value.colors, 120);

  return (
    <div className="glass-card p-4" style={{ maxWidth: 380 }}>
      <h3 className="heading-gold text-center mb-4" style={{ fontSize: '1rem', letterSpacing: '0.15em' }}>
        CUSTOMIZE YOUR IDENTITY
      </h3>

      {/* Preview */}
      <div className="flex justify-center mb-4">
        <motion.div
          style={{
            width: 120,
            height: 120,
            borderRadius: 4,
            border: '2px solid rgba(255,215,0,0.3)',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
      </div>

      {/* Section: Heads */}
      <PartSection label="HEAD">
        <PartGrid
          options={HEADS}
          selected={value.head}
          onSelect={setHead}
        />
      </PartSection>

      {/* Section: Bodies */}
      <PartSection label="BODY">
        <PartGrid
          options={BODIES}
          selected={value.body}
          onSelect={setBody}
        />
      </PartSection>

      {/* Section: Accessories */}
      <PartSection label="ACCESSORY">
        <PartGrid
          options={ACCESSORIES}
          selected={value.accessory}
          onSelect={setAccessory}
        />
      </PartSection>

      {/* Section: Colors */}
      <PartSection label="COLORS">
        {/* Color key tabs */}
        <div className="flex gap-2 mb-2">
          {(COLOR_KEYS as readonly ColorKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveColorKey(key)}
              style={{
                flex: 1,
                padding: '0.25rem',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
                border: `1px solid ${activeColorKey === key ? 'var(--noir-gold)' : 'rgba(255,215,0,0.2)'}`,
                background: activeColorKey === key ? 'rgba(255,215,0,0.15)' : 'transparent',
                color: activeColorKey === key ? 'var(--noir-gold)' : 'var(--noir-text-dim)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              {COLOR_KEY_LABELS[key]}
              <div
                style={{
                  width: '100%',
                  height: 4,
                  borderRadius: 2,
                  background: value.colors[key] || '#888',
                  marginTop: 3,
                }}
              />
            </button>
          ))}
        </div>

        {/* Color swatches */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
          }}
        >
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              title={color}
              onClick={() => setColor(color)}
              style={{
                width: '100%',
                aspectRatio: '1',
                background: color,
                borderRadius: 2,
                border: value.colors[activeColorKey] === color
                  ? '2px solid var(--noir-gold)'
                  : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'transform 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ))}
        </div>
      </PartSection>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PartSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p style={{
        fontSize: '0.65rem',
        letterSpacing: '0.15em',
        color: 'var(--noir-text-dim)',
        marginBottom: '0.4rem',
        fontFamily: 'var(--font-display)',
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function PartGrid({
  options,
  selected,
  onSelect,
}: {
  options: { id: number; label: string; emoji: string }[];
  selected: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 4,
      }}
    >
      {options.map((opt) => (
        <motion.button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title={opt.label}
          style={{
            padding: '0.25rem',
            fontSize: '1.2rem',
            lineHeight: 1,
            background: selected === opt.id ? 'rgba(255,215,0,0.15)' : 'rgba(26,26,26,0.9)',
            border: `1px solid ${selected === opt.id ? 'var(--noir-gold)' : 'rgba(255,215,0,0.15)'}`,
            borderRadius: 2,
            cursor: 'pointer',
            boxShadow: selected === opt.id ? '0 0 8px rgba(255,215,0,0.3)' : 'none',
          }}
        >
          {opt.emoji}
        </motion.button>
      ))}
    </div>
  );
}

/** Export default avatar */
export { DEFAULT_AVATAR };
