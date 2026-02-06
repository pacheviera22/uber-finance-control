import React from 'react';
import { Play, History, BarChart2, Settings } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export default function HomeMenu({ onNavigate }) {
    const { session, metrics } = useFinance();

    // Helper for Session Status Text
    const getSessionStatus = () => {
        if (session.status === 'active') return 'En Curso';
        if (session.status === 'paused') return 'Pausado';
        return 'Iniciar Turno';
    };

    const getSessionTime = () => {
        if (session.startTime) {
            return new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return '--:--';
    };

    return (
        <div className="home-menu-container">
            <div className="home-header">
                <h1>Seguimiento Laboral</h1>
                <p className="subtitle">Bienvenido, Conductor</p>
            </div>

            <div className="menu-grid">
                {/* Card 1: Current Shift */}
                <div
                    className="menu-card shift-card"
                    onClick={() => onNavigate('dashboard')}
                >
                    <div className="card-content">
                        <div className="card-icon-wrapper shift-icon">
                            <Play size={40} className={session.status === 'active' ? 'icon-pulse' : ''} />
                        </div>
                        <div className="card-text">
                            <h2>Turno Actual</h2>
                            <span className={`status-badge ${session.status}`}>
                                {getSessionStatus()}
                            </span>
                            {session.status !== 'idle' && (
                                <p className="card-detail">Inicio: {getSessionTime()}</p>
                            )}
                        </div>
                    </div>
                    <div className="card-glow-effect shift-glow"></div>
                </div>

                {/* Card 2: History */}
                <div
                    className="menu-card history-card"
                    onClick={() => onNavigate('history')}
                >
                    <div className="card-content">
                        <div className="card-icon-wrapper history-icon">
                            <History size={40} />
                        </div>
                        <div className="card-text">
                            <h2>Historial</h2>
                            <p className="card-detail">Ver turnos pasados</p>
                        </div>
                    </div>
                    <div className="card-glow-effect history-glow"></div>
                </div>

                {/* Card 3: Statistics */}
                <div
                    className="menu-card stats-card"
                    onClick={() => onNavigate('stats')}
                >
                    <div className="card-content">
                        <div className="card-icon-wrapper stats-icon">
                            <BarChart2 size={40} />
                        </div>
                        <div className="card-text">
                            <h2>Estadísticas</h2>
                            <p className="card-detail">
                                {metrics.milesDriven > 0
                                    ? `${metrics.milesDriven.toFixed(1)} mi esta semana`
                                    : 'Analizar rendimiento'}
                            </p>
                        </div>
                    </div>
                    <div className="card-glow-effect stats-glow"></div>
                </div>

                {/* Card 4: Settings */}
                <div
                    className="menu-card settings-card"
                    onClick={() => onNavigate('settings')}
                >
                    <div className="card-content">
                        <div className="card-icon-wrapper settings-icon">
                            <Settings size={40} />
                        </div>
                        <div className="card-text">
                            <h2>Configuración</h2>
                            <p className="card-detail">Perfil y Preferencias</p>
                        </div>
                    </div>
                    <div className="card-glow-effect settings-glow"></div>
                </div>
            </div>
        </div>
    );
}
