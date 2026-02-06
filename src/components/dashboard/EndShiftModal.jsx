import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Check, Clock, TrendingUp, MapPin, DollarSign } from 'lucide-react';

export default function EndShiftModal({ isOpen, onClose }) {
    const { session, metrics, actions, t } = useFinance();

    if (!isOpen) return null;

    // Calculate duration for display
    const now = Date.now();
    const durationMs = (now - session.startTime) - session.totalPausedTime;

    const formatDuration = (ms) => {
        if (ms < 0) return "0h 0m";
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    const durationStr = formatDuration(durationMs);
    const earningsPerHour = (durationMs > 0)
        ? (metrics.totalEarnings / (durationMs / 3600000))
        : 0;

    const handleConfirm = () => {
        actions.endShift();
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-card" style={{
                width: '90%',
                maxWidth: '360px',
                padding: '24px',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{t.endShift}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{t.totalEarnings}</p>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                        ${metrics.totalEarnings.toFixed(2)}
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <div className="flex-between" style={{ marginBottom: '4px' }}>
                            <Clock size={16} className="text-muted" />
                            <span className="text-muted" style={{ fontSize: '12px' }}>{t.timeOnline}</span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{durationStr}</div>
                    </div>

                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <div className="flex-between" style={{ marginBottom: '4px' }}>
                            <MapPin size={16} className="text-muted" />
                            <span className="text-muted" style={{ fontSize: '12px' }}>{t.miles}</span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{metrics.milesDriven.toFixed(1)}</div>
                    </div>

                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <div className="flex-between" style={{ marginBottom: '4px' }}>
                            <TrendingUp size={16} className="text-muted" />
                            <span className="text-muted" style={{ fontSize: '12px' }}>$/hr</span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>${earningsPerHour.toFixed(2)}</div>
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        marginTop: '8px',
                        background: 'var(--warning-color)', // Red/Orange for ending
                        color: 'white',
                        border: 'none'
                    }}
                >
                    {t.confirmEndShift}
                </button>
            </div>
        </div>
    );
}
