import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Play, Calendar, Clock, Target, Fuel, Gauge, TrendingUp, ChevronRight, History, Zap } from 'lucide-react';

export default function StartShiftModal({ onViewHistory }) {
    const { session, config, actions, t, metrics, updateWeeklyGoal } = useFinance();
    const { updateConfig, startShift, resumeShift } = actions;

    // DateTime helpers
    const toLocalISO = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const [formData, setFormData] = useState({
        meta: '', odometer: '', startTime: toLocalISO(new Date()), endTime: '', gasPrice: ''
    });
    const [showWeeklyGoalEdit, setShowWeeklyGoalEdit] = useState(false);
    const [step, setStep] = useState(1); // Multi-step form

    useEffect(() => {
        setFormData(prev => ({ ...prev, gasPrice: config.gasPrice }));
    }, [config.gasPrice]);

    const canResume = session.status === 'idle' && session.startTime;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.meta && formData.odometer && formData.endTime && formData.startTime) {
            const startDate = new Date(formData.startTime);
            const [endHours, endMinutes] = formData.endTime.split(':');
            const endDate = new Date(startDate);
            endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
            if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
            if (formData.gasPrice) updateConfig({ gasPrice: parseFloat(formData.gasPrice) });
            startShift(formData.meta, formData.odometer, endDate, startDate);
        }
    };

    const weeklyProgress = Math.min(100, (metrics.weeklyEarnings / metrics.weeklyGoal) * 100);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(180deg, rgba(10, 15, 28, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            {/* Background orbs */}
            <div style={{
                position: 'absolute', top: '-100px', right: '-100px',
                width: '300px', height: '300px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 215, 117, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '-100px', left: '-100px',
                width: '250px', height: '250px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div style={{
                width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto',
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)',
                padding: '32px', position: 'relative'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #00D775 0%, #00B861 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(0, 215, 117, 0.3)'
                    }}>
                        <Zap size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', margin: 0 }}>Iniciar Turno</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px' }}>
                        Define tus objetivos de hoy
                    </p>

                    {/* History Button */}
                    <button onClick={onViewHistory} style={{
                        position: 'absolute', top: '24px', right: '24px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', padding: '10px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)'
                    }}>
                        <History size={18} />
                        <span style={{ fontSize: '12px' }}>Historial</span>
                    </button>
                </div>

                {/* Weekly Progress Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 215, 117, 0.1) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    borderRadius: '20px', padding: '20px', marginBottom: '24px',
                    border: '1px solid rgba(0, 215, 117, 0.2)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '4px' }}>
                                Progreso Semanal
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: '#00D775' }}>
                                ${metrics.weeklyEarnings.toFixed(0)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '4px' }}>
                                Meta
                            </div>
                            {showWeeklyGoalEdit ? (
                                <input
                                    type="number" autoFocus defaultValue={metrics.weeklyGoal}
                                    onBlur={(e) => { updateWeeklyGoal(e.target.value); setShowWeeklyGoalEdit(false); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { updateWeeklyGoal(e.currentTarget.value); setShowWeeklyGoalEdit(false); } }}
                                    style={{ width: '80px', padding: '8px', fontSize: '18px', textAlign: 'right', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' }}
                                />
                            ) : (
                                <div onClick={() => setShowWeeklyGoalEdit(true)} style={{ fontSize: '24px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
                                    ${metrics.weeklyGoal}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${weeklyProgress}%`, height: '100%',
                            background: 'linear-gradient(90deg, #00D775 0%, #00FF88 100%)',
                            borderRadius: '4px', transition: 'width 0.5s ease',
                            boxShadow: '0 0 20px rgba(0, 215, 117, 0.5)'
                        }} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', textAlign: 'center' }}>
                        {weeklyProgress.toFixed(0)}% completado
                    </div>
                </div>

                {/* Resume Button */}
                {canResume && (
                    <button onClick={resumeShift} style={{
                        width: '100%', padding: '18px', marginBottom: '20px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(30, 41, 59, 0.8) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px',
                        color: '#818CF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        fontSize: '16px', fontWeight: '600'
                    }}>
                        <Play size={20} fill="#818CF8" />
                        Reanudar Turno Anterior
                    </button>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {/* Daily Goal */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <Target size={16} color="#00D775" /> Meta Diaria ($)
                            </label>
                            <input
                                type="number" placeholder="250"
                                value={formData.meta}
                                onChange={e => setFormData(prev => ({ ...prev, meta: e.target.value }))}
                                required autoFocus={!canResume}
                                style={{
                                    width: '100%', padding: '16px', fontSize: '16px',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', color: 'white', outline: 'none'
                                }}
                            />
                        </div>

                        {/* Odometer */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <Gauge size={16} color="#F59E0B" /> Odómetro Inicial
                            </label>
                            <input
                                type="number" placeholder="15430"
                                value={formData.odometer}
                                onChange={e => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
                                required
                                style={{
                                    width: '100%', padding: '16px', fontSize: '16px',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', color: 'white', outline: 'none'
                                }}
                            />
                        </div>

                        {/* Gas Price */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                <Fuel size={16} color="#EF4444" /> Precio Gas ($/gal)
                            </label>
                            <input
                                type="number" step="0.01" placeholder="3.10"
                                value={formData.gasPrice}
                                onChange={e => setFormData(prev => ({ ...prev, gasPrice: e.target.value }))}
                                required
                                style={{
                                    width: '100%', padding: '16px', fontSize: '16px',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', color: 'white', outline: 'none'
                                }}
                            />
                        </div>

                        {/* Time Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                                    <Calendar size={14} /> Inicio
                                </label>
                                <input
                                    type="datetime-local" value={formData.startTime}
                                    onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                    required
                                    style={{
                                        width: '100%', padding: '14px 12px', fontSize: '14px',
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', color: 'white', outline: 'none'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                                    <Clock size={14} /> Meta Fin
                                </label>
                                <input
                                    type="time" value={formData.endTime}
                                    onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                    required
                                    style={{
                                        width: '100%', padding: '14px 12px', fontSize: '14px',
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', color: 'white', outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" style={{
                        width: '100%', marginTop: '24px', padding: '18px',
                        background: 'linear-gradient(135deg, #00D775 0%, #00B861 100%)',
                        border: 'none', borderRadius: '16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        fontSize: '18px', fontWeight: '700', color: 'white',
                        boxShadow: '0 8px 32px rgba(0, 215, 117, 0.3)'
                    }}>
                        <Play size={24} fill="white" />
                        Comenzar Turno
                    </button>
                </form>
            </div>
        </div>
    );
}
