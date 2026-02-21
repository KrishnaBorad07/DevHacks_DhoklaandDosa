// =============================================================================
// components/TableScene.tsx – Bonfire in a dark forest night scene
// Players stand in a circle around a crackling campfire, surrounded by pines.
// =============================================================================
import { Suspense, useMemo, useRef, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getAvatarColor, getInitials } from '../lib/avatarUtils';
import type { PublicPlayer } from '../types/game';

interface TableSceneProps {
  players: PublicPlayer[];
  myId: string | null;
  voteTally: Record<string, number>;
  phase: string;
  onPlayerClick?: (playerId: string) => void;
}

const ORBIT_RADIUS = 5.0;
const GROUND_Y = -0.45;

// ── Flickering fire light ──────────────────────────────────────────────────────
function FireLight() {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.intensity = 4 + Math.sin(t * 9.3) * 1.1 + Math.sin(t * 17) * 0.5;
    const hue = 0.07 + Math.sin(t * 5) * 0.015;
    ref.current.color.setHSL(hue, 1, 0.55);
  });
  return (
    <pointLight
      ref={ref}
      position={[0, 1.2, 0]}
      color="#ff7700"
      intensity={4}
      distance={18}
      castShadow
      shadow-mapSize={[512, 512]}
    />
  );
}

// ── Animated bonfire flame cone ────────────────────────────────────────────────
function FlameLayer({ radius, height, color, emissive, speed, phaseOffset }: {
  radius: number; height: number; color: string; emissive: string; speed: number; phaseOffset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + phaseOffset;
    ref.current.scale.x = 1 + Math.sin(t) * 0.12 + Math.cos(t * 1.37) * 0.06;
    ref.current.scale.z = 1 + Math.cos(t * 1.1) * 0.12 + Math.sin(t * 1.71) * 0.06;
    ref.current.scale.y = 1 + Math.sin(t * 0.8) * 0.18;
    ref.current.rotation.y = t * 0.3;
  });
  return (
    <mesh ref={ref}>
      <coneGeometry args={[radius, height, 7]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={2.5} transparent opacity={0.88} depthWrite={false} />
    </mesh>
  );
}

// ── Single floating ember/spark ───────────────────────────────────────────────
function Spark({ offset, x0, z0 }: { offset: number; x0: number; z0: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * 0.55 + offset) % 1);
    ref.current.position.y = GROUND_Y + t * 3.2 + 0.3;
    ref.current.position.x = x0 + Math.sin(clock.elapsedTime * 2.1 + offset * 7) * t * 0.35;
    ref.current.position.z = z0 + Math.cos(clock.elapsedTime * 1.8 + offset * 5) * t * 0.35;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = Math.max(0, (1 - t * 1.4) * 0.95);
    const s = (1 - t * 0.7) * 0.04 + 0.008;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} position={[x0, GROUND_Y, z0]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#ffcc44" emissive="#ff8800" emissiveIntensity={4} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

// ── Rising smoke puff ─────────────────────────────────────────────────────────
function SmokePuff({ offset }: { offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * 0.18 + offset) % 1);
    ref.current.position.y = GROUND_Y + 1 + t * 5;
    ref.current.position.x = Math.sin(clock.elapsedTime * 0.4 + offset * 4) * t * 0.6;
    ref.current.position.z = Math.cos(clock.elapsedTime * 0.35 + offset * 3) * t * 0.6;
    ref.current.scale.setScalar(0.15 + t * 1.1);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = Math.max(0, (1 - t) * 0.22);
  });
  return (
    <mesh ref={ref} position={[0, GROUND_Y + 1, 0]}>
      <sphereGeometry args={[0.3, 7, 7]} />
      <meshStandardMaterial color="#aaaaaa" transparent opacity={0.2} depthWrite={false} />
    </mesh>
  );
}

