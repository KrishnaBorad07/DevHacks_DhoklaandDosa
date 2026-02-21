// =============================================================================
// lib/avatarAnimations.ts
// Procedural skeletal animation clips for Ready Player Me (Mixamo rig) avatars.
// Uses THREE.AnimationMixer + KeyframeTrack — no external animation files needed.
//
// RPM full-body avatars use the Mixamo humanoid bone naming convention:
//   Hips > Spine > Spine1 > Spine2 > Neck > Head
//   Spine2 > LeftShoulder > LeftArm > LeftForeArm > LeftHand
//   Spine2 > RightShoulder > RightArm > RightForeArm > RightHand
//   Hips > LeftUpLeg > LeftLeg > LeftFoot
//   Hips > RightUpLeg > RightLeg > RightFoot
// =============================================================================
import * as THREE from 'three';

export type AnimationType = 'idle' | 'walk' | 'excited';

// ── Utility ───────────────────────────────────────────────────────────────────
/**  Build a quaternion from axis (unit) + angle (radians) and push floats into array */
function pushQuat(arr: number[], ax: number, ay: number, az: number, angle: number) {
  const s = Math.sin(angle / 2);
  arr.push(ax * s, ay * s, az * s, Math.cos(angle / 2));
}

function buildTimes(count: number, duration: number): number[] {
  return Array.from({ length: count }, (_, i) => (i / (count - 1)) * duration);
}

// ── Idle / breathing ──────────────────────────────────────────────────────────
export function createIdleClip(): THREE.AnimationClip {
  const duration = 3.2;
  const n = 13;
  const times = buildTimes(n, duration);
  const tracks: THREE.KeyframeTrack[] = [];

  // Chest breathing — Spine1 X rotation (safe, doesn't conflict with A-pose arms)
  const spineQ: number[] = [];
  for (let i = 0; i < n; i++) {
    const phase = (i / (n - 1)) * Math.PI * 2;
    pushQuat(spineQ, 1, 0, 0, Math.sin(phase) * 0.025);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('Spine1.quaternion', times, spineQ));

  // Upper chest follow (slight lag)
  const spine2Q: number[] = [];
  for (let i = 0; i < n; i++) {
    const phase = (i / (n - 1)) * Math.PI * 2 - 0.3;
    pushQuat(spine2Q, 1, 0, 0, Math.sin(phase) * 0.015);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('Spine2.quaternion', times, spine2Q));

  // Head gentle side sway — Y axis (safe, just turns head slightly)
  const headQ: number[] = [];
  for (let i = 0; i < n; i++) {
    const phase = (i / (n - 1)) * Math.PI * 2 * 0.5;
    pushQuat(headQ, 0, 1, 0, Math.sin(phase) * 0.04);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('Head.quaternion', times, headQ));

  // Hip minor height shift (breathing bob)
  const hipPos: number[] = [];
  for (let i = 0; i < n; i++) {
    const phase = (i / (n - 1)) * Math.PI * 2;
    hipPos.push(0, Math.sin(phase) * 0.007, 0);
  }
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, hipPos));

  return new THREE.AnimationClip('idle', duration, tracks);
}


