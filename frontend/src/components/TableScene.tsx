// =============================================================================
// components/TableScene.tsx – Immersive 3D haunted forest bonfire meeting
// =============================================================================
import {
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MutableRefObject,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, Sky, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { Phase, PublicPlayer, Role } from '../types/game';

interface TableSceneProps {
  players: PublicPlayer[];
  myId: string | null;
  myRole: Role | null;
  voteTally: Record<string, number>;
  phase: Phase;
  onPlayerClick?: (playerId: string) => void;
  /** Hide player name labels during cutscenes / role-reveal overlays */
  showLabels?: boolean;
}

type VisibilityMode = 'day' | 'night-clear' | 'night-obscured';

const SCENE_SHELL_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 0,
  border: '1px solid rgba(255, 215, 0, 0.2)',
  borderRadius: 10,
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #04060a 0%, #020304 100%)',
  boxShadow: '0 22px 45px rgba(0,0,0,0.55), inset 0 0 65px rgba(0,0,0,0.5)',
};

const HUD_HINT_STYLE: CSSProperties = {
  position: 'absolute',
  left: 12,
  bottom: 10,
  pointerEvents: 'none',
  padding: '0.3rem 0.5rem',
  borderRadius: 4,
  border: '1px solid rgba(255,215,0,0.15)',
  background: 'rgba(0,0,0,0.45)',
  color: 'var(--noir-text-dim)',
  fontSize: '0.62rem',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const NAME_LABEL_BASE: CSSProperties = {
  padding: '2px 7px',
  borderRadius: 999,
  fontFamily: 'var(--font-display)',
  fontSize: '0.52rem',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(2px)',
};

function getVisibilityMode(phase: Phase): VisibilityMode {
  if (phase !== 'night') return 'day';
  return 'night-clear';
}

function getSeatRadius(total: number): number {
  return THREE.MathUtils.clamp(2.3 + total * 0.18, 2.65, 4.25);
}

function getSeatPosition(index: number, total: number): [number, number, number] {
  const radius = getSeatRadius(total);
  const angle = (index / total) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function DaySkyDome() {
  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#7ca7c9');
    skyGradient.addColorStop(0.35, '#8fb6c5');
    skyGradient.addColorStop(0.75, '#aec7bf');
    skyGradient.addColorStop(1, '#5f7b63');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 85; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.55);
      const r = 40 + Math.random() * 120;
      const cloud = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      cloud.addColorStop(0, 'rgba(255,255,255,0.22)');
      cloud.addColorStop(0.7, 'rgba(246,252,255,0.08)');
      cloud.addColorStop(1, 'rgba(230,240,255,0)');
      ctx.fillStyle = cloud;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      skyTexture.dispose();
    };
  }, [skyTexture]);

  return (
    <mesh>
      <sphereGeometry args={[170, 38, 24]} />
      <meshBasicMaterial map={skyTexture} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

function configureAvatarMaterial(
  material: THREE.Material,
  alive: boolean,
  connected: boolean
): THREE.Material {
  const next = material.clone() as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    opacity?: number;
    transparent?: boolean;
  };

  next.transparent = true;
  if (typeof next.opacity === 'number') {
    next.opacity = alive ? (connected ? 1 : 0.72) : 0.34;
  }
  if (next.color) {
    const darkness = alive ? (connected ? 1.24 : 0.94) : 0.42;
    next.color = next.color.clone().multiplyScalar(darkness);
  }
  if (next.emissive) {
    next.emissive = alive
      ? next.emissive.clone().multiplyScalar(1.22)
      : next.emissive.clone().multiplyScalar(0.5);
  }
  return next;
}

