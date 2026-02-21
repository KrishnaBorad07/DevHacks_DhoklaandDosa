// =============================================================================
// lib/avatarUtils.ts – Ready Player Me avatar helpers
// =============================================================================

/** Extract the avatar ID from a full RPM GLB URL */
export function getAvatarId(url: string): string {
  // e.g. https://models.readyplayer.me/638df693d72bffc6fa17943c.glb → 638df693d72bffc6fa17943c
  return url
    .replace('https://models.readyplayer.me/', '')
    .replace('.glb', '')
    .split('?')[0];
}

/**
 * Get the RPM headshot PNG.
 * Using plain .png with no extra params — camera/quality params break demo avatars.
 * Simple format: https://models.readyplayer.me/{id}.png
 */
export function getHeadshotUrl(url: string): string {
  if (!url) return '';
  const id = getAvatarId(url);
  return `https://models.readyplayer.me/${id}.png`;
}

/** Get a portrait PNG URL (larger, half-body) */
export function getPortraitUrl(url: string, size = 256): string {
  if (!url) return '';
  const id = getAvatarId(url);
  return `https://models.readyplayer.me/${id}.png?scene=fullbody-portrait-v1-transparent&size=${size}`;
}

/** Default empty avatar (no RPM URL created yet) */
export const DEFAULT_AVATAR = { url: '' };

/** Get player initials for the fallback avatar */
export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** Generate a deterministic background color from a player name */
export function getAvatarColor(name: string): string {
  const COLORS = ['#c0392b', '#8e44ad', '#1a5276', '#117a65', '#784212', '#2c3e50'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[Math.abs(hash)];
}
