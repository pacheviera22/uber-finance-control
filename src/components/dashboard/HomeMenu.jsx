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
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0A0F1C 0%, #111827 50%, #0F172A 100%)',
            padding: '40px 24px',
            color: 'white',
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

            {/* Background Decoration */}
            <div style={{
                position: 'absolute', top: '-200px', right: '-200px',
                width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 215, 117, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '-150px', left: '-150px',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            {/* Header */}
            <header style={{ marginBottom: '32px', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                            {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
                            Bienvenido
                        </h1>
                        <p style={{
                            fontSize: '14px',
                            color: '#00D775',
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

            {/* Hero Status Card */}
            <div
                onClick={() => onNavigate('dashboard')}
                style={{
                    background: isActive
                        ? 'linear-gradient(135deg, rgba(0, 215, 117, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    borderRadius: '24px',
                    padding: '28px',
                    marginBottom: '24px',
                    border: isActive ? '1px solid rgba(0, 215, 117, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: isActive ? '0 0 40px rgba(0, 215, 117, 0.1)' : 'none'
                }}
            >
                {isActive && (
                    <div style={{
                        position: 'absolute', top: '16px', right: '16px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(0, 215, 117, 0.2)', padding: '6px 12px', borderRadius: '20px'
                    }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#00D775',
                            boxShadow: '0 0 8px #00D775',
                            animation: 'pulse 2s infinite'
                        }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#00D775' }}>EN LÍNEA</span>
                    </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.5 }}>
                        Turno Actual
                    </span>
                </div>

                <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 16px 0' }}>
                    {isActive ? 'En Progreso' : 'Listo para Iniciar'}
                </h2>

                {isActive && (
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div>
                            <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>Ganancia</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#00D775' }}>
                                ${metrics.totalEarnings.toFixed(0)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>Millas</div>
                            <div style={{ fontSize: '24px', fontWeight: '700' }}>
                                {metrics.milesDriven.toFixed(1)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>Neto</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: netEarnings > 0 ? '#00D775' : '#EF4444' }}>
                                ${netEarnings.toFixed(0)}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{
                    position: 'absolute', bottom: '20px', right: '20px',
                    opacity: 0.3
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
                            ? 'linear-gradient(135deg, #00D775 0%, #00B861 100%)'
                            : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px',
                        boxShadow: isActive
                            ? '0 8px 32px rgba(0, 215, 117, 0.3)'
                            : '0 8px 32px rgba(245, 158, 11, 0.3)'
                    }}
                >
                    <div style={{
                        position: 'absolute', top: '-20px', right: '-20px',
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)'
                    }} />
                    <Power size={32} color="white" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                        {isActive ? 'Gestionar' : 'Iniciar'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                        {isActive ? 'Ver dashboard' : 'Nuevo turno'}
                    </div>
                </button>

                {/* Statistics */}
                <button
                    onClick={() => onNavigate('stats')}
                    style={{
                        background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.2) 0%, rgba(30, 41, 59, 0.8) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '20px',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px'
                    }}
                >
                    <BarChart2 size={32} color="#818CF8" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                        Estadísticas
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                        Análisis detallado
                    </div>
                </button>

                {/* History */}
                <button
                    onClick={() => onNavigate('history')}
                    style={{
                        background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
                        border: '1px solid rgba(236, 72, 153, 0.2)',
                        borderRadius: '20px',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px'
                    }}
                >
                    <History size={32} color="#F472B6" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                        Historial
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                        Turnos anteriores
                    </div>
                </button>

                {/* Settings */}
                <button
                    onClick={() => onNavigate('settings')}
                    style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        padding: '24px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '140px'
                    }}
                >
                    <Settings size={32} color="rgba(255,255,255,0.6)" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                        Ajustes
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                        Configuración
                    </div>
                </button>
            </div>

            {/* Footer Branding */}
            <div style={{
                marginTop: '40px',
                textAlign: 'center',
                opacity: 0.3,
                fontSize: '12px'
            }}>
                <Zap size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Driver Pro Control v2.0
            </div>

            {/* Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                button:hover {
                    transform: translateY(-2px);
                    transition: transform 0.2s;
                }
                button:active {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
}