function ForestGround() {
  const forestTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    ctx.fillStyle = '#2a3328';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1800; i += 1) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 0.5 + Math.random() * 2;
      const g = 52 + Math.random() * 26;
      const b = 45 + Math.random() * 22;
      ctx.fillStyle = `rgba(${32 + Math.random() * 18},${g},${b},${0.18 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const campTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    ctx.fillStyle = '#6b4c2f';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1400; i += 1) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 0.8 + Math.random() * 2.2;
      const tone = 72 + Math.random() * 34;
      ctx.fillStyle = `rgba(${tone + 18},${tone},${tone * 0.5},${0.16 + Math.random() * 0.28})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      forestTexture.dispose();
      campTexture.dispose();
    };
  }, [campTexture, forestTexture]);

  const leaves = useMemo(
    () =>
      Array.from({ length: 170 }, () => ({
        x: (Math.random() - 0.5) * 28,
        z: (Math.random() - 0.5) * 28,
        s: 0.03 + Math.random() * 0.12,
        y: -0.017 + Math.random() * 0.004,
        c: 0.08 + Math.random() * 0.12,
        rot: Math.random() * Math.PI,
      })),
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.03, 0]}>
        <circleGeometry args={[24, 84]} />
        <meshStandardMaterial
          color="#354434"
          map={forestTexture}
          roughness={1}
          metalness={0.02}
          bumpMap={forestTexture}
          bumpScale={0.08}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <circleGeometry args={[5.5, 56]} />
        <meshStandardMaterial
          color="#785739"
          map={campTexture}
          roughness={0.95}
          metalness={0}
          bumpMap={campTexture}
          bumpScale={0.05}
        />
      </mesh>

      {leaves.map((leaf, i) => (
        <mesh
          key={`leaf-${i}`}
          rotation={[-Math.PI / 2, 0, leaf.rot]}
          position={[leaf.x, leaf.y, leaf.z]}
        >
          <circleGeometry args={[leaf.s, 8]} />
          <meshStandardMaterial
            color={new THREE.Color(leaf.c, leaf.c * 0.9, leaf.c * 0.55)}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

function TreeRing() {
  const trees = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const angle = (i / 34) * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
        const radius = 10 + Math.random() * 9;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          height: 3.7 + Math.random() * 2.8,
          width: 0.17 + Math.random() * 0.16,
          rot: Math.random() * Math.PI * 2,
          lean: (Math.random() - 0.5) * 0.08,
          crown: 0.85 + Math.random() * 1.25,
          crownY: 0.25 + Math.random() * 0.45,
          crownTone: 0.16 + Math.random() * 0.13,
        };
      }),
    []
  );

  return (
    <group>
      {trees.map((tree, i) => (
        <group key={`tree-${i}`} position={[tree.x, 0, tree.z]} rotation={[tree.lean, tree.rot, 0]}>
          <mesh castShadow receiveShadow position={[0, tree.height / 2, 0]}>
            <cylinderGeometry args={[tree.width * 0.65, tree.width, tree.height, 8]} />
            <meshStandardMaterial color="#30261f" roughness={1} metalness={0.05} />
          </mesh>
          <mesh castShadow position={[0.55, tree.height * 0.72, 0]} rotation={[0, 0, 0.85]}>
            <cylinderGeometry args={[0.03, 0.05, 1.05, 6]} />
            <meshStandardMaterial color="#332820" roughness={1} />
          </mesh>
          <mesh castShadow position={[-0.45, tree.height * 0.66, -0.2]} rotation={[0.1, 0.45, -0.88]}>
            <cylinderGeometry args={[0.025, 0.05, 0.86, 6]} />
            <meshStandardMaterial color="#2f241e" roughness={1} />
          </mesh>

          <mesh castShadow receiveShadow position={[0, tree.height + tree.crownY, 0]} scale={[1, 0.9, 1]}>
            <icosahedronGeometry args={[tree.crown, 1]} />
            <meshStandardMaterial
              color={new THREE.Color(tree.crownTone * 0.5, tree.crownTone * 1.12, tree.crownTone * 0.47)}
              roughness={0.98}
              metalness={0}
            />
          </mesh>
          <mesh castShadow receiveShadow position={[0.52, tree.height + tree.crownY * 0.75, -0.2]} scale={[0.75, 0.72, 0.75]}>
            <icosahedronGeometry args={[tree.crown * 0.86, 1]} />
            <meshStandardMaterial
              color={new THREE.Color(tree.crownTone * 0.52, tree.crownTone, tree.crownTone * 0.42)}
              roughness={0.99}
              metalness={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StoneScatter() {
  const stones = useMemo(
    () =>
      Array.from({ length: 52 }, () => ({
        x: (Math.random() - 0.5) * 18,
        z: (Math.random() - 0.5) * 18,
        s: 0.08 + Math.random() * 0.2,
        sx: 1 + Math.random(),
        sy: 0.65 + Math.random() * 0.4,
        sz: 1 + Math.random(),
        r: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [
          number,
          number,
          number,
        ],
      })),
    []
  );

  return (
    <group>
      {stones.map((stone, i) => (
        <mesh
          key={`stone-${i}`}
          position={[stone.x, 0.05, stone.z]}
          scale={[stone.sx, stone.sy, stone.sz]}
          rotation={stone.r}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[stone.s, 0]} />
          <meshStandardMaterial color="#3a3a3f" roughness={0.96} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}

function ForestUnderbrush() {
  const clumps = useMemo(
    () =>
      Array.from({ length: 84 }, () => {
        const radius = 4.1 + Math.random() * 9.5;
        const angle = Math.random() * Math.PI * 2;
        const h = 0.08 + Math.random() * 0.2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          h,
          r: Math.random() * Math.PI * 2,
          c: 0.12 + Math.random() * 0.1,
        };
      }),
    []
  );

  const twigs = useMemo(
    () =>
      Array.from({ length: 28 }, () => {
        const radius = 4.3 + Math.random() * 8.4;
        const angle = Math.random() * Math.PI * 2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          yRot: Math.random() * Math.PI * 2,
          tilt: (Math.random() - 0.5) * 0.2,
          len: 0.55 + Math.random() * 0.65,
        };
      }),
    []
  );

  return (
    <group>
      {clumps.map((clump, i) => (
        <mesh
          key={`clump-${i}`}
          position={[clump.x, clump.h / 2 - 0.03, clump.z]}
          rotation={[0, clump.r, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.02 + clump.h * 0.2, 0.045 + clump.h * 0.22, clump.h, 6]} />
          <meshStandardMaterial
            color={new THREE.Color(clump.c * 0.5, clump.c * 0.95, clump.c * 0.42)}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}

      {twigs.map((twig, i) => (
        <mesh
          key={`twig-${i}`}
          position={[twig.x, 0.08, twig.z]}
          rotation={[twig.tilt, twig.yRot, Math.PI / 2.1]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.02, 0.025, twig.len, 6]} />
          <meshStandardMaterial color="#2f251d" roughness={0.96} metalness={0.04} />
        </mesh>
      ))}
    </group>
  );
}

function DriftingFog({
  nightBlend,
  visibilityMode,
}: {
  nightBlend: MutableRefObject<number>;
  visibilityMode: VisibilityMode;
}) {
  const fogTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    const gradient = ctx.createRadialGradient(128, 128, 18, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(245,248,255,0.5)');
    gradient.addColorStop(0.45, 'rgba(210,220,238,0.24)');
    gradient.addColorStop(1, 'rgba(150,165,190,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      fogTexture.dispose();
    };
  }, [fogTexture]);

  const clouds = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        x: (Math.random() - 0.5) * 15,
        z: (Math.random() - 0.5) * 15,
        y: 0.4 + Math.random() * 0.5,
        size: 2.2 + Math.random() * 2.4,
        baseOpacity: 0.08 + Math.random() * 0.1,
        seed: Math.random() * Math.PI * 2,
      })),
    []
  );
  const fogRefs = useRef<Array<THREE.Sprite | null>>([]);

  useFrame((state, delta) => {
    const blend = nightBlend.current;
    const extra = visibilityMode === 'night-obscured' ? 1.15 : 0.85;
    const t = state.clock.elapsedTime * 0.24;
    clouds.forEach((cloud, i) => {
      const mesh = fogRefs.current[i];
      if (!mesh) return;

      mesh.position.x = cloud.x + Math.sin(t + cloud.seed) * 0.5;
      mesh.position.z = cloud.z + Math.cos(t * 0.84 + cloud.seed) * 0.42;
      mesh.position.y = cloud.y + Math.sin(t * 0.7 + cloud.seed) * 0.06;
      const fogScale = cloud.size * (1 + Math.sin(t * 0.5 + cloud.seed) * 0.08);
      mesh.scale.set(fogScale, fogScale * 0.65, 1);

      const mat = mesh.material as THREE.SpriteMaterial;
      mat.opacity = visibilityMode === 'day'
        ? cloud.baseOpacity * 0.08
        : cloud.baseOpacity * THREE.MathUtils.lerp(0.9, 1.65 * extra, blend);
    });
  });

  return (
    <group>
      {clouds.map((cloud, i) => (
        <sprite
          key={`fog-${i}`}
          ref={(node) => {
            fogRefs.current[i] = node;
          }}
          position={[cloud.x, cloud.y, cloud.z]}
        >
          <spriteMaterial
            map={fogTexture}
            color="#9caecc"
            transparent
            opacity={cloud.baseOpacity}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

function FloatingParticles({
  kind,
  nightBlend,
  visibilityMode,
}: {
  kind: 'ash' | 'dust';
  nightBlend: MutableRefObject<number>;
  visibilityMode: VisibilityMode;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const count = kind === 'ash' ? 140 : 110;

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const velocity = useMemo(() => new Float32Array(count), [count]);
  const driftSeed = useMemo(() => new Float32Array(count), [count]);

  useEffect(() => {
    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      const spread = kind === 'ash' ? 3.8 : 10.5;
      const minY = kind === 'ash' ? 0.5 : 0.2;
      positions[idx] = (Math.random() - 0.5) * spread;
      positions[idx + 1] = minY + Math.random() * (kind === 'ash' ? 2.8 : 2.4);
      positions[idx + 2] = (Math.random() - 0.5) * spread;
      velocity[i] = (kind === 'ash' ? 0.18 : 0.06) + Math.random() * (kind === 'ash' ? 0.22 : 0.08);
      driftSeed[i] = Math.random() * Math.PI * 2;
    }
  }, [count, driftSeed, kind, positions, velocity]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;

    const blend = nightBlend.current;
    const isDay = visibilityMode === 'day';
    const arr = points.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    const maxY = kind === 'ash' ? 5.2 : 3.8;
    const minY = kind === 'ash' ? 0.45 : 0.15;
    const spread = kind === 'ash' ? 4.4 : 11.2;

    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      arr[idx + 1] += velocity[i] * delta;
      arr[idx] += Math.sin(t * 0.8 + driftSeed[i]) * delta * (kind === 'ash' ? 0.06 : 0.025);
      arr[idx + 2] += Math.cos(t * 0.7 + driftSeed[i] * 0.7) * delta * (kind === 'ash' ? 0.05 : 0.02);

      if (arr[idx + 1] > maxY) {
        arr[idx] = (Math.random() - 0.5) * spread;
        arr[idx + 1] = minY;
        arr[idx + 2] = (Math.random() - 0.5) * spread;
      }
    }

    points.geometry.attributes.position.needsUpdate = true;
    material.opacity = kind === 'ash'
      ? (isDay ? 0.06 : THREE.MathUtils.lerp(0.62, 0.46, blend))
      : (isDay ? 0.14 : THREE.MathUtils.lerp(0.18, 0.34, blend));
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={kind === 'ash' ? 0.085 : 0.05}
        color={kind === 'ash' ? '#ffb56d' : '#9cb7d9'}
        transparent
        opacity={kind === 'ash' ? 0.75 : 0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Fireflies({ nightBlend }: { nightBlend: MutableRefObject<number> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const count = 70;

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const seeds = useMemo(() => new Float32Array(count), [count]);
  const radiusBias = useMemo(() => new Float32Array(count), [count]);

  useEffect(() => {
    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      const radius = 2.5 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      positions[idx] = Math.cos(angle) * radius;
      positions[idx + 1] = 0.8 + Math.random() * 2.5;
      positions[idx + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random() * Math.PI * 2;
      radiusBias[i] = radius;
    }
  }, [count, positions, radiusBias, seeds]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;

    const blend = nightBlend.current;
    const arr = points.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime * 0.55;

    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      const baseR = radiusBias[i];
      arr[idx] = Math.cos(t + seeds[i] * 1.2) * baseR + Math.sin(t * 0.5 + seeds[i]) * 0.45;
      arr[idx + 2] = Math.sin(t + seeds[i] * 1.2) * baseR + Math.cos(t * 0.6 + seeds[i]) * 0.45;
      arr[idx + 1] = 1 + Math.sin(t * 1.8 + seeds[i] * 2.3) * 0.35 + (seeds[i] % 1.5) * 0.85;
    }

    points.geometry.attributes.position.needsUpdate = true;
    material.opacity = THREE.MathUtils.lerp(0, 0.56, blend);
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.08}
        color="#ffd98f"
        transparent
        opacity={0.1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Bonfire({
  nightBlend,
  visibilityMode,
}: {
  nightBlend: MutableRefObject<number>;
  visibilityMode: VisibilityMode;
}) {
  const isDay = visibilityMode === 'day';
  const fireRef = useRef<THREE.PointLight>(null);
  const emberRef = useRef<THREE.PointLight>(null);
  const fireFillRef = useRef<THREE.PointLight>(null);
  const flameSpritesRef = useRef<Array<THREE.Sprite | null>>([]);
  const flameARef = useRef<THREE.Mesh>(null);
  const flameBRef = useRef<THREE.Mesh>(null);
  const flameCoreRef = useRef<THREE.Mesh>(null);
  const flameShellRef = useRef<THREE.Mesh>(null);
  const emberBedRef = useRef<THREE.Mesh>(null);
  const groundGlowRef = useRef<THREE.Mesh>(null);
  const smokeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const flameTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Elongated teardrop shape: wide hot base narrows to tip
    const body = ctx.createRadialGradient(64, 196, 6, 64, 170, 76);
    body.addColorStop(0, 'rgba(255,255,255,1)');
    body.addColorStop(0.12, 'rgba(255,255,200,0.97)');
    body.addColorStop(0.28, 'rgba(255,230,80,0.9)');
    body.addColorStop(0.50, 'rgba(255,140,30,0.72)');
    body.addColorStop(0.72, 'rgba(255,70,12,0.38)');
    body.addColorStop(0.90, 'rgba(200,30,5,0.12)');
    body.addColorStop(1, 'rgba(150,10,0,0)');
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, 128, 256);

    // Bright streak up the centre to suggest a flame tip
    const streak = ctx.createLinearGradient(0, 256, 0, 0);
    streak.addColorStop(0, 'rgba(255,255,200,0.55)');
    streak.addColorStop(0.25, 'rgba(255,220,80,0.28)');
    streak.addColorStop(0.60, 'rgba(255,100,20,0.06)');
    streak.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(44, 0, 40, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      flameTexture.dispose();
    };
  }, [flameTexture]);
  const smokePuffs = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        life: Math.random(),
        speed: 0.28 + Math.random() * 0.22,
        swirl: Math.random() * Math.PI * 2,
        drift: 0.12 + Math.random() * 0.24,
      })),
    []
  );
  const ringStones = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return {
          x: Math.cos(angle) * (0.72 + Math.sin(i * 1.9) * 0.05),
          z: Math.sin(angle) * (0.72 + Math.sin(i * 1.9) * 0.05),
          rot: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
          ] as [number, number, number],
        };
      }),
    []
  );

  useFrame((state, delta) => {
    const blend = nightBlend.current;
    const obscured = visibilityMode === 'night-obscured';
    const t = state.clock.elapsedTime;
    const flicker = 0.82 + Math.sin(t * 8.3) * 0.1 + Math.sin(t * 14.7) * 0.07;

    const targetFire = isDay ? 0 : THREE.MathUtils.lerp(2.9, obscured ? 0.48 : 1.52, blend);
    if (fireRef.current) {
      fireRef.current.intensity = targetFire * 1.15 * flicker;
      fireRef.current.distance = THREE.MathUtils.lerp(14.5, obscured ? 8.4 : 10.3, blend);
      fireRef.current.decay = 2;
    }
    if (emberRef.current) {
      emberRef.current.intensity = isDay ? 0.05 : targetFire * 0.48;
      emberRef.current.distance = isDay ? 2.8 : THREE.MathUtils.lerp(6.5, 4.5, blend);
    }
    if (fireFillRef.current) {
      fireFillRef.current.intensity = isDay ? 0 : targetFire * 0.35 * flicker;
      fireFillRef.current.distance = isDay ? 1 : THREE.MathUtils.lerp(11.2, obscured ? 6.4 : 8.2, blend);
    }

    if (flameARef.current) {
      flameARef.current.visible = !isDay;
      flameARef.current.scale.y = THREE.MathUtils.lerp(1.12, obscured ? 0.74 : 0.95, blend) + Math.sin(t * 7.8) * 0.11;
      flameARef.current.rotation.y = t * 0.6;
    }
    if (flameBRef.current) {
      flameBRef.current.visible = !isDay;
      flameBRef.current.scale.y = THREE.MathUtils.lerp(0.94, obscured ? 0.62 : 0.84, blend) + Math.cos(t * 6.6) * 0.08;
      flameBRef.current.rotation.y = -t * 0.5;
    }
    if (flameCoreRef.current) {
      flameCoreRef.current.visible = !isDay;
      flameCoreRef.current.scale.setScalar(0.94 + Math.sin(t * 13) * 0.1);
    }
    if (flameShellRef.current) {
      flameShellRef.current.visible = !isDay;
      flameShellRef.current.scale.y = THREE.MathUtils.lerp(1.24, obscured ? 0.84 : 1, blend) + Math.sin(t * 5.6) * 0.06;
      flameShellRef.current.rotation.y = t * 0.35;
    }
    if (emberBedRef.current) {
      const emberMat = emberBedRef.current.material as THREE.MeshStandardMaterial;
      const dayColor = new THREE.Color('#33231a');
      const nightColor = new THREE.Color('#8a3f1f');
      emberMat.color.copy(dayColor).lerp(nightColor, isDay ? 0 : 1 - blend * 0.4);
      emberMat.emissiveIntensity = isDay ? 0.03 : 0.18;
    }
    if (groundGlowRef.current) {
      const mat = groundGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isDay
        ? 0.03
        : (0.24 + Math.sin(t * 7.5) * 0.05) * THREE.MathUtils.lerp(1, obscured ? 0.55 : 0.78, blend);
    }
    flameSpritesRef.current.forEach((sprite, i) => {
      if (!sprite) return;
      sprite.visible = !isDay;
      // Each layer gets its own turbulent phase so they move independently
      const phase = i * 0.52;
      const w1 = Math.sin(t * (6.8 + i * 0.55) + phase);
      const w2 = Math.cos(t * (4.1 + i * 0.7) + phase * 1.3);
      const w3 = Math.sin(t * (9.2 + i * 0.3) + phase * 0.8);
      sprite.position.x = w1 * (0.045 + i * 0.014) + w3 * 0.025;
      sprite.position.z = w2 * (0.038 + i * 0.012);
      sprite.position.y = 0.45 + i * 0.165 + Math.abs(w1) * 0.06;
      // Taper: wide at base, narrow at tip
      const taper = Math.max(0.25, 1 - i / 16);
      const breath = 0.9 + Math.sin(t * 3.8 + phase) * 0.13;
      const sx = (1.05 - i * 0.04) * taper * breath;
      const sy = (1.0 + i * 0.14) * breath;
      sprite.scale.set(sx, sy, 1);

      const mat = sprite.material as THREE.SpriteMaterial;
      const baseOpacity = i < 3 ? 0.88 : i < 7 ? 0.72 : 0.52;
      mat.opacity = isDay
        ? 0
        : baseOpacity * (0.82 + Math.abs(w2) * 0.18) * THREE.MathUtils.lerp(1, obscured ? 0.58 : 0.82, blend);
    });

    smokePuffs.forEach((puff, i) => {
      const mesh = smokeRefs.current[i];
      if (!mesh) return;

      puff.life += (0.23 + puff.speed) * (0.5 + blend * 0.45) * delta;
      if (puff.life > 1) {
        puff.life = 0;
        puff.swirl = Math.random() * Math.PI * 2;
      }

      const x = Math.sin(puff.swirl + t * 0.52) * puff.drift * (0.4 + puff.life);
      const z = Math.cos(puff.swirl + t * 0.49) * puff.drift * (0.4 + puff.life);
      mesh.position.set(x, 0.55 + puff.life * 2.4, z);
      mesh.scale.setScalar(0.25 + puff.life * 0.95);

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - puff.life) * (isDay ? 0.13 : THREE.MathUtils.lerp(0.2, 0.3, blend));
    });
  });

  return (
    <group position={[0, 0, 0]}>
      <pointLight
        ref={fireRef}
        color="#ff8f2d"
        intensity={2.8}
        distance={14}
        position={[0, 1.4, 0]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight ref={emberRef} color="#ff5520" intensity={1.3} distance={6} position={[0, 0.8, 0]} />
      <pointLight ref={fireFillRef} color="#ffc070" intensity={0.65} distance={10} position={[0, 0.55, 0]} />

      {/* 12 layered flame sprites — white core at base, red tips at top */}
      {[
        '#ffffff', '#fffad0', '#ffe980', '#ffd040',
        '#ffb830', '#ff9428', '#ff7020', '#ff5018',
        '#ff3812', '#ff240e', '#dd1808', '#bb1006',
      ].map((color, i) => (
        <sprite
          key={`flame-sprite-${i}`}
          ref={(node) => {
            flameSpritesRef.current[i] = node;
          }}
          position={[0, 0.45 + i * 0.165, 0]}
          scale={[1.05 - i * 0.04, 1.0 + i * 0.14, 1]}
          visible={!isDay}
        >
          <spriteMaterial
            map={flameTexture}
            color={color}
            transparent
            opacity={i < 3 ? 0.88 : i < 7 ? 0.72 : 0.52}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}

      {/* Logs */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh
          key={`log-${i}`}
          castShadow
          receiveShadow
          position={[0, 0.19 + (i % 2) * 0.04, 0]}
          rotation={[0, (Math.PI / 4) * i, Math.PI / 2.2]}
        >
          <cylinderGeometry args={[0.09, 0.11, 1.25, 10]} />
          <meshStandardMaterial color="#4a3120" roughness={0.98} metalness={0.03} />
        </mesh>
      ))}
      <mesh ref={emberBedRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
        <circleGeometry args={[0.46, 20]} />
        <meshStandardMaterial color="#33231a" emissive="#6a2a12" emissiveIntensity={0.08} roughness={1} metalness={0} />
      </mesh>

      {/* Flame body */}
      <mesh ref={flameShellRef} position={[0, 1.1, 0]} visible={!isDay}>
        <coneGeometry args={[0.52, 1.35, 18]} />
        <meshStandardMaterial color="#ff7b1f" emissive="#ff3b12" emissiveIntensity={2.7} transparent opacity={0.44} />
      </mesh>
      <mesh ref={flameARef} position={[0, 0.98, 0]} visible={!isDay}>
        <coneGeometry args={[0.43, 1.15, 18]} />
        <meshStandardMaterial color="#ff9a33" emissive="#ff4c14" emissiveIntensity={2.4} transparent opacity={0.88} />
      </mesh>
      <mesh ref={flameBRef} position={[0, 0.75, 0]} visible={!isDay}>
        <coneGeometry args={[0.32, 0.86, 14]} />
        <meshStandardMaterial color="#ffd17a" emissive="#ff7a22" emissiveIntensity={2.1} transparent opacity={0.8} />
      </mesh>
      <mesh ref={flameCoreRef} position={[0, 0.56, 0]} visible={!isDay}>
        <sphereGeometry args={[0.17, 12, 12]} />
        <meshStandardMaterial color="#ffe7a9" emissive="#ff9a2e" emissiveIntensity={2.6} transparent opacity={0.9} />
      </mesh>
      <mesh ref={groundGlowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.2, 28]} />
        <meshBasicMaterial color="#ff8e38" transparent opacity={0.26} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {smokePuffs.map((_, i) => (
        <mesh
          key={`smoke-${i}`}
          ref={(node) => {
            smokeRefs.current[i] = node;
          }}
          position={[0, 0.8, 0]}
        >
          <sphereGeometry args={[0.24, 10, 10]} />
          <meshStandardMaterial
            color="#5a5f67"
            roughness={1}
            metalness={0}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Stone ring around bonfire */}
      {ringStones.map((stone, i) => {
        return (
          <mesh
            key={`fire-stone-${i}`}
            position={[stone.x, 0.07, stone.z]}
            rotation={stone.rot}
            scale={[1.05, 0.72, 1]}
            receiveShadow
            castShadow
          >
            <dodecahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color="#4a4d55" roughness={0.95} metalness={0.04} />
          </mesh>
        );
      })}
    </group>
  );
}

function DarkSkulls({
  nightBlend,
}: {
  nightBlend: MutableRefObject<number>;
}) {
  const clusterRef = useRef<THREE.Group>(null);
  const leftEyeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const rightEyeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const glowRefs = useRef<Array<THREE.PointLight | null>>([]);
  const skulls = useMemo(
    () => [
      { pos: [-7.4, 1.1, -6.6] as [number, number, number], rot: 0.35, scale: 1 },
      { pos: [6.9, 0.95, -7.1] as [number, number, number], rot: -0.5, scale: 0.88 },
      { pos: [-8.1, 0.9, 6.4] as [number, number, number], rot: 0.72, scale: 0.84 },
      { pos: [7.7, 0.98, 6.1] as [number, number, number], rot: -0.2, scale: 0.92 },
    ],
    []
  );

  useFrame((state) => {
    const blend = nightBlend.current;
    const t = state.clock.elapsedTime;
    if (clusterRef.current) {
      clusterRef.current.visible = blend > 0.08;
    }

    skulls.forEach((skull, i) => {
      const leftEye = leftEyeRefs.current[i];
      const rightEye = rightEyeRefs.current[i];
      const glow = glowRefs.current[i];
      const pulse = (0.36 + Math.sin(t * (2.7 + i * 0.35) + i) * 0.2) * blend;

      if (leftEye) {
        const m = leftEye.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = pulse;
      }
      if (rightEye) {
        const m = rightEye.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = pulse;
      }
      if (glow) {
        glow.intensity = 0.25 + pulse * (0.75 + skull.scale * 0.15);
        glow.distance = 2.4 + skull.scale + blend;
      }
    });
  });

  return (
    <group ref={clusterRef}>
      {skulls.map((skull, i) => (
        <group
          key={`skull-${i}`}
          position={skull.pos}
          rotation={[0, skull.rot, 0]}
          scale={[skull.scale, skull.scale, skull.scale]}
        >
          <mesh castShadow receiveShadow position={[0, 1.05, 0]}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial color="#d9d3c8" roughness={0.92} metalness={0.03} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.54, 0.05]} scale={[1.02, 0.62, 0.78]}>
            <boxGeometry args={[0.85, 0.42, 0.62]} />
            <meshStandardMaterial color="#c8c0b1" roughness={0.94} metalness={0.02} />
          </mesh>
          <mesh position={[-0.19, 1.05, 0.42]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#151515" />
          </mesh>
          <mesh position={[0.19, 1.05, 0.42]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#151515" />
          </mesh>
          <mesh position={[0, 0.89, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 1.2, 1]}>
            <coneGeometry args={[0.08, 0.22, 3]} />
            <meshStandardMaterial color="#1b1b1b" />
          </mesh>
          <mesh
            ref={(node) => {
              leftEyeRefs.current[i] = node;
            }}
            position={[-0.19, 1.05, 0.36]}
          >
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#8dc6ff" emissive="#8dc6ff" emissiveIntensity={0.25} />
          </mesh>
          <mesh
            ref={(node) => {
              rightEyeRefs.current[i] = node;
            }}
            position={[0.19, 1.05, 0.36]}
          >
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#8dc6ff" emissive="#8dc6ff" emissiveIntensity={0.25} />
          </mesh>
          <pointLight
            ref={(node) => {
              glowRefs.current[i] = node;
            }}
            color="#8dc6ff"
            intensity={0.35}
            distance={3}
            position={[0, 1.02, 0.15]}
          />
        </group>
      ))}
    </group>
  );
}

function FallbackAvatar({
  alive,
  connected,
  isMe,
}: {
  alive: boolean;
  connected: boolean;
  isMe: boolean;
}) {
  const color = alive
    ? connected
      ? isMe ? '#d4b95f' : '#5f6f92'
      : '#4a4f5e'
    : '#2f2f36';

  return (
    <group position={[0, 0.18, 0]} scale={[1, 1, 1]}>
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <capsuleGeometry args={[0.25, 1.15, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.88, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#d5c2a2" roughness={0.7} />
      </mesh>
    </group>
  );
}

function RPMAvatarModel({
  url,
  alive,
  connected,
  bobSeed,
}: {
  url: string;
  alive: boolean;
  connected: boolean;
  bobSeed: number;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const prevTimeRef = useRef(0);
  // ── Store foot-pin Y so useFrame can bob from the correct baseline ────────
  const baseYRef = useRef(0);

  const normalizedModel = useMemo(() => {
    const model = cloneSkeleton(scene) as THREE.Object3D;

    // --- scale to target visual height (1.12 folded in) ---
    const targetHeight = 2.26 * 1.12;
    const roughBox = new THREE.Box3().setFromObject(model);
    const roughSize = new THREE.Vector3();
    roughBox.getSize(roughSize);
    const fitScale = roughSize.y > 0 ? targetHeight / roughSize.y : 1;
    model.scale.multiplyScalar(fitScale);

    // --- ground using MESH-ONLY bbox so invisible bones don't cause floating ---
    const meshBox = new THREE.Box3();
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshBox.expandByObject(child);
    });
    if (meshBox.isEmpty()) {
      // fallback to full object if no meshes found
      meshBox.setFromObject(model);
    }
    const meshCenter = new THREE.Vector3();
    meshBox.getCenter(meshCenter);
    model.position.x -= meshCenter.x;
    model.position.z -= meshCenter.z;
    model.position.y -= meshBox.min.y; // pin feet to y=0

    // ── Capture the foot-pin offset so we can bob from it later ────────────
    baseYRef.current = model.position.y;

    // Log bone names once so we can verify the skeleton
    const boneNames: string[] = [];
    model.traverse((obj) => { if ((obj as THREE.Bone).isBone) boneNames.push(obj.name); });
    console.log('[TableScene] Bones:', boneNames.sort());

    return model;
  }, [scene]);

  // ── Load idle.fbx and start AnimationMixer ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const mixer = new THREE.AnimationMixer(normalizedModel);
    mixerRef.current = mixer;
    prevTimeRef.current = 0;

    new FBXLoader().load(
      '/animations/idle.fbx',
      (fbx) => {
        if (cancelled) return;
        const clip = fbx.animations[0];
        if (!clip) { console.warn('[TableScene] idle.fbx has no animation clips'); return; }
        console.log('[TableScene] idle.fbx loaded, clips:', fbx.animations.length);

        // Build avatar bone set
        const avatarBones = new Set<string>();
        normalizedModel.traverse((o) => { if ((o as THREE.Bone).isBone) avatarBones.add(o.name); });

        // Remap tracks: handles mixamorig:BoneName → BoneName (or no change if already matching)
        // Also SKIP .position tracks — Mixamo uses cm, THREE.js uses meters, causes 100x position offset
        const remappedTracks = clip.tracks
          .filter((track) => !track.name.endsWith('.position')) // ← skip root motion / hip position
          .map((track) => {
            const dot = track.name.indexOf('.');
            if (dot === -1) return track;
            const bonePart = track.name.slice(0, dot);
            const propPart = track.name.slice(dot);

            if (avatarBones.has(bonePart)) return track; // direct match

            // Strip mixamorig / mixamorig: prefix
            const bare = bonePart.replace(/^mixamorig:?/i, '');
            if (avatarBones.has(bare)) {
              const Ctor = track.constructor as new (n: string, t: ArrayLike<number>, v: ArrayLike<number>) => THREE.KeyframeTrack;
              return new Ctor(bare + propPart, track.times, track.values);
            }
            // Try adding prefix
            const prefixed = 'mixamorig' + bare;
            if (avatarBones.has(prefixed)) {
              const Ctor = track.constructor as new (n: string, t: ArrayLike<number>, v: ArrayLike<number>) => THREE.KeyframeTrack;
              return new Ctor(prefixed + propPart, track.times, track.values);
            }
            return track; // no match, THREE will silently skip
          });


        const remapped = new THREE.AnimationClip(clip.name, clip.duration, remappedTracks as THREE.KeyframeTrack[]);
        const action = mixer.clipAction(remapped);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
        console.log('[TableScene] idle animation started');
      },
      undefined,
      (err) => { console.warn('[TableScene] idle.fbx 404/error:', err); }
    );

    return () => { cancelled = true; mixer.stopAllAction(); mixerRef.current = null; };
  }, [normalizedModel]);

  useEffect(() => {
    normalizedModel.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = alive;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => configureAvatarMaterial(mat, alive, connected));
      } else {
        mesh.material = configureAvatarMaterial(mesh.material, alive, connected);
      }
    });
  }, [alive, connected, normalizedModel]);

  useFrame((state) => {
    const root = modelRef.current;
    if (!root) return;
    const dt = state.clock.elapsedTime - prevTimeRef.current;
    prevTimeRef.current = state.clock.elapsedTime;
    // Advance idle mixer (only for alive players)
    if (mixerRef.current && alive) mixerRef.current.update(dt);
    // Bob relative to foot-pin baseline — prevents floating/sinking
    const bob = alive ? 0.012 : 0.004;
    root.position.y = baseYRef.current + Math.sin(state.clock.elapsedTime * 1.35 + bobSeed) * bob;
  });

  return (
    <group ref={modelRef}>
      <primitive object={normalizedModel} />
    </group>
  );
}

