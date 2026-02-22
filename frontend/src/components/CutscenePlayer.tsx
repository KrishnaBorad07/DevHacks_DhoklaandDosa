// =============================================================================
// components/CutscenePlayer.tsx – Fully 3D cinematic cutscene
// Plays the victim's RPM avatar through a kill/save animation sequence.
// Uses Mixamo animation files from /animations/ when available,
// falls back to procedural direct-bone manipulation otherwise.
// =============================================================================
import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { CutscenePayload } from '../types/game';

// ── Phase types ───────────────────────────────────────────────────────────────
type CutscenePhase =
  | 'intro'      // 2.5s — victim standing, slow camera push-in
  | 'approach'   // 2.0s — mafia figure emerges from darkness
  | 'attack'     // 0.6s — muzzle flash / knife flash
  | 'impact'     // 2.5s — victim falls (kill) OR wobbles + doctor saves
  | 'result';    // 3.0s — outcome text lingers, then onComplete

const PHASE_DURATIONS: Record<CutscenePhase, number> = {
  intro: 2500, approach: 2000, attack: 600, impact: 2500, result: 3000,
};
const PHASE_ORDER: CutscenePhase[] = ['intro', 'approach', 'attack', 'impact', 'result'];

// ── Easing helpers ────────────────────────────────────────────────────────────
const easeIn = (t: number) => t * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── Find a bone by multiple naming conventions ────────────────────────────────
function findBone(bones: Map<string, THREE.Bone>, ...names: string[]): THREE.Bone | null {
  for (const name of names) {
    if (bones.has(name)) return bones.get(name)!;
    if (bones.has('mixamorig' + name)) return bones.get('mixamorig' + name)!;
    if (bones.has('mixamorig:' + name)) return bones.get('mixamorig:' + name)!;
  }
  return null;
}

// ── Ground ────────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#090909" roughness={1} />
    </mesh>
  );
}

// ── Blood particle ─────────────────────────────────────────────────────────────
function BloodParticle({ idx, startTime }: { idx: number; startTime: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const vx = Math.sin(idx * 2.4) * 1.8 + Math.cos(idx) * 0.5;
  const vz = Math.cos(idx * 1.9) * 1.8 + Math.sin(idx * 0.7) * 0.5;
  const vy = 2.2 + (idx % 3) * 0.5;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clamp((clock.elapsedTime * 1000 - startTime) / 1000, 0, 3);
    if (t <= 0) { ref.current.visible = false; return; }
    ref.current.visible = true;
    ref.current.position.set(vx * t * 0.7, Math.max(0, vy * t - 0.5 * 4.5 * t * t), vz * t * 0.7);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = clamp(1 - t * 0.9, 0, 1);
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.04 + Math.abs(Math.sin(idx * 3)) * 0.04, 4, 4]} />
      <meshStandardMaterial color="#cc0000" emissive="#880000" emissiveIntensity={0.8} transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}

// ── Healing particle ──────────────────────────────────────────────────────────
function HealingParticle({ idx, startTime }: { idx: number; startTime: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const angle = (idx / 12) * Math.PI * 2;
  const speed = 1.2 + (idx % 3) * 0.4;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clamp((clock.elapsedTime * 1000 - startTime) / 1000, 0, 2.5);
    if (t <= 0) { ref.current.visible = false; return; }
    ref.current.visible = true;
    ref.current.position.set(Math.cos(angle + t) * t * speed * 0.6, 0.8 + t * 0.8, Math.sin(angle + t) * t * speed * 0.6);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = clamp((1 - t / 2.0) * 1.3, 0, 1);
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.05, 4, 4]} />
      <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={3} transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}

