import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { TrendingUp, Clock, Edit2, Check } from 'lucide-react';

export default function Header() {
    // NEW: Deconstruct currentDailyGoal and actions
    const { metrics, session, t, toggleLanguage, language, currentDailyGoal, actions } = useFinance();

    // Safe defaults - Use currentDailyGoal directly
    const goal = currentDailyGoal || 100;
    const current = metrics.totalEarnings || 0;
    const progress = Math.min((current / goal) * 100, 100);

    // Edit Weekly Goal State
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(metrics.weeklyGoal);

    // Sync temp goal when metrics change (unless editing)
    useEffect(() => {
        if (!isEditingGoal) setTempGoal(metrics.weeklyGoal);
    }, [metrics.weeklyGoal, isEditingGoal]);

    const handleSaveGoal = () => {
        const val = parseFloat(tempGoal);
        if (!isNaN(val) && val > 0) {
            actions.updateWeeklyGoal(val);
        }
        setIsEditingGoal(false);
    };

    // Edit Daily Goal State
    const [isEditingDaily, setIsEditingDaily] = useState(false);
    const [tempDaily, setTempDaily] = useState(goal);

    useEffect(() => {
        if (!isEditingDaily) setTempDaily(goal);
    }, [goal, isEditingDaily]);

    const handleSaveDaily = () => {
        const val = parseFloat(tempDaily);
        console.log("Saving Daily Goal:", val);
        if (!isNaN(val) && val > 0) {
            actions.updateDailyGoal(val);
            // Force local update if context is slow
            setTempDaily(val);
        } else {
            console.warn("Invalid daily goal value:", tempDaily);
        }
        setIsEditingDaily(false);
    };

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
                    <span className="text-muted">/ </span>
                    {isEditingDaily ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                value={tempDaily}
                                onChange={(e) => setTempDaily(e.target.value)}
                                style={{
                                    width: '60px',
                                    background: '#000',
                                    border: '1px solid var(--accent-color)',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    padding: '2px 4px',
                                    fontSize: '12px'
                                }}
                                autoFocus
                            />
                            <button onClick={handleSaveDaily} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00D775' }}>
                                <Check size={14} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="text-muted">${goal}</span>
                            <button onClick={() => setIsEditingDaily(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                <Edit2 size={12} color="#fff" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Daily Progress Bar */}
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

            {/* Weekly Progress Section - Collapsible or Compact */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{t.weeklyProgress}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            ${metrics.weeklyEarnings.toFixed(0)} /
                        </span>

                        {isEditingGoal ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="number"
                                    value={tempGoal}
                                    onChange={(e) => setTempGoal(e.target.value)}
                                    style={{
                                        width: '60px',
                                        background: '#000',
                                        border: '1px solid var(--accent-color)',
                                        color: '#fff',
                                        borderRadius: '4px',
                                        padding: '2px 4px',
                                        fontSize: '12px'
                                    }}
                                    autoFocus
                                />
                                <button onClick={handleSaveGoal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00D775' }}>
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    ${metrics.weeklyGoal}
                                </span>
                                <button onClick={() => setIsEditingGoal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                    <Edit2 size={12} color="#fff" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div style={{
                    height: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(100, (metrics.weeklyEarnings / (isEditingGoal ? tempGoal : metrics.weeklyGoal)) * 100)}%`,
                        background: '#0078D7', // Blue for Weekly to differentiate
                        boxShadow: '0 0 5px rgba(0, 120, 215, 0.5)',
                        transition: 'width 0.5s ease-out'
                    }} />
                </div>
            </div>

        </header>
    );
}
