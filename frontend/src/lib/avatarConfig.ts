// =============================================================================
// lib/avatarConfig.ts – Avatar part definitions for the modular avatar system
// =============================================================================

export interface AvatarPartOption {
  id: number;
  label: string;
  emoji: string; // used in text fallback
}

/** 10 head styles */
export const HEADS: AvatarPartOption[] = [
  { id: 0, label: 'Round', emoji: '😐' },
  { id: 1, label: 'Square', emoji: '🧱' },
  { id: 2, label: 'Slim', emoji: '🪦' },
  { id: 3, label: 'Wide', emoji: '🟫' },
  { id: 4, label: 'Oval', emoji: '🥚' },
  { id: 5, label: 'Angular', emoji: '💎' },
  { id: 6, label: 'Heavy', emoji: '🎭' },
  { id: 7, label: 'Thin', emoji: '🎪' },
  { id: 8, label: 'Rugged', emoji: '🏔️' },
  { id: 9, label: 'Sharp', emoji: '⚔️' },
];

/** 8 body styles */
export const BODIES: AvatarPartOption[] = [
  { id: 0, label: 'Suit', emoji: '🤵' },
  { id: 1, label: 'Trench Coat', emoji: '🧥' },
  { id: 2, label: 'Vest', emoji: '🦺' },
  { id: 3, label: 'Pinstripe', emoji: '👔' },
  { id: 4, label: 'Leather', emoji: '🥋' },
  { id: 5, label: 'Overcoat', emoji: '🧣' },
  { id: 6, label: 'Gangster', emoji: '💼' },
  { id: 7, label: 'Casual', emoji: '👕' },
];

/** 10 accessories */
export const ACCESSORIES: AvatarPartOption[] = [
  { id: 0, label: 'Fedora', emoji: '🎩' },
  { id: 1, label: 'Sunglasses', emoji: '🕶️' },
  { id: 2, label: 'Cigar', emoji: '🚬' },
  { id: 3, label: 'Gold Chain', emoji: '📿' },
  { id: 4, label: 'Scar', emoji: '⚡' },
  { id: 5, label: 'Eye Patch', emoji: '🏴‍☠️' },
  { id: 6, label: 'Bow Tie', emoji: '🎀' },
  { id: 7, label: 'Bandana', emoji: '🧢' },
  { id: 8, label: 'Gun Holster', emoji: '🔫' },
  { id: 9, label: 'Pocket Watch', emoji: '⌚' },
];

/** Available colors for avatar parts (dark/neon palette) */
export const AVATAR_COLORS: string[] = [
  '#1a1a1a', // near-black
  '#2a1a1a', // dark red tint
  '#1a2a1a', // dark green tint
  '#1a1a2a', // dark blue tint
  '#3a2a1a', // dark brown
  '#ff0000', // blood red
  '#ffd700', // gold
  '#00d4ff', // neon blue
  '#9b00ff', // neon purple
  '#00ff88', // neon green
  '#ff6600', // neon orange
  '#ffffff', // white
  '#888888', // gray
  '#4a4a4a', // dark gray
  '#c0392b', // deep crimson
  '#8b7355', // tan/khaki
];

/** Part color keys used per avatar */
export const COLOR_KEYS = ['skin', 'hair', 'outfit', 'accent'] as const;
export type ColorKey = typeof COLOR_KEYS[number];

/** Default avatar for new players */
export const DEFAULT_AVATAR = {
  head: 0,
  body: 0,
  accessory: 0,
  colors: {
    skin: '#8b7355',
    hair: '#1a1a1a',
    outfit: '#1a1a1a',
    accent: '#ffd700',
  } as Record<string, string>,
};