// ── Walk cycle ────────────────────────────────────────────────────────────────
export function createWalkClip(): THREE.AnimationClip {
  const duration = 1.0; // 1 second per full gait cycle
  const n = 17;
  const times = buildTimes(n, duration);
  const tracks: THREE.KeyframeTrack[] = [];

  const phase = (i: number) => (i / (n - 1)) * Math.PI * 2;

  // Hips Y-bounce (up on each step)
  const hipPos: number[] = [];
  for (let i = 0; i < n; i++) {
    hipPos.push(0, Math.abs(Math.sin(phase(i))) * 0.04 - 0.01, 0);
  }
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, hipPos));

  // Hips lateral sway (Z rotation)
  const hipQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(hipQ, 0, 0, 1, Math.sin(phase(i)) * 0.09);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('Hips.quaternion', times, hipQ));

  // Spine counter-rotate to hips (body stays balanced)
  const spineQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(spineQ, 0, 0, 1, -Math.sin(phase(i)) * 0.05);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('Spine.quaternion', times, spineQ));

  // Left ARM swing (forward when right leg moves forward)
  const lArmQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(lArmQ, 1, 0, 0, Math.sin(phase(i)) * 0.55);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', times, lArmQ));

  // Right ARM (opposite phase)
  const rArmQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(rArmQ, 1, 0, 0, -Math.sin(phase(i)) * 0.55);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('RightArm.quaternion', times, rArmQ));

  // Forearms slight curl (relaxed)
  const lForearmQ: number[] = [];
  const rForearmQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(lForearmQ, 1, 0, 0, 0.25 + Math.abs(Math.sin(phase(i))) * 0.15);
    pushQuat(rForearmQ, 1, 0, 0, 0.25 + Math.abs(Math.sin(phase(i))) * 0.15);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('LeftForeArm.quaternion', times, lForearmQ));
  tracks.push(new THREE.QuaternionKeyframeTrack('RightForeArm.quaternion', times, rForearmQ));

  // Left LEG swing (opposite to left arm)
  const lLegQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(lLegQ, 1, 0, 0, -Math.sin(phase(i)) * 0.50);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('LeftUpLeg.quaternion', times, lLegQ));

  // Right LEG (opposite phase)
  const rLegQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(rLegQ, 1, 0, 0, Math.sin(phase(i)) * 0.50);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('RightUpLeg.quaternion', times, rLegQ));

  // Lower legs (knee bend on backswing)
  const lKneeQ: number[] = [];
  const rKneeQ: number[] = [];
  for (let i = 0; i < n; i++) {
    lKneeQ.push(0, 0, 0, 1); // neutral — RPM lower legs have complex IK, keep simple
    rKneeQ.push(0, 0, 0, 1);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('LeftLeg.quaternion', times, lKneeQ));
  tracks.push(new THREE.QuaternionKeyframeTrack('RightLeg.quaternion', times, rKneeQ));

  // Head slight side-to-side (synced with steps)
  const headQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(headQ, 0, 0, 1, Math.sin(phase(i)) * 0.04);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('Head.quaternion', times, headQ));

  return new THREE.AnimationClip('walk', duration, tracks);
}

// ── Excited / cheer (post-save) ───────────────────────────────────────────────
export function createExcitedClip(): THREE.AnimationClip {
  const duration = 0.6;
  const n = 13;
  const times = buildTimes(n, duration);
  const tracks: THREE.KeyframeTrack[] = [];
  const phase = (i: number) => (i / (n - 1)) * Math.PI * 2 * 2; // 2 cycles

  const lArmQ: number[] = [];
  const rArmQ: number[] = [];
  for (let i = 0; i < n; i++) {
    pushQuat(lArmQ, 1, 0, 0, -Math.PI * 0.6 + Math.sin(phase(i)) * 0.3);
    pushQuat(rArmQ, 1, 0, 0, -Math.PI * 0.6 + Math.sin(phase(i) + Math.PI) * 0.3);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', times, lArmQ));
  tracks.push(new THREE.QuaternionKeyframeTrack('RightArm.quaternion', times, rArmQ));

  const hipPos: number[] = [];
  for (let i = 0; i < n; i++) {
    hipPos.push(0, Math.abs(Math.sin(phase(i))) * 0.08, 0);
  }
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, hipPos));

  return new THREE.AnimationClip('excited', duration, tracks);
}

// ── AnimationMixer helper hook ─────────────────────────────────────────────────
// Returns an update function — call it every frame with delta time.
// Automatically disposes on unmount.
export function createMixer(
  root: THREE.Object3D,
  clip: THREE.AnimationClip,
  { loop = true, clampWhenFinished = false } = {}
): { update: (dt: number) => void; stop: () => void; mixer: THREE.AnimationMixer } {
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.clampWhenFinished = clampWhenFinished;
  action.play();
  return {
    mixer,
    update: (dt) => mixer.update(dt),
    stop: () => { action.stop(); mixer.stopAllAction(); },
  };
}
