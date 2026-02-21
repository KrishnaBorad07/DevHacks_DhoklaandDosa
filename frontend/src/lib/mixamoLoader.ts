// =============================================================================
// lib/mixamoLoader.ts
// Retargets Mixamo animation clips onto any RPM (or Mixamo-compatible) avatar.
//
// Mixamo animation FBX/GLB files use bone names like:
//   mixamorigHips, mixamorigSpine, mixamorigLeftArm  … etc.
//
// RPM avatars may use:
//   A) Same prefix:  mixamorigHips  (direct match — no remapping needed)
//   B) No prefix:    Hips, Spine, LeftArm  (need to strip prefix from tracks)
//   C) Colon style:  mixamorig:Hips  (Blender export variant)
//
// remapClip() handles all three cases automatically.
// =============================================================================
import * as THREE from 'three';

// ── Build a set of all bone names in a scene ──────────────────────────────────
export function collectBoneNames(root: THREE.Object3D): Set<string> {
  const names = new Set<string>();
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone && obj.name) names.add(obj.name);
  });
  return names;
}

// ── Remap a single track name to match the avatar's bone naming ───────────────
function remapTrackName(trackName: string, avatarBones: Set<string>): string {
  const dot = trackName.indexOf('.');
  if (dot === -1) return trackName;          // malformed, leave as-is
  const bonePart = trackName.slice(0, dot);
  const propPart = trackName.slice(dot);    // e.g. ".quaternion"

  // 1. Already matches
  if (avatarBones.has(bonePart)) return trackName;

  // 2. Strip mixamorig / mixamorig: prefix → bare name
  const bare = bonePart.replace(/^mixamorig:?/i, '');
  if (avatarBones.has(bare)) return bare + propPart;

  // 3. Add mixamorig prefix → prefixed name
  const prefixed = 'mixamorig' + bare;
  if (avatarBones.has(prefixed)) return prefixed + propPart;

  // 4. Add colon-style prefix
  const colonPrefixed = 'mixamorig:' + bare;
  if (avatarBones.has(colonPrefixed)) return colonPrefixed + propPart;

  // No match found — return original (will be silently ignored by THREE)
  return trackName;
}

// ── Retarget an AnimationClip to an avatar scene ─────────────────────────────
export function remapClip(
  clip: THREE.AnimationClip,
  avatarRoot: THREE.Object3D
): THREE.AnimationClip {
  const bones = collectBoneNames(avatarRoot);

  const remappedTracks = clip.tracks
    .filter((track) => !track.name.endsWith('.position')) // Mixamo uses cm, THREE.js uses meters — skip root motion
    .map((track) => {

    const newName = remapTrackName(track.name, bones);

    if (newName === track.name) return track; // no change needed

    // Clone track with new name — preserve type (Quaternion / Vector / Number)
    const Ctor = track.constructor as new (
      name: string, times: ArrayLike<number>, values: ArrayLike<number>, interpolation?: number
    ) => THREE.KeyframeTrack;

    return new Ctor(newName, track.times, track.values, track.getInterpolation());
  });

  return new THREE.AnimationClip(clip.name, clip.duration, remappedTracks as THREE.KeyframeTrack[]);
}

// ── Apply a Mixamo clip to a running AnimationMixer, return the action ────────
export function applyMixamoClip(
  mixer: THREE.AnimationMixer,
  clip: THREE.AnimationClip,
  avatarRoot: THREE.Object3D,
  options: {
    loop?: boolean;
    clampWhenFinished?: boolean;
    timeScale?: number;
    fadeInDuration?: number;
  } = {}
): THREE.AnimationAction {
  const {
    loop = true,
    clampWhenFinished = false,
    timeScale = 1,
    fadeInDuration = 0,
  } = options;

  const remapped = remapClip(clip, avatarRoot);
  const action = mixer.clipAction(remapped);
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.clampWhenFinished = clampWhenFinished;
  action.timeScale = timeScale;
  if (fadeInDuration > 0) action.fadeIn(fadeInDuration);
  action.play();
  return action;
}

// ── Hook-friendly: create + manage a mixer for an avatar scene ────────────────
export function createAvatarMixer(avatarRoot: THREE.Object3D) {
  const mixer = new THREE.AnimationMixer(avatarRoot);
  let currentAction: THREE.AnimationAction | null = null;

  return {
    mixer,
    /** Switch to a new clip, cross-fading from the current one */
    play(clip: THREE.AnimationClip, fadeDuration = 0.25, loop = true) {
      const prev = currentAction;
      const remapped = remapClip(clip, avatarRoot);
      const next = mixer.clipAction(remapped);
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      next.reset();
      if (prev && fadeDuration > 0) {
        next.crossFadeFrom(prev, fadeDuration, true);
      } else {
        if (prev) prev.stop();
        next.play();
      }
      currentAction = next;
      return next;
    },
    stop() { currentAction?.stop(); },
    dispose() { mixer.stopAllAction(); },
  };
}
