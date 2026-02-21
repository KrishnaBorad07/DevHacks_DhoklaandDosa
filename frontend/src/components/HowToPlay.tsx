import { useNavigate } from 'react-router-dom';

interface Rule {
    icon: string;
    title: string;
    body: string;
}

const RULES: Rule[] = [
    {
        icon: '🎭',
        title: 'Roles',
        body: 'Each player is secretly assigned a role: Mafia, Detective, Doctor, or Citizen. Only the Mafia know each other.',
    },
    {
        icon: '🌙',
        title: 'Night Phase',
        body: 'Mafia silently choose a target to eliminate. The Doctor may save one player. The Detective can investigate one player\'s allegiance.',
    },
    {
        icon: '☀️',
        title: 'Day Phase',
        body: 'All surviving players discuss who they suspect. Vote to eliminate the most suspicious player. Majority wins the vote.',
    },
    {
        icon: '🗳️',
        title: 'Voting',
        body: 'Players nominate and vote. The player with the most votes is eliminated and their role is revealed for all to see.',
    },
    {
        icon: '🏆',
        title: 'Winning',
        body: 'Citizens win by eliminating all Mafia. Mafia win when they equal or outnumber the remaining Citizens.',
    },
    {
        icon: '🔍',
        title: 'Detective',
        body: 'Each night the Detective picks one player and learns whether they are Mafia. Use this information wisely!',
    },
    {
        icon: '💊',
        title: 'Doctor',
        body: 'Each night the Doctor protects one player from elimination. The Doctor may protect themselves, but only once.',
    },
    {
        icon: '🎲',
        title: 'Min. Players',
        body: 'A room requires at least 4 players before the host can start the game. The more players, the more Mafia members.',
    },
];

export function HowToPlay() {
    const navigate = useNavigate();

    return (
        <div
            style={{
                minHeight: '100dvh',
                width: '100%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3rem 1rem 4rem',
                background: 'linear-gradient(to bottom, #000 0%, #050510 40%, #0a0a15 70%, #050505 100%)',
                position: 'relative',
            }}
        >
            {/* ── Rain overlay ── */}
            <div className="rain-bg" style={{ position: 'fixed' }} />

            {/* ── Back button ── */}
            <div style={{ width: '100%', maxWidth: '760px', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                <button
                    id="btn-back-to-landing"
                    className="btn-noir btn-gold"
                    style={{ padding: '0.5rem 1.4rem', fontSize: '0.85rem' }}
                    onClick={() => navigate('/')}
                >
                    ← Back
                </button>
            </div>

            {/* ── Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
                <p style={{ fontFamily: 'var(--font-typewriter)', color: 'var(--noir-text-dim)', fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Case File
                </p>
                <h1
                    className="heading-gold"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '0.06em' }}
                >
                    How to Play
                </h1>
                <p style={{ color: 'var(--noir-text-dim)', fontFamily: 'var(--font-typewriter)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Who Lies Tonight? — Field Manual
                </p>
            </div>

            {/* ── Rules Grid ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                    width: '100%',
                    maxWidth: '760px',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {RULES.map((rule) => (
                    <div
                        key={rule.title}
                        className="glass-card"
                        style={{ padding: '1.4rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>{rule.icon}</span>
                            <h2
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    color: 'var(--noir-gold)',
                                    fontSize: '1rem',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {rule.title}
                            </h2>
                        </div>
                        <hr className="divider-gold" style={{ margin: '0.25rem 0' }} />
                        <p
                            className="typewriter-text"
                            style={{ fontSize: '0.88rem', lineHeight: 1.65 }}
                        >
                            {rule.body}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Footer ── */}
            <div style={{ marginTop: '3rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-typewriter)', color: 'var(--noir-text-dim)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
                    ◆ &nbsp; TRUST NO ONE &nbsp; ◆
                </p>
            </div>
        </div>
    );
}