// ── Dramatic lighting ─────────────────────────────────────────────────────────
function DramaticLights({ phase, saved }: { phase: CutscenePhase; saved: boolean }) {
  const killRef = useRef<THREE.PointLight>(null);
  const saveRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (killRef.current) killRef.current.intensity = (phase === 'attack' || phase === 'impact') ? (saved ? 0 : 3 + Math.sin(t * 8) * 0.6) : 0.5;
    if (saveRef.current) saveRef.current.intensity = (phase === 'impact' && saved) ? 2.5 + Math.sin(t * 5) * 0.5 : 0;
  });
  return (
    <>
      <directionalLight position={[3, 5, 2]} intensity={0.8} color="#ffe8c0" castShadow />
      <directionalLight position={[0, 3, 6]} intensity={0.5} color="#c0d8ff" />
      <pointLight ref={killRef} position={[1, 2, 2]} color="#ff2200" intensity={0.5} distance={10} />
      <pointLight ref={saveRef} position={[0, 2, 2]} color="#00ff88" intensity={0} distance={10} />
    </>
  );
}

// ── Mafia silhouette ──────────────────────────────────────────────────────────
function MafiaFigure({ phase }: { phase: CutscenePhase }) {
  const ref = useRef<THREE.Group>(null);
  const visible = phase === 'approach' || phase === 'attack' || phase === 'impact' || phase === 'result';
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.02; });
  return (
    <group ref={ref} position={[-1.4, 0, -1.8]} rotation={[0, Math.PI * 0.22, 0]}>
      <group visible={visible}>
        <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 1.0, 8]} /><meshStandardMaterial color="#050505" roughness={0.9} /></mesh>
        <mesh position={[0, 1.38, 0]}><cylinderGeometry args={[0.09, 0.11, 0.18, 8]} /><meshStandardMaterial color="#050505" /></mesh>
        <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.24, 10, 10]} /><meshStandardMaterial color="#050505" roughness={0.9} /></mesh>
        <mesh position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.28, 0.04, 6, 20]} /><meshStandardMaterial color="#020202" /></mesh>
        <mesh position={[0.09, 1.68, 0.22]}><sphereGeometry args={[0.028, 6, 6]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} /></mesh>
        <mesh position={[-0.09, 1.68, 0.22]}><sphereGeometry args={[0.028, 6, 6]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} /></mesh>
      </group>
    </group>
  );
}

// ── Doctor silhouette ─────────────────────────────────────────────────────────
function DoctorFigure({ phase, saved }: { phase: CutscenePhase; saved: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const visible = saved && (phase === 'impact' || phase === 'result');
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.8) * 0.025; });
  return (
    <group ref={ref} position={[1.6, 0, -1.2]} rotation={[0, -Math.PI * 0.28, 0]}>
      <group visible={visible}>
        <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 1.0, 8]} /><meshStandardMaterial color="#ffffff" roughness={0.6} emissive="#00ff88" emissiveIntensity={0.4} /></mesh>
        <mesh position={[0, 1.38, 0]}><cylinderGeometry args={[0.09, 0.11, 0.18, 8]} /><meshStandardMaterial color="#eeeeee" /></mesh>
        <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.24, 10, 10]} /><meshStandardMaterial color="#eeeeee" roughness={0.6} emissive="#00ff88" emissiveIntensity={0.3} /></mesh>
        <mesh position={[0.09, 1.68, 0.22]}><sphereGeometry args={[0.028, 6, 6]} /><meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={4} /></mesh>
        <mesh position={[-0.09, 1.68, 0.22]}><sphereGeometry args={[0.028, 6, 6]} /><meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={4} /></mesh>
      </group>
    </group>
  );
}

// ── Camera: push-in + shake on attack ────────────────────────────────────────
function CameraController({ phase }: { phase: CutscenePhase }) {
  const { camera } = useThree();
  const shakeStart = useRef(0);
  useEffect(() => { if (phase === 'attack') shakeStart.current = Date.now(); }, [phase]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pushIn = phase === 'intro' ? t * 0.12 : 0.3;
    const baseZ = Math.max(2.8, 4.0 - pushIn);
    let sx = 0, sy = 0;
    if (phase === 'attack') {
      const elapsed = (Date.now() - shakeStart.current) / 1000;
      const intensity = Math.max(0, 1 - elapsed * 5) * 0.08;
      sx = (Math.random() - 0.5) * intensity;
      sy = (Math.random() - 0.5) * intensity;
    }
    camera.position.set(0.4 + sx, 1.4 + sy, baseZ);
    camera.lookAt(0, 0.9, 0);
  });
  return null;
}


