// =============================================================================
// pages/AvatarTest.tsx  –  Mixamo animation tester + bone inspector
// Visit: http://localhost:5173/avatar-test
//
// HOW TO USE:
//  1. Paste your RPM avatar GLB URL → Load Avatar
//  2. Drop/select Mixamo FBX/GLB files (without skin) → they appear as buttons
//  3. Click an animation button to play it on the avatar
//  4. Bone list shows all bone names for debugging
// =============================================================================
import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { collectBoneNames, createAvatarMixer, remapClip } from '../lib/mixamoLoader';

// ─── Floor ────────────────────────────────────────────────────────────────────
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

// ─── Avatar renderer ──────────────────────────────────────────────────────────
function AvatarRenderer({ url, clip, onBones }: {
  url: string;
  clip: THREE.AnimationClip | null;
  onBones: (names: string[]) => void;
}) {
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.material = Array.isArray(m.material)
          ? m.material.map(mat => mat.clone())
          : m.material.clone();
      }
    });
    return c;
  }, [scene]);

  // Report bone names
  useEffect(() => {
    const names = Array.from(collectBoneNames(cloned)).sort();
    onBones(names);
  }, [cloned, onBones]);

  // Normalised scale so avatar is ~2 units tall regardless of GLB scale
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const h = box.max.y - box.min.y;
    return h > 0 ? 2 / h : 1;
  }, [cloned]);

  // Animation mixer
  const mixerManagerRef = useRef<ReturnType<typeof createAvatarMixer> | null>(null);
  const prevTimeRef = useRef(0);

  useEffect(() => {
    const mgr = createAvatarMixer(cloned);
    mixerManagerRef.current = mgr;
    return () => { mgr.dispose(); mixerManagerRef.current = null; };
  }, [cloned]);

  // Play new clip when it changes
  useEffect(() => {
    if (!clip || !mixerManagerRef.current) return;
    mixerManagerRef.current.play(clip, 0.3);
  }, [clip]);

  useFrame(({ clock }) => {
    const dt = clock.elapsedTime - prevTimeRef.current;
    prevTimeRef.current = clock.elapsedTime;
    mixerManagerRef.current?.mixer.update(dt);
  });

  return <primitive object={cloned} scale={[scale, scale, scale]} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AvatarTest() {
  const [avatarUrl, setAvatarUrl]       = useState('');
  const [urlInput, setUrlInput]         = useState('');
  const [loadedUrl, setLoadedUrl]       = useState('');          // triggers canvas remount
  const [bones, setBones]               = useState<string[]>([]);
  const [clips, setClips]               = useState<{ name: string; clip: THREE.AnimationClip }[]>([]);
  const [activeClip, setActiveClip]     = useState<THREE.AnimationClip | null>(null);
  const [activeClipName, setActiveClipName] = useState('');
  const [loadingAnim, setLoadingAnim]   = useState('');
  const [canvasKey, setCanvasKey]       = useState(0);

  // ── Load avatar ──
  const handleLoadAvatar = () => {
    if (!urlInput.trim()) return;
    setAvatarUrl(urlInput.trim());
    setLoadedUrl(urlInput.trim());
    setCanvasKey(k => k + 1);
    setBones([]);
    setActiveClip(null);
  };

  // ── Load animation file (FBX or GLB) ──
  const handleAnimFile = async (file: File) => {
    setLoadingAnim(file.name);
    try {
      const url = URL.createObjectURL(file);
      let clips: THREE.AnimationClip[] = [];

      if (file.name.endsWith('.fbx')) {
        const loader = new FBXLoader();
        const fbx = await new Promise<THREE.Group>((res, rej) => loader.load(url, res, undefined, rej));
        clips = fbx.animations;
      } else {
        // GLB
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((res, rej) => loader.load(url, res, undefined, rej));
        clips = gltf.animations;
      }

      URL.revokeObjectURL(url);

      if (clips.length === 0) {
        alert('No animation clips found in this file.');
        return;
      }

      const name = file.name.replace(/\.[^.]+$/, ''); // strip extension
      setClips(prev => [
        ...prev.filter(c => c.name !== name), // replace if same name
        ...clips.map((clip, i) => ({
          name: clips.length === 1 ? name : `${name}[${i}]`,
          clip,
        })),
      ]);
    } catch (e) {
      console.error('Failed to load animation:', e);
      alert('Error loading animation file. See console.');
    } finally {
      setLoadingAnim('');
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(handleAnimFile);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(handleAnimFile);
  };

  const handleBones = useCallback((names: string[]) => setBones(names), []);

  return (
    <div
      style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'monospace' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      {/* ── Left panel ── */}
      <div style={{ width: 300, padding: '1rem', background: '#111', borderRight: '1px solid #333', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ color: '#ffd700', margin: 0, fontSize: 14 }}>🦴 Mixamo Anim Tester</h2>

        {/* Avatar URL */}
        <div>
          <label style={{ fontSize: 11, color: '#888' }}>RPM GLB URL</label>
          <textarea
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            rows={3}
            placeholder="https://models.readyplayer.me/AVATAR_ID.glb"
            style={{ width: '100%', marginTop: 4, background: '#1a1a1a', color: '#fff', border: '1px solid #444', borderRadius: 4, padding: '0.4rem', fontSize: 11, resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button
            onClick={handleLoadAvatar}
            style={{ marginTop: 6, width: '100%', padding: '0.5rem', background: '#ffd700', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}
          >
            Load Avatar
          </button>
        </div>

        {/* Anim file drop */}
        <div>
          <label style={{ fontSize: 11, color: '#888' }}>Mixamo Animations (.fbx or .glb)</label>
          <div
            style={{ marginTop: 4, border: '2px dashed #444', borderRadius: 4, padding: '1rem', textAlign: 'center', fontSize: 11, color: '#666', cursor: 'pointer' }}
            onClick={() => document.getElementById('anim-file-input')?.click()}
          >
            {loadingAnim ? `Loading ${loadingAnim}…` : 'Drop FBX/GLB files here or click'}
          </div>
          <input id="anim-file-input" type="file" accept=".fbx,.glb" multiple onChange={handleFileInput} style={{ display: 'none' }} />
        </div>

        {/* Loaded animation buttons */}
        {clips.length > 0 && (
          <div>
            <label style={{ fontSize: 11, color: '#888' }}>Play Animation</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {clips.map(({ name, clip }) => (
                <button
                  key={name}
                  onClick={() => { setActiveClip(clip); setActiveClipName(name); }}
                  style={{
                    padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, textAlign: 'left',
                    background: activeClipName === name ? '#ffd700' : '#222',
                    color: activeClipName === name ? '#000' : '#ccc',
                    border: `1px solid ${activeClipName === name ? '#ffd700' : '#444'}`,
                    fontWeight: activeClipName === name ? 700 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={name}
                >
                  ▶ {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bone list */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <label style={{ fontSize: 11, color: '#888' }}>Bones ({bones.length})</label>
          <div style={{ marginTop: 4, overflowY: 'auto', maxHeight: 300 }}>
            {bones.length === 0
              ? <div style={{ color: '#444', fontSize: 11 }}>Load avatar first</div>
              : bones.map(b => (
                <div key={b} style={{ fontSize: 10, padding: '1px 0', color: '#6cf', borderBottom: '1px solid #161616' }}>{b}</div>
              ))}
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {!loadedUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: 14 }}>
            ← Paste an RPM .glb URL and click Load Avatar
          </div>
        ) : (
          <Canvas key={canvasKey} shadows camera={{ position: [0, 1.5, 4], fov: 50 }} gl={{ antialias: true }}>
            <color attach="background" args={['#0d0d0d']} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
            <pointLight position={[-3, 3, -2]} intensity={0.4} color="#6090ff" />
            <Floor />
            <Suspense fallback={null}>
              <AvatarRenderer url={loadedUrl} clip={activeClip} onBones={handleBones} />
            </Suspense>
            <OrbitControls target={[0, 1, 0]} />
            <gridHelper args={[10, 10, '#333', '#222']} />
          </Canvas>
        )}

        {/* Drag overlay hint */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 10, color: '#333', pointerEvents: 'none' }}>
          Drag FBX/GLB anywhere to add animation
        </div>
      </div>
    </div>
  );
}