// ── Complete bonfire assembly ─────────────────────────────────────────────────
function Bonfire() {
  const sparks = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      offset: i * 0.045,
      x0: (Math.sin(i * 2.3) * 0.22),
      z0: (Math.cos(i * 1.8) * 0.22),
    })), []);

  return (
    <group position={[0, GROUND_Y, 0]}>
      {/* Stone circle */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.52, 0.04, Math.sin(a) * 0.52]}>
            <boxGeometry args={[0.14, 0.1, 0.1]} />
            <meshStandardMaterial color="#3d3530" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Log A */}
      <mesh rotation={[0, Math.PI * 0.18, Math.PI / 2.5]} position={[0.18, 0.07, 0.05]}>
        <cylinderGeometry args={[0.055, 0.07, 0.88, 7]} />
        <meshStandardMaterial color="#2a1506" roughness={1} />
      </mesh>
      {/* Log B */}
      <mesh rotation={[0, -Math.PI * 0.18, Math.PI / 2.5]} position={[-0.18, 0.07, 0.05]}>
        <cylinderGeometry args={[0.055, 0.07, 0.88, 7]} />
        <meshStandardMaterial color="#2a1506" roughness={1} />
      </mesh>
      {/* Log C */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]} position={[0, 0.07, -0.18]}>
        <cylinderGeometry args={[0.05, 0.065, 0.80, 7]} />
        <meshStandardMaterial color="#2d1807" roughness={1} />
      </mesh>

      {/* Ember glow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshStandardMaterial color="#ff3300" emissive="#ff1a00" emissiveIntensity={1.5} transparent opacity={0.7} />
      </mesh>

      {/* Outer ember haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.75, 32]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.6} transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Flames – layered cones */}
      <group position={[0, 0.28, 0]}>
        <FlameLayer radius={0.28} height={0.62} color="#ffee00" emissive="#ffcc00" speed={6.5} phaseOffset={0} />
        <FlameLayer radius={0.22} height={0.90} color="#ff8800" emissive="#ff5500" speed={5.0} phaseOffset={1.2} />
        <FlameLayer radius={0.14} height={1.20} color="#ff4400" emissive="#ff2200" speed={7.8} phaseOffset={2.5} />
        <FlameLayer radius={0.09} height={1.50} color="#ffffff" emissive="#ffcc88" speed={9.0} phaseOffset={0.7} />
      </group>

      {/* Sparks */}
      {sparks.map((s, i) => <Spark key={i} {...s} />)}

      {/* Smoke */}
      {Array.from({ length: 6 }, (_, i) => <SmokePuff key={i} offset={i * 0.167} />)}

      {/* Fire light */}
      <FireLight />
    </group>
  );
}