// ── RPM Avatar ───────────────────────────────────────────────────────────────────
function AvatarModel({ url, phase, phaseProgress, saved }: {
  url: string; phase: CutscenePhase; phaseProgress: number; saved: boolean;
}) {
  const { scene } = useGLTF(url);

  // ⚠️ MUST use cloneSkeleton — scene.clone(true) doesn't rebind SkinnedMesh
  // to cloned bones, so AnimationMixer can't find the skeleton.
  const model = useMemo(() => {
    const m = cloneSkeleton(scene);
    m.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).castShadow = true; });
    return m;
  }, [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const prevTimeRef = useRef(0);
  const clipsRef = useRef<{ walk: THREE.AnimationClip | null; falling: THREE.AnimationClip | null; victory: THREE.AnimationClip | null }>
    ({ walk: null, falling: null, victory: null });
  const hasFBXRef = useRef(false);
  const currentPhaseRef = useRef<CutscenePhase>(phase);

  // ── Shared helper: filter positions, remap bone names ────────────────────────
  const makeClip = (raw: THREE.AnimationClip, name: string, avatarBones: Set<string>): THREE.AnimationClip => {
    const tracks = raw.tracks
      .filter((t) => !t.name.endsWith('.position'))
      .map((track) => {
        const dot = track.name.indexOf('.');
        if (dot === -1) return track;
        const bone = track.name.slice(0, dot);
        const prop = track.name.slice(dot);
        if (avatarBones.has(bone)) return track;
        const bare = bone.replace(/^mixamorig:?/i, '');
        if (avatarBones.has(bare)) {
          const Ctor = track.constructor as new (n: string, t: ArrayLike<number>, v: ArrayLike<number>) => THREE.KeyframeTrack;
          return new Ctor(bare + prop, track.times, track.values);
        }
        const prefixed = 'mixamorig' + bare;
        if (avatarBones.has(prefixed)) {
          const Ctor = track.constructor as new (n: string, t: ArrayLike<number>, v: ArrayLike<number>) => THREE.KeyframeTrack;
          return new Ctor(prefixed + prop, track.times, track.values);
        }
        return track;
      });
    return new THREE.AnimationClip(name, raw.duration, tracks as THREE.KeyframeTrack[]);
  };

  // ── Load walk + falling + victory FBX in parallel ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    prevTimeRef.current = 0;

    const loadFBX = (path: string): Promise<THREE.AnimationClip | null> =>
      new Promise((resolve) => {
        new FBXLoader().load(path,
          (fbx) => { console.log(`[Cutscene] ✓ ${path}`); resolve(fbx.animations[0] ?? null); },
          undefined,
          (e) => { console.warn(`[Cutscene] ✗ ${path}`, e); resolve(null); }
        );
      });

    Promise.all([
      loadFBX('/animations/walk.fbx'),
      loadFBX('/animations/falling.fbx'),
      loadFBX('/animations/victory.fbx'),
    ]).then(([walkRaw, fallingRaw, victoryRaw]) => {
      if (cancelled) return;

      // Build bone set once
      const avatarBones = new Set<string>();
      model.traverse((o) => { if ((o as THREE.Bone).isBone) avatarBones.add(o.name); });
      console.log('[Cutscene] bones:', Array.from(avatarBones).sort().join(', '));

      clipsRef.current = {
        walk: walkRaw ? makeClip(walkRaw, 'walk', avatarBones) : null,
        falling: fallingRaw ? makeClip(fallingRaw, 'falling', avatarBones) : null,
        victory: victoryRaw ? makeClip(victoryRaw, 'victory', avatarBones) : null,
      };
      hasFBXRef.current = !!(clipsRef.current.walk || clipsRef.current.falling);

      // Start the clip that matches the current phase
      const { walk, falling, victory } = clipsRef.current;
      const cur = currentPhaseRef.current;
      let clipToPlay: THREE.AnimationClip | null = null;
      let loop = true;

      if (cur === 'intro' || cur === 'approach' || cur === 'attack') {
        clipToPlay = walk;
      } else if (cur === 'impact' || cur === 'result') {
        clipToPlay = saved ? (victory ?? walk) : (falling ?? walk);
        loop = !!saved;
      }

      if (clipToPlay && mixerRef.current) {
        const action = mixerRef.current.clipAction(clipToPlay);
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.clampWhenFinished = !loop;
        action.play();
      }
    });

    return () => { cancelled = true; mixer.stopAllAction(); mixerRef.current = null; };
  }, [model, saved]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase changes → crossfade clips ──────────────────────────────────────────
  useEffect(() => {
    currentPhaseRef.current = phase;
    const mixer = mixerRef.current;
    if (!mixer || !hasFBXRef.current) return;

    const { walk, falling, victory } = clipsRef.current;
    let next: THREE.AnimationClip | null = null;
    let loop = true;

    if (phase === 'intro' || phase === 'approach' || phase === 'attack') {
      next = walk;
    } else if (phase === 'impact') {
      next = saved ? (victory ?? walk) : (falling ?? walk);
      loop = !!saved;
    }

    if (!next) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(next);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.reset().play();
  }, [phase, saved]); // eslint-disable-line react-hooks/exhaustive-deps



  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const dt = t - prevTimeRef.current;
    prevTimeRef.current = t;
    if (mixerRef.current) mixerRef.current.update(dt);

    // Group-level physics (works on top of walk animation)
    if (phase === 'intro' || phase === 'approach') {
      g.rotation.x = 0; g.position.set(0, 0, 0);
    } else if (phase === 'attack') {
      g.rotation.x = phaseProgress * 0.08;
    } else if (phase === 'impact' && !saved) {
      const prog = easeIn(clamp(phaseProgress * 1.4, 0, 1));
      g.rotation.x = prog * (Math.PI / 2.05);
      g.position.y = -prog * 0.55;
      g.position.z = prog * 0.30;
    } else if (phase === 'impact' && saved) {
      if (phaseProgress < 0.3) {
        g.rotation.x = Math.sin(phaseProgress * 60) * 0.1 * (1 - phaseProgress / 0.3);
      } else {
        g.rotation.x *= 0.88; g.position.y *= 0.92;
      }
      // Green glow
      model.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && !Array.isArray(m.material)) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            const i = phaseProgress > 0.3 ? Math.max(0, (1 - (phaseProgress - 0.3) / 0.7)) * 0.7 : 0;
            mat.emissive.setRGB(0, i, i * 0.5); mat.emissiveIntensity = 1;
          }
        }
      });
    } else if (phase === 'result' && !saved) {
      g.rotation.x = Math.PI / 2.05; g.position.y = -0.55; g.position.z = 0.30;
    } else if (phase === 'result' && saved) {
      g.rotation.x *= 0.95; g.position.y *= 0.95;
    }
  });

  return <group ref={groupRef}><primitive object={model} position={[0, -0.02, 0]} scale={[1.05, 1.05, 1.05]} /></group>;
}


