import React from 'react';
import { Power, BarChart2, History, Menu, Car } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export default function HomeMenu({ onNavigate }) {
    const { session, metrics } = useFinance();

    // Helper for Session Status Text
    const getSessionStatus = () => {
        if (session.status === 'active') return 'En Progreso';
        if (session.status === 'paused') return 'Pausado';
        return 'Listo para Iniciar';
    };

    const getSessionTime = () => {
        if (session.startTime) {
            // Simple elapsed time calculation could go here, for now just show start time
            return new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return '--:--';
    };

    return (
        <div className="home-container">
            {/* 1. Header Section */}
            <header className="home-header">
                <h1>Bienvenido, Usuario</h1>
                <p className="subtitle">Driver Pro Control</p>
            </header>

            {/* 2. Status Card (Prominent Center) */}
            <div className="status-section">
                <div className="status-card glow-border">
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
