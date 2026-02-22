import Spline from '@splinetool/react-spline';
import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();
  const [splineLoaded, setSplineLoaded] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* ── Animations ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bloodDrip {
          0%   { transform: translateY(-8px) scaleY(0); opacity: 0; }
          10%  { opacity: 1; transform: translateY(0) scaleY(1); }
          85%  { opacity: 1; }
          100% { transform: translateY(100px) scaleY(2.4); opacity: 0; }
        }
        @keyframes skullFloat {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes skullPulse {
          0%, 100% { filter: drop-shadow(0 0 10px #ff0000) drop-shadow(0 0 28px #ff000055); }
          50%       { filter: drop-shadow(0 0 22px #ff0000) drop-shadow(0 0 60px #ff000099); }
        }
        @keyframes titleGlitch {
          0%, 94%, 100% { text-shadow: 0 0 32px #ff0000, 0 0 64px #ff000055; }
          95% { text-shadow: 5px 0 0 #ff0000, -5px 0 0 #00ffee, 0 0 40px #ff0000aa; }
          97% { text-shadow: -5px 0 0 #ff0000, 5px 0 0 #00ffee, 0 0 40px #ff0000aa; }
          98% { text-shadow: 0 0 32px #ff0000, 0 0 64px #ff000055; }
        }
        .blood-drop {
          position: absolute;
          width: 7px;
          border-radius: 0 0 50% 50%;
          background: linear-gradient(to bottom, #cc0000, #770000);
          animation: bloodDrip linear infinite;
        }
        .btn-doom {
          position: relative;
          overflow: hidden;
          transition: all 0.22s ease;
          cursor: pointer;
        }
        .btn-doom:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 32px #ff000099, 0 10px 40px #ff000044 !important;
        }
        .btn-doom:active { transform: translateY(1px); }
      `}</style>

      {/* ── Spline 3D Background ─────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#000' }} />}>
          <Spline
            scene="https://prod.spline.design/qYh9TvxXqQXU9XVo/scene.splinecode"
            style={{ width: '100%', height: '100%' }}
            onLoad={() => setSplineLoaded(true)}
          />
        </Suspense>
      </div>

      {/* ── Dark vignette ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* ── Center Content ───────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '2rem',
          opacity: splineLoaded ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: 'none',
        }}
      >
        {/* Title block */}
        <div style={{ textAlign: 'center' }}>

          {/* Animated skull with blood drips */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.6rem' }}>
            <div style={{
              fontSize: 'clamp(3.5rem, 9vw, 5.5rem)',
              display: 'inline-block', lineHeight: 1,
              animation: 'skullFloat 3.2s ease-in-out infinite, skullPulse 2s ease-in-out infinite',
            }}>
              💀
            </div>
            {/* Blood drops */}
            {[
              { left: '18%', height: '26px', delay: '0s', dur: '1.5s' },
              { left: '33%', height: '38px', delay: '0.4s', dur: '1.9s' },
              { left: '50%', height: '20px', delay: '0.8s', dur: '1.3s' },
              { left: '66%', height: '32px', delay: '0.2s', dur: '1.7s' },
              { left: '80%', height: '16px', delay: '0.6s', dur: '1.2s' },
            ].map((d, i) => (
              <div
                key={i}
                className="blood-drop"
                style={{ left: d.left, height: d.height, animationDelay: d.delay, animationDuration: d.dur, top: '82%' }}
              />
            ))}
          </div>

          {/* WHO LIES */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              letterSpacing: '0.06em',
              lineHeight: 1,
              color: '#ff1a1a',
              animation: 'titleGlitch 5s ease-in-out infinite',
              textTransform: 'uppercase',
              marginBottom: '0',
            }}
          >
            WHO LIES
            <br />
            {/* TONIGHT? in gold/yellow with red glow */}
            <span style={{
              color: '#FFD700',
              textShadow: '0 0 20px #ff0000, 0 0 45px #ff000077, 0 0 90px #ff000033',
            }}>
              TONIGHT?
            </span>
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-typewriter)',
              color: 'rgba(255,110,110,0.85)',
              fontSize: '0.9rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginTop: '0.75rem',
            }}
          >
            ☠ A GAME OF DECEPTION &amp; DEDUCTION ☠
          </p>

          {/* Red glowing line */}
          <div style={{
            margin: '1.2rem auto 0',
            width: '260px', height: '2px',
            background: 'linear-gradient(to right, transparent, #ff0000, #ff0000, transparent)',
            boxShadow: '0 0 12px #ff000077',
          }} />
        </div>

        {/* Buttons — re-enable pointer events only here */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: '1rem',
            width: 'min(320px, 80vw)',
            pointerEvents: 'auto',
          }}
        >
          <button
            id="btn-play-now"
            className="btn-noir btn-filled-red btn-doom"
            style={{
              width: '100%',
              padding: '1.1rem 1.8rem',
              fontSize: '1.15rem',
              letterSpacing: '0.12em',
              fontWeight: 700,
            }}
            onClick={() => navigate('/play')}
          >
            ▶ &nbsp; PLAY NOW
          </button>

          <button
            id="btn-how-to-play"
            className="btn-noir btn-gold btn-doom"
            style={{
              width: '100%',
              padding: '1rem 1.8rem',
              fontSize: '1rem',
              letterSpacing: '0.1em',
            }}
            onClick={() => navigate('/how-to-play')}
          >
            ? &nbsp; HOW TO PLAY
          </button>
        </div>
      </div>

      {/* ── Loading screen ───────────────────────────────────────────────── */}
      {!splineLoaded && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#000',
          }}
        >
          <p style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--noir-gold)',
            fontSize: '1.1rem',
            letterSpacing: '0.3em',
            animation: 'flicker 2s infinite',
          }}>
            Loading…
          </p>
        </div>
      )}
    </div>
  );
}
