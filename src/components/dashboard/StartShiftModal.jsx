import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Play, Calendar, Clock } from 'lucide-react';

export default function StartShiftModal({ onViewHistory }) {


    // Helpers for datetime formatting
    const toLocalISO = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const [formData, setFormData] = useState({
        meta: '',
        odometer: '',
        startTime: toLocalISO(new Date()),
        endTime: '',
        gasPrice: '' // Will load from config
    });

    const { session, config, actions, t, metrics, updateWeeklyGoal } = useFinance();
    const { updateConfig, startShift, resumeShift } = actions;

    // Load initial gas price
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, gasPrice: config.gasPrice }));
    }, [config.gasPrice]);
    // Check if there is a "soft ended" session we can resume
    // It must be 'idle' AND have a startTime
    const canResume = session.status === 'idle' && session.startTime;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.meta && formData.odometer && formData.endTime && formData.startTime) {
            // Create date objects
            const startDate = new Date(formData.startTime);

            // End Time Logic
            const [endHours, endMinutes] = formData.endTime.split(':');
            const endDate = new Date(startDate);
            endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }

            // Update gas price config if changed
            if (formData.gasPrice) {
                updateConfig({ gasPrice: parseFloat(formData.gasPrice) });
            }

            startShift(formData.meta, formData.odometer, endDate, startDate);
        }
    };

    const handleResume = () => {
        actions.resumeShift();
    };

    const [showWeeklyGoalEdit, setShowWeeklyGoalEdit] = useState(false);


    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div className="card glass-card" style={{
                width: '100%',
                maxWidth: '400px',
                maxHeight: '90vh', // Ensure it fits on screen
                overflowY: 'auto', // Scrollable if too tall
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '16px', position: 'relative' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>{t.startShift}</h1>
                    <p className="text-muted" style={{ fontSize: '12px' }}>{t.setTargets}</p>

                    {/* View History Button */}
                    <button
                        onClick={onViewHistory}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            fontSize: '10px'
                        }}
                    >
                        <Calendar size={20} />
                        <span style={{ marginTop: '4px' }}>History</span>
                    </button>
                </div>

                {/* Weekly Stats Section - MBUX Style */}
                <div style={{ background: 'rgba(0, 23, 61, 0.4)', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex-between" style={{ marginBottom: '4px' }}>
                        <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{t.weeklyAccumulated}</span>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            ${metrics.weeklyEarnings.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex-between">
                        <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{t.weeklyGoal}</span>
                        {showWeeklyGoalEdit ? (
                            <input
                                type="number"
                                autoFocus
                                defaultValue={metrics.weeklyGoal}
                                onBlur={(e) => {
                                    updateWeeklyGoal(e.target.value);
                                    setShowWeeklyGoalEdit(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateWeeklyGoal(e.currentTarget.value);
                                        setShowWeeklyGoalEdit(false);
                                    }
                                }}
                                style={{ width: '80px', padding: '4px', margin: 0, fontSize: '14px', textAlign: 'right' }}
                            />
                        ) : (
                            <span
                                onClick={() => setShowWeeklyGoalEdit(true)}
                                style={{ fontSize: '14px', color: 'var(--accent-color)', cursor: 'pointer', borderBottom: '1px dashed var(--accent-color)' }}
                            >
                                ${metrics.weeklyGoal}
                            </span>
                        )}
                    </div>
                    {/* Weekly Progress Bar */}
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '8px', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min(100, (metrics.weeklyEarnings / metrics.weeklyGoal) * 100)}%`,
                            height: '100%',
                            background: 'var(--accent-color)',
                            boxShadow: '0 0 10px var(--accent-glow)'
                        }} />
                    </div>
                </div>

                {canResume && (
                    <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
                        <button
                            onClick={handleResume}
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'var(--accent-color)',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Play size={18} />
                            {t.resumePrevious}
                        </button>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                            {t.resumeDescription}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t.dailyGoal}</label>
                        <input
                            type="number"
                            placeholder="e.g. 250"
                            value={formData.meta}
                            onChange={e => setFormData(prev => ({ ...prev, meta: e.target.value }))}
                            required
                            autoFocus={!canResume}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t.startOdometer}</label>
                        <input
                            type="number"
                            placeholder="e.g. 15430"
                            value={formData.odometer}
                            onChange={e => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Gas Price ($/gal)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 3.10"
                            value={formData.gasPrice}
                            onChange={e => setFormData(prev => ({ ...prev, gasPrice: e.target.value }))}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>{t.startTime}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="datetime-local"
                                    value={formData.startTime}
                                    onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                    required
                                    style={{ paddingLeft: '40px', fontSize: '14px' }}
                                />
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>{t.targetEndTime}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                    required
                                    style={{ paddingLeft: '40px', fontSize: '14px' }}
                                />
                                <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                        <span style={{ marginRight: '8px' }}>{t.startNewShift}</span>
                        <Play size={20} fill="black" />
                    </button>
                </form>
            </div>
        </div>
    );
}
