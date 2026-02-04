import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { TrendingUp, Clock } from 'lucide-react';

export default function Header() {
    const { metrics, session, t, toggleLanguage, language } = useFinance();

    // Safe defaults
    const goal = session.meta || 100;
    const current = metrics.totalEarnings || 0;
    const progress = Math.min((current / goal) * 100, 100);

    return (
        <header className="card glass-card" style={{ marginBottom: '16px', padding: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{t.dailyOutput}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={toggleLanguage}
                        style={{
                            background: 'none', border: '1px solid #333', color: '#666',
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', marginRight: '8px'
                        }}
                    >
                        {language.toUpperCase()}
                    </button>
                    <TrendingUp size={18} color="var(--accent-color)" />
                    <span className="text-accent" style={{ fontWeight: 'bold' }}>
                        ${current.toFixed(2)}
                    </span>
                    <span className="text-muted">/ ${goal}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{
                height: '8px',
                background: '#333',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--accent-color)',
                    boxShadow: '0 0 10px var(--accent-glow)',
                    transition: 'width 0.5s ease-out'
                }} />
            </div>

            <div className="flex-between" style={{ marginTop: '8px', fontSize: '12px' }}>
                <span className="text-muted">
                    {(100 - progress).toFixed(1)}% {t.remaining}
                </span>
                {session.endTime && (
                    <span className="text-muted flex-between" style={{ gap: '4px' }}>
                        <Clock size={12} />
                        {t.end}: {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </header>
    );
}