// ── Geometric fallback (no RPM avatar) ───────────────────────────────────────
function GeometricVictim({ phase, phaseProgress, saved, color }: {
  phase: CutscenePhase; phaseProgress: number; saved: boolean; color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (phase === 'impact' && !saved) {
      const prog = easeIn(clamp(phaseProgress * 1.4, 0, 1));
      g.rotation.x = prog * (Math.PI / 2.05); g.position.y = -prog * 0.55;
    } else if (phase === 'result' && !saved) {
      g.rotation.x = Math.PI / 2.05; g.position.y = -0.55;
    }
  });
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 0.95, 8]} /><meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 1.28, 0]}><cylinderGeometry args={[0.09, 0.11, 0.17, 8]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 1.55, 0]} castShadow><sphereGeometry args={[0.24, 10, 10]} /><meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={0.3} /></mesh>
    </group>
  );
}

// ── Cinematic scene root (inside Canvas) ──────────────────────────────────────
function CinematicScene({ cutscene, phase, phaseProgress }: {
  cutscene: CutscenePayload; phase: CutscenePhase; phaseProgress: number;
}) {
  const { victimAvatar, victimName, saved } = cutscene;
  const hasAvatar = Boolean(victimAvatar?.url);
  const color = getAvatarColor(victimName ?? 'X');

  const bloodStart = useRef(0);
  const healStart = useRef(0);
  const bloodActive = useRef(false);
  const healActive = useRef(false);
  const { clock } = useThree();

  useEffect(() => {
    if (phase === 'attack') {
      bloodStart.current = clock.elapsedTime * 1000 + 500;
      healStart.current = clock.elapsedTime * 1000 + 500;
      bloodActive.current = !saved;
      healActive.current = saved;
    }
  }, [phase, saved, clock]);

  const bloodIndices = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);
  const healIndices = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);

  return (
    <>
      <CameraController phase={phase} />
      <DramaticLights phase={phase} saved={saved} />
      <ambientLight intensity={0.4} color="#ffe0c0" />
      <Ground />
      <group position={[0, 0, 0]}>
        {hasAvatar ? (
          <Suspense fallback={<GeometricVictim phase={phase} phaseProgress={phaseProgress} saved={saved} color={color} />}>
            <AvatarModel url={victimAvatar!.url} phase={phase} phaseProgress={phaseProgress} saved={saved} />
          </Suspense>
        ) : (
          <GeometricVictim phase={phase} phaseProgress={phaseProgress} saved={saved} color={color} />
        )}
      </group>
      <MafiaFigure phase={phase} />
      <DoctorFigure phase={phase} saved={saved} />
      {bloodActive.current && bloodIndices.map((i) => <BloodParticle key={i} idx={i} startTime={bloodStart.current} />)}
      {healActive.current && healIndices.map((i) => <HealingParticle key={i} idx={i} startTime={healStart.current} />)}
    </>
  );
}

