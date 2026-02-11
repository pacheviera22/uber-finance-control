import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Pause, Play, Edit2, Flag, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import EndShiftModal from './EndShiftModal';

export default function Stopwatch() {
    const { session, actions, metrics, t, config } = useFinance();
    const [elapsed, setElapsed] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [editTimeStr, setEditTimeStr] = useState('');
    const [editOdometer, setEditOdometer] = useState('');
    const [editEndTimeStr, setEditEndTimeStr] = useState('');

    useEffect(() => {
        let interval;
        if (session.status === 'active') {
            interval = setInterval(() => {
                const now = Date.now();
                const activeTime = now - session.startTime - session.totalPausedTime;
                setElapsed(activeTime);
            }, 1000);
        } else if (session.status === 'paused' && session.lastPauseTime) {
            const activeTime = session.lastPauseTime - session.startTime - session.totalPausedTime;
            setElapsed(activeTime);
        }
        return () => clearInterval(interval);
    }, [session]);

    const formatTime = (ms) => {
        if (ms < 0) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const toLocalISO = (timestamp) => {
        const date = new Date(timestamp);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const handleEditClick = () => {
        setEditTimeStr(toLocalISO(session.startTime));
        setEditOdometer(session.initialOdometer);
        setEditEndTimeStr(session.endTime ? toLocalISO(session.endTime) : '');
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (editTimeStr && editOdometer && editEndTimeStr) {
            const startTimestamp = new Date(editTimeStr).getTime();
            const endTimestamp = new Date(editEndTimeStr).getTime();
            if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
                actions.updateStartTime(editTimeStr);
                actions.updateStartOdometer(editOdometer);
                actions.updateEndTime(editEndTimeStr);
                setIsEditing(false);
            } else {
                alert("Invalid Date/Time format");
            }
        }
    };

    // Derived metrics
    const hours = elapsed / 3600000;
    const earningsPerHour = hours > 0 ? (metrics.totalEarnings / hours) : 0;
    const timeLeftMs = session.endTime - Date.now();
    const timeLeftHours = Math.max(0, timeLeftMs / 3600000);
    const requiredRate = timeLeftHours > 0 ? (metrics.metaRestante / timeLeftHours) : 0;

    // Net earnings calculation
    const gasPrice = config?.gasPrice || 3.30;
    const mpg = config?.vehicleMpg || 24;
    const gasCost = (metrics.milesDriven / mpg) * gasPrice;
    const maintCost = metrics.milesDriven * 0.35;
    const netEarnings = metrics.totalEarnings - gasCost - maintCost;

    // Progress
    const goalProgress = metrics.meta > 0 ? Math.min((metrics.totalEarnings / metrics.meta) * 100, 100) : 0;

    const isActive = session.status === 'active';
    const isPaused = session.status === 'paused';

    return (
        <div className="card" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '28px 24px', position: 'relative', marginBottom: '20px', overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            <EndShiftModal isOpen={isEndModalOpen} onClose={() => setIsEndModalOpen(false)} />

            {/* Background glow */}
            {isActive && (
                <div style={{
                    position: 'absolute', top: '-50px', right: '-50px',
                    width: '200px', height: '200px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 230, 118, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '14px',
                        background: isActive ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.2) 0%, rgba(0, 230, 118, 0.05) 100%)' : 'rgba(255, 179, 0, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isActive ? '0 4px 16px rgba(0, 230, 118, 0.2)' : 'none',
                        border: isActive ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 179, 0, 0.2)'
                    }}>
                        <Clock size={22} color={isActive ? "var(--accent-color)" : "var(--accent-secondary)"} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                            {t.timeOnline}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: isActive ? 'var(--accent-color)' : 'var(--accent-secondary)',
                                boxShadow: `0 0 8px ${isActive ? 'var(--accent-color)' : 'var(--accent-secondary)'}`,
                                animation: isActive ? 'pulse 2s infinite' : 'none'
                            }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: isActive ? 'var(--accent-color)' : 'var(--accent-secondary)' }}>
                                {isActive ? 'Activo' : 'Pausado'}
                            </span>
                        </div>
                    </div>
                </div>
                {!isEditing && (
                    <button onClick={handleEditClick} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                        borderRadius: '10px', padding: '10px', cursor: 'pointer', color: 'var(--text-muted)'
                    }}>
                        <Edit2 size={16} />
                    </button>
                )}
            </div>

            {/* Timer Display or Edit Form */}
            {isEditing ? (
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                        { label: t.startTime, value: editTimeStr, type: 'datetime-local', set: setEditTimeStr },
                        { label: t.startOdometer, value: editOdometer, type: 'number', set: setEditOdometer },
                        { label: t.targetEndTime, value: editEndTimeStr, type: 'datetime-local', set: setEditEndTimeStr }
                    ].map((field, i) => (
                        <div key={i}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{field.label}</label>
                            <input type={field.type} value={field.value} onChange={(e) => field.set(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px' }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button onClick={handleSaveEdit} style={{
                            flex: 1, padding: '12px', background: 'rgba(0, 230, 118, 0.2)',
                            border: '1px solid var(--accent-color)', borderRadius: '12px', color: 'var(--accent-color)', fontWeight: '600', cursor: 'pointer'
                        }}>{t.update}</button>
                        <button onClick={() => setIsEditing(false)} style={{
                            flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', cursor: 'pointer'
                        }}>{t.cancel}</button>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        fontSize: '52px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontWeight: '700',
                        color: isPaused ? 'var(--accent-secondary)' : 'var(--text-primary)', letterSpacing: '2px',
                        textShadow: isActive ? '0 0 30px rgba(0, 230, 118, 0.3)' : 'none'
                    }}>
                        {formatTime(elapsed)}
                    </div>
                    {/* Remaining Time Counter */}
                    {session.endTime && (
                        <div style={{
                            textAlign: 'right',
                            marginTop: '8px',
                            paddingRight: '4px'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '2px'
                            }}>
                                {t.timeRemaining || 'Tiempo Restante'}
                            </div>
                            <div style={{
                                fontSize: '18px',
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                fontWeight: '500',
                                color: timeLeftMs > 0 ? 'var(--text-muted)' : 'var(--accent-secondary)',
                                letterSpacing: '1px'
                            }}>
                                {formatTime(Math.max(0, timeLeftMs))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Control Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                {isActive ? (
                    <button onClick={actions.pauseShift} style={{
                        padding: '14px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                        borderRadius: '16px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '15px', fontWeight: '600'
                    }}>
                        <Pause size={20} />
                        {t.pause}
                    </button>
                ) : (
                    <button onClick={actions.resumeShift} style={{
                        padding: '14px 32px', background: 'rgba(0, 230, 118, 0.1)',
                        border: '1px solid var(--accent-color)', borderRadius: '16px', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '15px', fontWeight: '600', boxShadow: '0 0 20px rgba(0, 230, 118, 0.2)'
                    }}>
                        <Play size={20} fill="currentColor" />
                        {t.resume}
                    </button>
                )}
            </div>

            {/* End Shift Button */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button onClick={() => setIsEndModalOpen(true)} style={{
                    background: 'none', border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '12px',
                    fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}>
                    <Flag size={14} />
                    {t.endShift}
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{
                    background: 'rgba(0,0,0,0.25)', borderRadius: '16px', padding: '16px', textAlign: 'center',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {t.currentHr}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: earningsPerHour > 20 ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                        ${earningsPerHour.toFixed(2)}
                    </div>
                </div>
                <div style={{
                    background: 'rgba(0,0,0,0.25)', borderRadius: '16px', padding: '16px', textAlign: 'center',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {t.requiredHr}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: requiredRate > earningsPerHour ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
                        ${requiredRate.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Pulse Animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
}