function AvatarSeat({
  player,
  index,
  total,
  myId,
  voteCount,
  visibilityMode,
  onPlayerClick,
  showLabels,
}: {
  player: PublicPlayer;
  index: number;
  total: number;
  myId: string | null;
  voteCount: number;
  visibilityMode: VisibilityMode;
  onPlayerClick?: (playerId: string) => void;
  showLabels: boolean;
}) {
  const seat = getSeatPosition(index, total);
  const facingY = Math.atan2(seat[0], seat[2]) + Math.PI;
  const isMe = player.id === myId;
  const isNight = visibilityMode !== 'day';
  const voteRingRef = useRef<THREE.Mesh>(null);
  const hoverRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (voteRingRef.current) {
      voteRingRef.current.scale.setScalar(1 + Math.sin(t * 4.2) * 0.1);
      voteRingRef.current.rotation.z = t * 0.65;
    }
    if (hoverRef.current && player.alive) {
      const material = hoverRef.current.material as THREE.Material & { opacity?: number };
      if (typeof material.opacity === 'number') {
        material.opacity = (isMe ? 0.08 : 0.03) + (Math.sin(t * 2 + index) + 1) * 0.015;
      }
    }
  });

  const labelStyle: CSSProperties = {
    ...NAME_LABEL_BASE,
    color: voteCount > 0 ? '#ff8a8a' : isMe ? '#ffe9b2' : '#f8efe1',
    border: `1px solid ${voteCount > 0 ? 'rgba(255,70,70,0.65)' : isMe ? 'rgba(255,215,0,0.65)' : 'rgba(255,255,255,0.38)'}`,
    background: isNight
      ? (voteCount > 0 ? 'rgba(56, 6, 6, 0.78)' : 'rgba(2, 8, 15, 0.74)')
      : (voteCount > 0 ? 'rgba(56, 6, 6, 0.65)' : 'rgba(0, 0, 0, 0.58)'),
    opacity: player.alive ? 1 : 0.7,
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onPlayerClick && player.alive) {
      onPlayerClick(player.id);
    }
  };

  return (
    <group position={seat} onClick={handleClick}>
      <mesh ref={hoverRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.56, 22]} />
        <meshStandardMaterial
          color={isMe ? '#3b2d1b' : '#1a1a1a'}
          transparent
          opacity={isMe ? 0.1 : 0.04}
          depthWrite={false}
        />
      </mesh>

      <group rotation={[0, facingY, 0]}>
        {player.avatar?.url ? (
          <Suspense fallback={<FallbackAvatar alive={player.alive} connected={player.connected} isMe={isMe} />}>
            <RPMAvatarModel
              url={player.avatar.url}
              alive={player.alive}
              connected={player.connected}
              bobSeed={index * 0.77}
            />
          </Suspense>
        ) : (
          <FallbackAvatar alive={player.alive} connected={player.connected} isMe={isMe} />
        )}
      </group>
      {player.alive && (
        <pointLight
          color={isNight ? '#ff9a4a' : (isMe ? '#ffd59a' : '#ffc58f')}
          intensity={isNight ? (isMe ? 0.55 : 0.4) : (isMe ? 0.38 : 0.2)}
          distance={isNight ? 3.5 : 2.8}
          decay={2}
          position={[0, 2.1, 0.1]}
        />
      )}
      {player.alive && isNight && (
        <pointLight
          color="#9dc7ff"
          intensity={isMe ? 0.22 : 0.15}
          distance={3.5}
          decay={2}
          position={[0, 2.35, -0.85]}
        />
      )}

      {voteCount > 0 && player.alive && (
        <mesh ref={voteRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
          <torusGeometry args={[0.66, 0.03, 16, 80]} />
          <meshStandardMaterial color="#ff4848" emissive="#a01111" emissiveIntensity={0.85} />
        </mesh>
      )}

      {showLabels && (
        <Html position={[0, 3.5, 0]} transform sprite>
          <div style={labelStyle}>
            {!player.alive ? '☠ ' : ''}{player.name}
            {isMe ? ' (you)' : ''}
            {voteCount > 0 ? ` • ${voteCount}` : ''}
            {!player.connected && player.alive ? ' • offline' : ''}
          </div>
        </Html>
      )}
    </group>
  );
}