// ── Pine tree ─────────────────────────────────────────────────────────────────
function PineTree({ x, z, height, radius }: { x: number; z: number; height: number; radius: number }) {
  return (
    <group position={[x, GROUND_Y, z]}>
      {/* Trunk */}
      <mesh position={[0, height * 0.2, 0]}>
        <cylinderGeometry args={[radius * 0.12, radius * 0.18, height * 0.45, 6]} />
        <meshStandardMaterial color="#1a0d04" roughness={1} />
      </mesh>
      {/* Bottom foliage */}
      <mesh position={[0, height * 0.5, 0]}>
        <coneGeometry args={[radius, height * 0.55, 6]} />
        <meshStandardMaterial color="#071407" roughness={1} />
      </mesh>
      {/* Mid foliage */}
      <mesh position={[0, height * 0.68, 0]}>
        <coneGeometry args={[radius * 0.72, height * 0.45, 6]} />
        <meshStandardMaterial color="#091a09" roughness={1} />
      </mesh>
      {/* Top */}
      <mesh position={[0, height * 0.85, 0]}>
        <coneGeometry args={[radius * 0.42, height * 0.35, 6]} />
        <meshStandardMaterial color="#0b200b" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Star field (procedural) ────────────────────────────────────────────────────
function Stars() {
  const positions = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // upper hemisphere only
      const r = 22 + Math.random() * 4;
      pts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 2,
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    return new Float32Array(pts);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e8eeff" size={0.06} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

// ── Moon ─────────────────────────────────────────────────────────────────────
function Moon() {
  return (
    <mesh position={[-10, 14, -18]}>
      <sphereGeometry args={[1.4, 16, 16]} />
      <meshStandardMaterial color="#d8e4ff" emissive="#b0c8ff" emissiveIntensity={1.2} />
    </mesh>
  );
}

// ── Forest ring ───────────────────────────────────────────────────────────────
function Forest() {
  const trees = useMemo(() => {
    const rng = (seed: number) => ((seed * 9301 + 49297) & 0x7fffffff) / 0x7fffffff;
    return Array.from({ length: 32 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2 + rng(i * 3) * 0.2;
      const r = 7.5 + rng(i * 7) * 4.5;
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        height: 2.8 + rng(i * 11) * 2.4,
        radius: 0.85 + rng(i * 13) * 0.55,
      };
    });
  }, []);

  return (
    <>
      {trees.map((t, i) => <PineTree key={i} {...t} />)}
    </>
  );
}

// ── Ground ────────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <>
      {/* Dark earth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color="#0e1108" roughness={1} />
      </mesh>
      {/* Firelit dirt circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.001, 0]}>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#1a1005" roughness={1} />
      </mesh>
    </>
  );
}

// ── Vote ring around player ───────────────────────────────────────────────────
function VoteRing({ count }: { count: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || count <= 0) return;
    const s = 1 + Math.sin(clock.elapsedTime * 5) * 0.07;
    ref.current.scale.set(s, s, s);
  });
  if (count <= 0) return null;
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.02, 0]}>
      <torusGeometry args={[0.46, 0.036, 8, 40]} />
      <meshStandardMaterial color="#ff2020" emissive="#ff2020" emissiveIntensity={2} />
    </mesh>
  );
}

// ── Gold orb above "me" ───────────────────────────────────────────────────────
function MyIndicator() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 2.2 + Math.sin(clock.elapsedTime * 2.5) * 0.09;
  });
  return (
    <mesh ref={ref} position={[0, 2.2, 0]}>
      <sphereGeometry args={[0.065, 8, 8]} />
      <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={4} />
    </mesh>
  );
}

// ── RPM 3D model loader ────────────────────────────────────────────────────────
function AvatarModel({ url, alive }: { url: string; alive: boolean }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const n = m.clone();
            if (!alive) (n as THREE.MeshStandardMaterial).color?.set('#555');
            return n;
          });
        } else {
          mesh.material = mesh.material.clone();
          if (!alive) (mesh.material as THREE.MeshStandardMaterial).color?.set('#555');
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene, alive]);

  return <primitive object={cloned} position={[0, GROUND_Y, 0]} scale={[1.05, 1.05, 1.05]} />;
}

// ── Geometric silhouette fallback ─────────────────────────────────────────────
function GeometricAvatar({ color, initials, alive }: { color: string; initials: string; alive: boolean }) {
  const c = alive ? color : '#555';
  const emissive = alive ? color : '#222';
  const op = alive ? 1 : 0.4;
  return (
    <group position={[0, GROUND_Y, 0]}>
      {/* Body */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.95, 8]} />
        <meshStandardMaterial color={c} emissive={emissive} emissiveIntensity={0.85} roughness={0.7} transparent opacity={op} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.22, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.16, 8]} />
        <meshStandardMaterial color={c} emissive={emissive} emissiveIntensity={0.85} roughness={0.7} transparent opacity={op} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.52, 0]} castShadow>
        <sphereGeometry args={[0.25, 10, 10]} />
        <meshStandardMaterial color={c} emissive={emissive} emissiveIntensity={0.85} roughness={0.6} transparent opacity={op} />
      </mesh>
    </group>
  );
}

function PlayerAvatarLoader({ player }: { player: PublicPlayer }) {
  if (!player.avatar?.url) {
    return <GeometricAvatar color={getAvatarColor(player.name)} initials={getInitials(player.name)} alive={player.alive} />;
  }
  return (
    <Suspense fallback={<GeometricAvatar color={getAvatarColor(player.name)} initials={getInitials(player.name)} alive={player.alive} />}>
      <AvatarModel url={player.avatar.url} alive={player.alive} />
    </Suspense>
  );
}