/** Helper: render avatar as SVG with given parts and colors */
export function renderAvatarSVG(
  head: number,
  body: number,
  accessory: number,
  colors: Record<string, string> | undefined | null,
  size = 80
): string {
  const c = colors ?? {};
  const skin = c.skin || '#8b7355';
  const hair = c.hair || '#1a1a1a';
  const outfit = c.outfit || '#1a1a1a';
  const accent = c.accent || '#ffd700';

  // Face width/height modifiers per head type
  const faceW = [36, 40, 30, 44, 34, 38, 42, 28, 38, 32][head] ?? 36;
  const faceH = [40, 38, 44, 36, 46, 40, 36, 48, 40, 42][head] ?? 40;

  // Body shapes
  const bodyShapes: Record<number, string> = {
    0: `<rect x="18" y="56" width="44" height="36" rx="3" fill="${outfit}"/>
        <rect x="24" y="56" width="8" height="18" rx="1" fill="${accent}" opacity="0.6"/>
        <line x1="40" y1="56" x2="40" y2="90" stroke="${accent}" stroke-width="1.5" opacity="0.4"/>`,
    1: `<path d="M14 56 L26 54 L40 58 L54 54 L66 56 L62 92 L40 95 L18 92 Z" fill="${outfit}" opacity="0.9"/>
        <rect x="22" y="55" width="4" height="30" fill="${accent}" opacity="0.3"/>
        <rect x="54" y="55" width="4" height="30" fill="${accent}" opacity="0.3"/>`,
    2: `<rect x="22" y="56" width="36" height="34" rx="2" fill="${outfit}"/>
        <path d="M22 56 Q40 50 58 56 L58 70 Q40 66 22 70 Z" fill="${accent}" opacity="0.5"/>`,
    3: `<rect x="18" y="56" width="44" height="36" fill="${outfit}"/>
        <line x1="24" y1="58" x2="24" y2="90" stroke="${accent}" stroke-width="1" opacity="0.5"/>
        <line x1="30" y1="58" x2="30" y2="90" stroke="${accent}" stroke-width="1" opacity="0.5"/>
        <line x1="36" y1="58" x2="36" y2="90" stroke="${accent}" stroke-width="1" opacity="0.5"/>`,
    4: `<path d="M20 58 L60 58 L64 92 L16 92 Z" fill="${outfit}"/>
        <rect x="16" y="65" width="48" height="3" fill="${accent}" opacity="0.3"/>`,
    5: `<rect x="16" y="54" width="48" height="38" rx="6" fill="${outfit}"/>
        <rect x="22" y="60" width="36" height="24" rx="3" fill="${skin}" opacity="0.2"/>`,
    6: `<path d="M18 56 L62 56 Q66 56 66 60 L66 92 L14 92 L14 60 Q14 56 18 56 Z" fill="${outfit}"/>
        <circle cx="38" cy="70" r="4" fill="${accent}" opacity="0.7"/>`,
    7: `<rect x="22" y="58" width="36" height="34" rx="8" fill="${outfit}"/>`,
  };

  // Accessory overrides
  const accShapes: Record<number, string> = {
    0: `<ellipse cx="40" cy="14" rx="22" ry="6" fill="${hair}"/>
        <rect x="20" y="10" width="40" height="8" rx="3" fill="${hair}"/>
        <rect x="14" y="16" width="52" height="4" rx="1" fill="${hair}"/>`,
    1: `<ellipse cx="40" cy="38" rx="18" ry="6" fill="#111" opacity="0.95"/>
        <rect x="22" y="35" width="36" height="7" rx="3" fill="#222"/>
        <ellipse cx="32" cy="38" rx="8" ry="4" fill="#444" opacity="0.8"/>
        <ellipse cx="48" cy="38" rx="8" ry="4" fill="#444" opacity="0.8"/>`,
    2: `<rect x="34" y="48" width="3" height="8" rx="1" fill="#8B6914"/>
        <ellipse cx="35" cy="50" rx="4" ry="2" fill="#D4A017" opacity="0.8"/>
        <path d="M35 56 Q36 62 38 64" stroke="#888" stroke-width="1" fill="none" opacity="0.6"/>`,
    3: `<circle cx="40" cy="70" r="5" fill="${accent}"/>
        <circle cx="40" cy="75" r="5" fill="${accent}" opacity="0.8"/>
        <circle cx="40" cy="80" r="5" fill="${accent}" opacity="0.6"/>`,
    4: `<line x1="30" y1="32" x2="50" y2="42" stroke="#cc0000" stroke-width="2"/>`,
    5: `<circle cx="28" cy="40" r="9" fill="#1a1a1a" stroke="${accent}" stroke-width="1.5"/>
        <line x1="19" y1="40" x2="37" y2="40" stroke="${accent}" stroke-width="1"/>`,
    6: `<path d="M32 52 Q40 46 48 52 Q44 56 40 53 Q36 56 32 52 Z" fill="${accent}"/>`,
    7: `<rect x="22" y="12" width="36" height="16" rx="4" fill="${hair}" opacity="0.9"/>
        <rect x="24" y="4" width="32" height="14" rx="3" fill="${accent}" opacity="0.5"/>`,
    8: `<rect x="52" y="60" width="8" height="12" rx="2" fill="#333"/>
        <rect x="53" y="62" width="6" height="2" fill="${accent}" opacity="0.6"/>`,
    9: `<circle cx="52" cy="68" r="6" fill="${accent}" stroke="#888" stroke-width="1"/>
        <circle cx="52" cy="68" r="3" fill="#888"/>`,
  };

  const bodyPath = bodyShapes[body] ?? bodyShapes[0];
  const accPath = accShapes[accessory] ?? '';
  const cx = 40;
  const cy = 36;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 80 100">
    <!-- Body -->
    ${bodyPath}
    <!-- Neck -->
    <rect x="35" y="52" width="10" height="8" rx="2" fill="${skin}"/>
    <!-- Head -->
    <ellipse cx="${cx}" cy="${cy}" rx="${faceW / 2}" ry="${faceH / 2}" fill="${skin}"/>
    <!-- Eyes -->
    <circle cx="${cx - 8}" cy="${cy - 2}" r="3" fill="#fff"/>
    <circle cx="${cx + 8}" cy="${cy - 2}" r="3" fill="#fff"/>
    <circle cx="${cx - 7}" cy="${cy - 2}" r="2" fill="#1a1a1a"/>
    <circle cx="${cx + 9}" cy="${cy - 2}" r="2" fill="#1a1a1a"/>
    <!-- Mouth -->
    <path d="M${cx - 7} ${cy + 9} Q${cx} ${cy + 14} ${cx + 7} ${cy + 9}" stroke="#5a3a2a" stroke-width="1.5" fill="none"/>
    <!-- Hair -->
    <ellipse cx="${cx}" cy="${cy - faceH / 2 + 4}" rx="${faceW / 2}" ry="8" fill="${hair}"/>
    <!-- Accessory -->
    ${accPath}
  </svg>`;
}
