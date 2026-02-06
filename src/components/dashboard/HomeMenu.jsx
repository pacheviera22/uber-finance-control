import React from 'react';
import { Power, BarChart2, History, Menu, Car } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

// Simple Stale Session Modal
const StaleSessionModal = ({ onConfirm, onCancel, durationHours }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.9)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
        <div className="glass-card" style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '12px', color: '#fff' }}>¿Sesión Olvidada?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Tienes un turno activo de <strong>{durationHours} horas</strong>.
                <br /><br />
                ¿Quieres finalizarlo ahora para empezar uno nuevo?
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
                <button
                    onClick={onConfirm}
                    className="btn-primary"
                    style={{ background: 'var(--warning-color)', color: 'white', border: 'none' }}
                >
                    Sí, Finalizar Turno
                </button>
                <button
                    onClick={onCancel}
                    style={{ background: 'none', border: '1px solid #444', color: '#888', padding: '12px', borderRadius: '12px' }}
                >
                    No, Continuar
                </button>
            </div>
        </div>
    </div>
);

export default function HomeMenu({ onNavigate }) {
    const { session, metrics, actions } = useFinance();
    const [showStaleModal, setShowStaleModal] = React.useState(false);
    const [staleDuration, setStaleDuration] = React.useState(0);

    // Helper for Session Status Text
    const getSessionStatus = () => {
        if (session.status === 'active') return 'En Progreso';
        if (session.status === 'paused') return 'Pausado';
        return 'Listo para Iniciar';
    };

    const getSessionTime = () => {
        if (session.startTime) {
            return new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return '--:--';
    };

    // Stale Check on Mount
    React.useEffect(() => {
        if (session.status === 'active' || session.status === 'paused') {
            const now = Date.now();
            const hours = (now - session.startTime) / 3600000;
            if (hours > 16) { // threshold: 16 hours
                setStaleDuration(hours.toFixed(1));
                setShowStaleModal(true);
            }
        }
    }, [session.status, session.startTime]);

    const handleEndStale = () => {
        // Force End
        actions.endShift();
        setShowStaleModal(false);
    };

    return (
        <div className="home-container">
            {showStaleModal && (
                <StaleSessionModal
                    durationHours={staleDuration}
                    onConfirm={handleEndStale}
                    onCancel={() => setShowStaleModal(false)}
                />
            )}

            {/* 1. Header Section */}
            <header className="home-header">
                <h1>Bienvenido, Usuario</h1>
                <p className="subtitle">Driver Pro Control</p>
            </header>

            {/* 2. Status Card (Prominent Center) */}
            <div className="status-section">
                <div
                    className="status-card glow-border"
                    onClick={() => onNavigate('dashboard')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="status-header">
                        <span className="status-label">TURNO ACTUAL</span>
                        {session.status === 'active' && <Car size={20} className="status-icon-active" />}
                    </div>

                    <div className="status-main">
                        <h2 className={session.status === 'active' ? 'text-active' : 'text-idle'}>
                            {getSessionStatus()}
                        </h2>
                        {session.status === 'active' && (
                            <div className="status-details">
                                <span className="time-display">{getSessionTime()}</span>
                                <span className="miles-display">{metrics.milesDriven.toFixed(1)} mi</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Action Grid (2x2 Menu) */}
            <div className="action-grid">
                {/* Button 1: Start/Action */}
                <button
                    className={`grid-btn btn-start ${session.status === 'active' ? 'active-glow' : ''}`}
                    onClick={() => onNavigate('dashboard')}
                >
                    <div className="btn-content">
                        <Power size={32} />
                        <span>{session.status === 'active' ? 'Gestionar' : 'Iniciar Turno'}</span>
                    </div>
                </button>

                {/* Button 2: Stats */}
                <button
                    className="grid-btn btn-stats"
                    onClick={() => onNavigate('stats')}
                >
                    <div className="btn-content">
                        <BarChart2 size={32} />
                        <span>Estadísticas</span>
                    </div>
                    {/* Decorative mini-chart bars could go here */}
                </button>

                {/* Button 3: History */}
                <button
                    className="grid-btn btn-history"
                    onClick={() => onNavigate('history')}
                >
                    <div className="btn-content">
                        <History size={32} />
                        <span>Historial</span>
                    </div>
                </button>

                {/* Button 4: Menu */}
                <button
                    className="grid-btn btn-menu"
                    onClick={() => onNavigate('settings')}
                >
                    <div className="btn-content">
                        <Menu size={32} />
                        <span>Menú</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