// ── One player positioned around the fire ─────────────────────────────────────
function PlayerSlot({ player, index, total, isMe, voteCount, onPlayerClick }: {
  player: PublicPlayer; index: number; total: number;
  isMe: boolean; voteCount: number; onPlayerClick?: (id: string) => void;
}) {
  const angle = (2 * Math.PI / total) * index - Math.PI / 2;
  const x = Math.cos(angle) * ORBIT_RADIUS;
  const z = Math.sin(angle) * ORBIT_RADIUS;
  // Face toward the fire at origin
  const rotY = Math.atan2(x, z);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (onPlayerClick && player.alive) onPlayerClick(player.id);
  }

  const tagColor = voteCount > 0 ? '#ff4444' : isMe ? '#ffd700' : '#e8d4b0';

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* Invisible click hitbox */}
      <mesh onClick={handleClick} visible={false}>
        <cylinderGeometry args={[0.5, 0.5, 2.2, 8]} />
        <meshBasicMaterial />
      </mesh>

      {/* Avatar */}
      <group onClick={handleClick}>
        <PlayerAvatarLoader player={player} />
      </group>

      {/* Vote ring */}
      <VoteRing count={voteCount} />

      {/* My indicator */}
      {isMe && <MyIndicator />}

      {/* Name tag */}
      <Html position={[0, 2.1, 0]} center distanceFactor={8} occlude={false} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: tagColor,
          background: 'rgba(0,0,0,0.78)',
          border: `1px solid ${voteCount > 0 ? 'rgba(255,50,50,0.55)' : isMe ? 'rgba(255,215,0,0.4)' : 'rgba(255,200,160,0.15)'}`,
          borderRadius: 3,
          padding: '2px 8px',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)',
          opacity: player.alive ? 1 : 0.5,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {!player.alive && '💀'}{player.name}
          {isMe && <span style={{ color: 'rgba(255,215,0,0.5)', fontSize: 9, marginLeft: 2 }}>(you)</span>}
          {voteCount > 0 && (
            <span style={{ background: '#ff2020', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
              {voteCount}
            </span>
          )}
        </div>
      </Html>

      {!player.connected && player.alive && (
        <Html position={[0, 1.75, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{ background: '#cc2200', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 2, fontFamily: 'var(--font-display)' }}>offline</div>
        </Html>
      )}
    </group>
  );
}

// ── Main Canvas export ────────────────────────────────────────────────────────
export const TableScene = memo(function TableScene({ players, myId, voteTally, phase, onPlayerClick }: TableSceneProps) {
  return (
    <div style={{ width: '100%', height: 490, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: [0, 6, 11], fov: 50, near: 0.1, far: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}
      >
        {/* Sky */}
        <color attach="background" args={['#060810']} />
        {/* Forest mist — start further so players don't get fogged out */}
        <fog attach="fog" args={['#07090e', 16, 32]} />

        {/* Keep fire atmosphere but ensure ALL players are clearly visible */}
        {/* Strong hemisphere: warm fire-orange from sky, warm ground bounce */}
        <hemisphereLight args={['#ff9933', '#3a2010', 2.0]} />
        {/* Warm ambient so zero player is in shadow */}
        <ambientLight intensity={0.6} color="#ffcc88" />
        {/* Moonlight fill from upper-left */}
        <directionalLight position={[-8, 12, -15]} intensity={0.4} color="#8090d0" />
        {/* Camera-side fill — the most important light for player fronts */}
        <directionalLight position={[0, 6, 9]} intensity={0.7} color="#ffe8c0" />

        {/* Scene objects */}
        <Ground />
        <Forest />
        <Stars />
        <Moon />
        <Bonfire />

        {/* Players */}
        {players.map((player, i) => (
          <PlayerSlot
            key={player.id}
            player={player}
            index={i}
            total={players.length}
            isMe={player.id === myId}
            voteCount={voteTally[player.id] ?? 0}
            onPlayerClick={onPlayerClick}
          />
        ))}

        {/* Camera — user can orbit with mouse drag */}
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.48}
          autoRotate={false}
          target={[0, 0.5, 0]}
        />
      </Canvas>

      {phase === 'vote' && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.12em',
          color: 'rgba(255,200,100,0.55)', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          🔥 CLICK A PLAYER TO VOTE · DRAG TO LOOK AROUND
        </div>
      )}
    </div>
  );
});