function HauntedForestScene({
  players,
  myId,
  myRole: _myRole,
  voteTally,
  phase,
  onPlayerClick,
  showLabels = true,
}: TableSceneProps) {
  const { gl } = useThree();
  const visibilityMode = getVisibilityMode(phase);
  const targetNightBlend = phase === 'night' ? 1 : 0;
  const nightBlendRef = useRef(targetNightBlend);
  const fogRef = useRef<THREE.FogExp2>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const moonFillRef = useRef<THREE.DirectionalLight>(null);

  useFrame((_, delta) => {
    nightBlendRef.current = THREE.MathUtils.damp(
      nightBlendRef.current,
      targetNightBlend,
      1.25,
      delta
    );

    const blend = nightBlendRef.current;
    const ambientTarget = THREE.MathUtils.lerp(0.9, 0.34, blend);
    const hemiTarget = THREE.MathUtils.lerp(0.5, 0.2, blend);
    const moonTarget = THREE.MathUtils.lerp(0.96, 0.56, blend);
    const moonFillTarget = THREE.MathUtils.lerp(0.34, 0.21, blend);

    if (ambientRef.current) ambientRef.current.intensity = ambientTarget;
    if (hemiRef.current) hemiRef.current.intensity = hemiTarget;
    if (moonRef.current) moonRef.current.intensity = moonTarget;
    if (moonFillRef.current) moonFillRef.current.intensity = moonFillTarget;
    if (moonRef.current) {
      moonRef.current.color.copy(new THREE.Color('#bdd4f5')).lerp(new THREE.Color('#6988ff'), blend);
    }
    if (moonFillRef.current) {
      moonFillRef.current.color.copy(new THREE.Color('#7f9fc1')).lerp(new THREE.Color('#3f57a5'), blend);
    }
    if (fogRef.current) {
      fogRef.current.density = THREE.MathUtils.lerp(0.008, 0.038, blend);
      fogRef.current.color.set(
        new THREE.Color('#7f99b8').lerp(new THREE.Color('#06080d'), blend)
      );
    }
    gl.toneMappingExposure = THREE.MathUtils.lerp(1.02, 0.92, blend);
  });

  return (
    <>
      <color attach="background" args={[visibilityMode === 'day' ? '#80a4d2' : '#020307']} />
      <fogExp2 ref={fogRef} attach="fog" args={['#7f99b8', 0.008]} />

      {visibilityMode === 'day' ? (
        <Sky
          distance={360}
          sunPosition={[2.8, 2.4, -6]}
          turbidity={10.5}
          rayleigh={1.6}
          mieCoefficient={0.015}
          mieDirectionalG={0.86}
        />
      ) : (
        <Stars radius={110} depth={60} count={1300} factor={1.8} fade speed={0.14} />
      )}

      <ambientLight ref={ambientRef} intensity={0.42} />
      <hemisphereLight ref={hemiRef} color="#8eaed4" groundColor="#223128" intensity={0.2} />
      <directionalLight
        ref={moonRef}
        color="#6988ff"
        intensity={0.38}
        position={[8, 12, 6]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        ref={moonFillRef}
        color="#3f57a5"
        intensity={0.14}
        position={[-10, 7, -8]}
      />

      <ForestGround />
      <TreeRing />
      <StoneScatter />
      <ForestUnderbrush />
      <Bonfire nightBlend={nightBlendRef} visibilityMode={visibilityMode} />
      <DarkSkulls nightBlend={nightBlendRef} />
      <DriftingFog nightBlend={nightBlendRef} visibilityMode={visibilityMode} />
      <FloatingParticles kind="ash" nightBlend={nightBlendRef} visibilityMode={visibilityMode} />
      <FloatingParticles kind="dust" nightBlend={nightBlendRef} visibilityMode={visibilityMode} />
      <Fireflies nightBlend={nightBlendRef} />

      {players.map((player, i) => (
        <AvatarSeat
          key={player.id}
          player={player}
          index={i}
          total={players.length}
          myId={myId}
          voteCount={voteTally[player.id] ?? 0}
          visibilityMode={visibilityMode}
          onPlayerClick={onPlayerClick}
          showLabels={showLabels}
        />
      ))}

      <OrbitControls
        makeDefault
        target={[0, 1.55, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.65}
        zoomSpeed={0.9}
        minDistance={4.4}
        maxDistance={14.6}
        minPolarAngle={0.5}
        maxPolarAngle={1.48}
      />
    </>
  );
}

export const TableScene = memo(function TableScene({
  players,
  myId,
  myRole,
  voteTally,
  phase,
  onPlayerClick,
  showLabels = true,
}: TableSceneProps) {
  useEffect(() => {
    players.forEach((player) => {
      if (player.avatar?.url) {
        useGLTF.preload(player.avatar.url);
      }
    });
  }, [players]);

  const isDaylight = phase === 'day' || phase === 'vote';
  const sceneVeilOpacity = isDaylight ? 0.18 : 0;
  const sceneStyle = useMemo<CSSProperties>(
    () => ({
      ...SCENE_SHELL_STYLE,
      border: isDaylight ? '1px solid rgba(126, 162, 220, 0.6)' : SCENE_SHELL_STYLE.border,
      background: isDaylight
        ? 'linear-gradient(180deg, #7f9fc6 0%, #4d6483 35%, #1f2f2f 100%)'
        : SCENE_SHELL_STYLE.background,
      boxShadow: isDaylight
        ? '0 16px 34px rgba(8,16,28,0.55), inset 0 0 55px rgba(0,0,0,0.28)'
        : SCENE_SHELL_STYLE.boxShadow,
    }),
    [isDaylight]
  );
  const hudHintStyle = useMemo<CSSProperties>(
    () => ({
      ...HUD_HINT_STYLE,
      border: isDaylight ? '1px solid rgba(156,190,245,0.55)' : HUD_HINT_STYLE.border,
      background: isDaylight ? 'rgba(8, 22, 40, 0.62)' : HUD_HINT_STYLE.background,
      color: isDaylight ? '#d7e7ff' : HUD_HINT_STYLE.color,
    }),
    [isDaylight]
  );

  return (
    <div style={sceneStyle}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4.7, 8.6], fov: 40 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <HauntedForestScene
          players={players}
          myId={myId}
          myRole={myRole}
          voteTally={voteTally}
          phase={phase}
          onPlayerClick={onPlayerClick}
          showLabels={showLabels}
        />
      </Canvas>

      <div style={hudHintStyle}>Drag to rotate • Scroll to zoom</div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: sceneVeilOpacity,
          transition: 'opacity 1800ms ease',
          background: isDaylight
            ? 'radial-gradient(circle at center, rgba(40,62,86,0.02) 0%, rgba(6,14,22,0.38) 82%)'
            : 'radial-gradient(circle at center, rgba(2,4,8,0.2) 0%, rgba(0,0,0,0.82) 78%)',
        }}
      />
    </div>
  );
});
