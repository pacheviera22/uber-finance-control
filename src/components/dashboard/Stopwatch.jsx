import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Pause, Play, Edit2, Flag } from 'lucide-react';
import EndShiftModal from './EndShiftModal';

export default function Stopwatch() {
    const { session, actions, metrics, t } = useFinance();
    const [elapsed, setElapsed] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isEndModalOpen, setIsEndModalOpen] = useState(false);

    // Edit state
    const [editTimeStr, setEditTimeStr] = useState('');
    const [editOdometer, setEditOdometer] = useState('');
    const [editEndTimeStr, setEditEndTimeStr] = useState('');

    // Update timer
    useEffect(() => {
        let interval;
        if (session.status === 'active') {
            interval = setInterval(() => {
                // Calculate total active time: (Now - Start) - TotalPaused
                const now = Date.now();
                const activeTime = now - session.startTime - session.totalPausedTime;
                setElapsed(activeTime);
            }, 1000);
        } else if (session.status === 'paused') {
            if (session.lastPauseTime) {
                const activeTime = session.lastPauseTime - session.startTime - session.totalPausedTime;
                setElapsed(activeTime);
            }
        }
        return () => clearInterval(interval);
    }, [session]); // Depend on session to catch startTime changes immediately

    const formatTime = (ms) => {
        if (ms < 0) return "00:00:00"; // Prevent negative time
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
        // endTime is just a timestamp, need to format to HH:mm usually, but if it crosses days?
        // Let's use datetime-local to be safe and accurate for start time, 
        // but for END TIME, user usually just wants to change the TIME.
        // However, if we just show time, we might lose date info if it's overnight.
        // Let's stick to time input for simplicity as per StartShiftModal, 
        // OR better, use toLocalISO for consistency if we want full control.
        // Given backdating context, full datetime is safer.
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

    // Derived metric for this component
    const earningsPerHour = elapsed > 0
        ? (metrics.totalEarnings / (elapsed / 3600000))
        : 0;

    // Required Rate Calculation (RF-13)
    const timeLeftMs = session.endTime - Date.now();
    const timeLeftHours = Math.max(0, timeLeftMs / 3600000);
    const requiredRate = timeLeftHours > 0
        ? (metrics.metaRestante / timeLeftHours)
        : 0;

    return (
        <div className="card glass-card text-center" style={{ padding: '32px 16px', position: 'relative' }}>

            {/* End Shift Modal */}
            <EndShiftModal isOpen={isEndModalOpen} onClose={() => setIsEndModalOpen(false)} />

            {/* Header with Edit Button */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {t.timeOnline}
                </div>
                {!isEditing && (
                    <button onClick={handleEditClick} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0' }}>
                        <Edit2 size={12} />
                    </button>
                )}
            </div>

            {/* Timer Display or Edit Form */}
            {isEditing ? (
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'left', width: '100%', maxWidth: '200px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.startTime}</label>
                        <input
                            type="datetime-local"
                            value={editTimeStr}
                            onChange={(e) => setEditTimeStr(e.target.value)}
                            style={{ fontSize: '16px', padding: '4px 8px', width: '100%' }}
                        />
                    </div>
                    <div style={{ textAlign: 'left', width: '100%', maxWidth: '200px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.startOdometer}</label>
                        <input
                            type="number"
                            value={editOdometer}
                            onChange={(e) => setEditOdometer(e.target.value)}
                            style={{ fontSize: '16px', padding: '4px 8px', width: '100%' }}
                        />
                    </div>
                    <div style={{ textAlign: 'left', width: '100%', maxWidth: '200px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.targetEndTime}</label>
                        <input
                            type="datetime-local"
                            value={editEndTimeStr}
                            onChange={(e) => setEditEndTimeStr(e.target.value)}
                            style={{ fontSize: '16px', padding: '4px 8px', width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={handleSaveEdit} className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>
                            {t.update}
                        </button>
                        <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ padding: '6px 16px', fontSize: '12px' }}>
                            {t.cancel}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    fontSize: '48px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    marginBottom: '24px',
                    color: session.status === 'paused' ? 'var(--warning-color)' : 'white'
                }}>
                    {formatTime(elapsed)}
                </div>
            )
            }

            {/* Controls */}
            <div className="flex-between" style={{ justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                {session.status === 'active' ? (
                    <button onClick={actions.pauseShift} className="btn" style={{ background: '#333', color: 'white', maxWidth: '140px' }}>
                        <Pause size={18} style={{ marginRight: '8px' }} />
                        {t.pause}
                    </button>
                ) : (
                    <button onClick={actions.resumeShift} className="btn" style={{ background: 'var(--accent-color)', color: 'black', maxWidth: '140px' }}>
                        <Play size={18} fill="black" style={{ marginRight: '8px' }} />
                        {t.resume}
                    </button>
                )}
            </div>

            {/* End Shift Button */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => setIsEndModalOpen(true)}
                    style={{
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto',
                        cursor: 'pointer'
                    }}
                >
                    <Flag size={14} />
                    {t.endShift}
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: 'rgba(255,255,255,0.05)',
                padding: '12px',
                borderRadius: '8px'
            }}>
                <div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{t.currentHr}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>${earningsPerHour.toFixed(2)}</div>
                </div>
                <div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{t.requiredHr}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: requiredRate > earningsPerHour ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                        ${requiredRate.toFixed(2)}
                    </div>
                </div>
            </div>
        </div >
    );
}