import { generateNarratorAudio } from '../lib/elevenlabs';

// ── Overlay text ──────────────────────────────────────────────────────────────
const PHASE_TEXTS: Record<CutscenePhase, string> = {
  intro: 'The city never sleeps...', approach: 'A shadow moves through the dark...', attack: '', impact: '', result: '',
};

// ── Exported component ────────────────────────────────────────────────────────
export function CutscenePlayer({ cutscene, onComplete }: { cutscene: CutscenePayload; onComplete: () => void }) {
  const { victimName, saved, variant } = cutscene;
  const [phase, setPhase] = useState<CutscenePhase>('intro');
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const phaseStartRef = useRef(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function runPhases() {
      for (const p of PHASE_ORDER) {
        if (cancelled) return;
        phaseStartRef.current = Date.now();
        setPhase(p);
        setPhaseProgress(0);
        if (p === 'attack') { setShowFlash(true); setTimeout(() => setShowFlash(false), 350); }
        await new Promise<void>((resolve) => {
          const iv = setInterval(() => {
            const prog = clamp((Date.now() - phaseStartRef.current) / PHASE_DURATIONS[p], 0, 1);
            setPhaseProgress(prog);
            if (prog >= 1) { clearInterval(iv); resolve(); }
          }, 16);
        });
      }
      if (!cancelled) { await new Promise(r => setTimeout(r, 600)); handleComplete(); }
    }
    runPhases();
    return () => { cancelled = true; };
  }, [cutscene]); // Note: Removed onComplete from deps to prevent closure issues

  const subtitleText = phase === 'impact'
    ? saved ? 'The medic arrives just in time...' : `${victimName ?? 'A figure'} falls into the dark...`
    : phase === 'result'
      ? saved ? `${victimName ?? 'They'} survived — barely.` : `${victimName ?? 'Someone'} has been silenced.`
      : PHASE_TEXTS[phase];

  // ── TTS Audio Effect ──
  useEffect(() => {
    let isMounted = true;

    // Stop any currently playing audio for the previous phase
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (subtitleText && subtitleText.trim() !== '') {
      generateNarratorAudio(subtitleText).then((audioUrl) => {
        if (isMounted && audioUrl) {
          const audio = new Audio(audioUrl);
          audio.volume = 0.9;
          audio.play().catch(e => console.error("Cutscene audio playback blocked:", e));
          audioRef.current = audio;
        }
      });
    }

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [subtitleText]);

  const handleComplete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    onComplete();
  };

  const variantLabels: Record<string, string> = {
    back_alley: '🌧 BACK ALLEY', rooftop: '⚡ ROOFTOP', car_ambush: '🚗 CAR AMBUSH', neon_club: '🎷 NEON CLUB',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: '#000' }}>
      <Canvas shadows camera={{ position: [0.4, 1.4, 4], fov: 46, near: 0.1, far: 40 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
        <color attach="background" args={['#050508']} />
        <fog attach="fog" args={['#050508', 10, 22]} />
        <CinematicScene cutscene={cutscene} phase={phase} phaseProgress={phaseProgress} />
      </Canvas>

      {/* Flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div key="flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.7, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: saved
                ? 'radial-gradient(circle at 55% 45%, rgba(0,255,136,0.7) 0%, transparent 65%)'
                : 'radial-gradient(circle at 55% 45%, rgba(255,220,80,0.85) 0%, rgba(255,60,0,0.5) 40%, transparent 70%)'
            }} />
        )}
      </AnimatePresence>

      {/* Film grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E")`
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 75% 75% at 50% 45%, transparent 35%, rgba(0,0,0,0.88) 100%)'
      }} />

      {/* Scene label */}
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 0.75, x: 0 }} transition={{ delay: 0.4 }}
        style={{ position: 'absolute', top: '1.4rem', left: '1.6rem', fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.28em', color: 'var(--noir-gold)', textTransform: 'uppercase' }}>
        {variantLabels[variant] ?? '🌑 NIGHT'}
      </motion.div>

      {/* Outcome */}
      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 14 }}
          style={{
            position: 'absolute', top: '1.4rem', right: '1.6rem', fontFamily: 'var(--font-display)', fontSize: '0.68rem', letterSpacing: '0.15em',
            color: saved ? '#00ff88' : 'var(--noir-red)',
            textShadow: saved ? '0 0 16px rgba(0,255,136,0.8)' : 'var(--shadow-red)'
          }}>
          {saved ? '✚ SAVED' : '☠ ELIMINATED'}
        </motion.div>
      )}

      {/* Subtitle */}
      <AnimatePresence mode="wait">
        {subtitleText && (
          <motion.div key={phase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}
            style={{
              position: 'absolute', bottom: '4.5rem', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
              fontFamily: 'var(--font-typewriter)', fontSize: phase === 'result' ? '1.1rem' : '0.88rem', letterSpacing: '0.08em',
              color: phase === 'result' ? (saved ? '#00ff88' : 'var(--noir-red)') : 'rgba(220,200,170,0.85)',
              textShadow: phase === 'result' ? (saved ? '0 0 24px rgba(0,255,136,0.9)' : 'var(--shadow-red)') : 'none'
            }}>
            {subtitleText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name plate */}
      {phase !== 'intro' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            position: 'absolute', bottom: '2.8rem', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(255,215,0,0.55)'
          }}>
          {victimName?.toUpperCase() ?? '???'}
        </motion.div>
      )}

      {/* Skip */}
      <button onClick={onComplete}
        style={{
          position: 'absolute', top: '1.4rem', right: phase === 'result' ? '8rem' : '1.5rem',
          background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,215,0,0.25)', color: 'rgba(255,215,0,0.5)',
          fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.14em',
          padding: '0.4rem 0.85rem', borderRadius: 3, cursor: 'pointer', textTransform: 'uppercase'
        }}>
        SKIP →
      </button>
    </div>
  );
}
