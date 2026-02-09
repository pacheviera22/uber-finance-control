import React, { useState, useEffect } from 'react';
import { Power, BarChart2, History, Settings, Car, TrendingUp, Zap, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

// Stale Session Alert
const StaleSessionModal = ({ onConfirm, onCancel, durationHours }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.95)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        backdropFilter: 'blur(20px)'
    }}>
        <div style={{
            maxWidth: '360px', textAlign: 'center', padding: '32px',
            background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)',
            borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '12px', color: '#fff', fontSize: '24px' }}>¿Sesión Olvidada?</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px', lineHeight: 1.6 }}>
                Tienes un turno activo de <strong style={{ color: '#EF4444' }}>{durationHours} horas</strong>.
                <br /><br />
                ¿Quieres finalizarlo para empezar uno nuevo?
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
                <button onClick={onConfirm} style={{
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: 'white', border: 'none', padding: '16px', borderRadius: '16px',
                    fontWeight: '600', fontSize: '16px', cursor: 'pointer'
                }}>
                    Sí, Finalizar Turno
                </button>
                <button onClick={onCancel} style={{
                    background: 'none', border: '1px solid rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.6)', padding: '14px', borderRadius: '16px', cursor: 'pointer'
                }}>
                    No, Continuar
                </button>
            </div>
        </div>
    </div>
);

export default function HomeMenu({ onNavigate }) {
    const { session, metrics, actions, config } = useFinance();
    const [showStaleModal, setShowStaleModal] = useState(false);
    const [staleDuration, setStaleDuration] = useState(0);
    const [time, setTime] = useState(new Date());

    // Update clock
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Stale session check
    useEffect(() => {
        if (session.status === 'active' || session.status === 'paused') {
            const hours = (Date.now() - session.startTime) / 3600000;
            if (hours > 16) {
                setStaleDuration(hours.toFixed(1));
                setShowStaleModal(true);
            }
        }
    }, [session.status, session.startTime]);

    const isActive = session.status === 'active' || session.status === 'paused';

    // Calculate today's stats
    const gasPrice = config?.gasPrice || 3.30;
    const mpg = config?.vehicleMpg || 24;
    const gasCost = (metrics.milesDriven / mpg) * gasPrice;
    const maintCost = metrics.milesDriven * 0.35;
    const netEarnings = metrics.totalEarnings - gasCost - maintCost;

    return (
        <div className="home-container" style={{
            minHeight: '100vh',
            padding: 'var(--spacing-lg)',
            color: 'var(--text-primary)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {showStaleModal && (
                <StaleSessionModal
                    durationHours={staleDuration}
                    onConfirm={() => { actions.endShift(); setShowStaleModal(false); }}
                    onCancel={() => setShowStaleModal(false)}
                />
            )}

            {/* Background Decoration (Subtle Lime Glows) */}
            <div style={{
                position: 'absolute', top: '-20%', right: '-10%',
                width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 230, 118, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', left: '-10%',
                width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 230, 118, 0.05) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            {/* Header */}
            <header style={{ marginBottom: '32px', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
                            Bienvenido
                        </h1>
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--accent-color)',
                            fontWeight: '600',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            marginTop: '4px'
                        }}>
                            Driver Pro Control
                        </p>
                    </div>
                    <div style={{
                        fontSize: '28px', fontWeight: '300',
                        fontFamily: "'SF Mono', monospace",
                        color: 'rgba(255,255,255,0.3)'
                    }}>
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </header>

            {/* Hero Status Card (Cyber-Financial Style) */}
            <div
                onClick={() => onNavigate('dashboard')}
                className="card"
                style={{
                    background: isActive
                        ? 'linear-gradient(135deg, rgba(18, 31, 25, 0.9) 0%, rgba(0, 230, 118, 0.05) 100%)'
                        : 'var(--bg-card)',
                    border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? '0 0 30px rgba(0, 230, 118, 0.1)' : '0 10px 30px rgba(0,0,0,0.3)'
                }}
            >
                {isActive && (
                    <div style={{
                        position: 'absolute', top: '24px', right: '24px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(0, 230, 118, 0.15)', padding: '6px 12px', borderRadius: '20px',
                        border: '1px solid rgba(0, 230, 118, 0.3)'
                    }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'var(--accent-color)',
                            boxShadow: '0 0 8px var(--accent-color)',
                            animation: 'pulse 2s infinite'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-color)', letterSpacing: '1px' }}>EN LÍNEA</span>
                    </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)' }}>
                        Turno Actual
                    </span>
                </div>

                <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 24px 0' }}>
                    {isActive ? 'En Progreso' : 'Listo para Iniciar'}
                </h2>

                {isActive ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Ganancia</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-color)', textShadow: '0 0 20px rgba(0, 230, 118, 0.3)' }}>
                                ${metrics.totalEarnings.toFixed(0)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Millas</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {metrics.milesDriven.toFixed(1)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Neto Est.</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: netEarnings > 0 ? 'var(--accent-color)' : 'var(--accent-alert)' }}>
                                ${netEarnings.toFixed(0)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <Clock size={16} />
                        <span>Sin actividad reciente</span>
                    </div>
                )}

                <div style={{
                    position: 'absolute', bottom: '24px', right: '24px',
                    opacity: 0.5, color: isActive ? 'var(--accent-color)' : 'var(--text-muted)'
                }}>
                    <ChevronRight size={24} />
                </div>
            </div>

            {/* Action Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
            }}>
                {/* Start/Manage Button */}
                <button
                    onClick={() => onNavigate('dashboard')}
                    style={{
                        background: isActive
                            ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.2) 0%, rgba(0, 230, 118, 0.05) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 179, 0, 0.2) 0%, rgba(255, 179, 0, 0.05) 100%)',
                        border: isActive ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid rgba(255, 179, 0, 0.4)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px',
                        transition: 'transform 0.2s',
                    }}
                    className="grid-btn"
                >
                    <Power size={32} color={isActive ? "var(--accent-color)" : "var(--accent-secondary)"} style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {isActive ? 'Gestionar' : 'Iniciar'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {isActive ? 'Ver dashboard' : 'Nuevo turno'}
                    </div>
                </button>

                {/* Statistics */}
                <button
                    onClick={() => onNavigate('stats')}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px'
                    }}
                    className="grid-btn"
                >
                    <BarChart2 size={32} color="#4FC3F7" style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Estadísticas
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Análisis detallado
                    </div>
                </button>

                {/* History */}
                <button
                    onClick={() => onNavigate('history')}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px'
                    }}
                    className="grid-btn"
                >
                    <History size={32} color="#F06292" style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Historial
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Turnos anteriores
                    </div>
                </button>

                {/* Settings */}
                <button
                    onClick={() => onNavigate('settings')}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px'
                    }}
                    className="grid-btn"
                >
                    <Settings size={32} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Ajustes
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Configuración
                    </div>
                </button>
            </div>

            {/* Footer Branding */}
            <div style={{
                marginTop: '40px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                opacity: 0.5,
                fontSize: '12px'
            }}>
                <Zap size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Driver Pro Control v2.1
            </div>

            {/* Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                .grid-btn:hover {
                    transform: translateY(-2px);
                    background: rgba(255, 255, 255, 0.03) !important;
                }
                .grid-btn:active {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
}
