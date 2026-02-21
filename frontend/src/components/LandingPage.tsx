import Spline from '@splinetool/react-spline';
import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();
  const [splineLoaded, setSplineLoaded] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* ── Spline 3D Background ────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        <Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#000' }} />}>
          <Spline
            scene="https://prod.spline.design/qYh9TvxXqQXU9XVo/scene.splinecode"
            style={{ width: '100%', height: '100%' }}
            onLoad={() => setSplineLoaded(true)}
          />
        </Suspense>
      </div>

      {/* ── Subtle dark vignette so text pops ──────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* ── Center Content — pointer-events:none so Spline gets mouse ───── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2.5rem',
          opacity: splineLoaded ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: 'none',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1
            className="heading-gold neon-flicker"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              letterSpacing: '0.08em',
              lineHeight: 1.15,
              marginBottom: '0.4rem',
              textShadow: '0 0 40px rgba(255,215,0,0.6), 0 0 80px rgba(255,215,0,0.3)',
            }}
          >
            Who Lies Tonight?
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-typewriter)',
              color: 'var(--noir-text-dim)',
              fontSize: '0.85rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            A game of deception &amp; deduction
          </p>
        </div>

        {/* Buttons — re-enable pointer events only here */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '280px',
            pointerEvents: 'auto',
          }}
        >
          <button
            id="btn-play-now"
            className="btn-noir btn-filled-red"
            style={{ width: '100%', padding: '0.85rem 1.6rem', fontSize: '1rem' }}
            onClick={() => navigate('/play')}
          >
            ▶ &nbsp; Play Now
          </button>

          <button
            id="btn-how-to-play"
            className="btn-noir btn-gold"
            style={{ width: '100%', padding: '0.85rem 1.6rem', fontSize: '1rem' }}
            onClick={() => navigate('/how-to-play')}
          >
            ? &nbsp; How to Play
          </button>
        </div>
      </div>

      {/* ── Loading fallback while Spline initialises ────────────────────── */}
      {!splineLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--noir-gold)',
              fontSize: '1.1rem',
              letterSpacing: '0.3em',
              animation: 'flicker 2s infinite',
            }}
          >
            Loading…
          </p>
        </div>
      )}
    </div>
  );
}
