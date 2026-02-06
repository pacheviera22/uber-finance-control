import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import Header from '../layout/Header';
import StartShiftModal from './StartShiftModal';
import Stopwatch from './Stopwatch';
import MetricCard from './MetricCard';
import TripList from './TripList';
import TripForm from './TripForm';
import HistoryModal from './HistoryModal';
import MetricsComparison from './MetricsComparison';
import VoiceControl from './VoiceControl';
import { Plus, History, ArrowLeft } from 'lucide-react';

export default function ShiftDashboard({ onBack }) {
    const { session, metrics, t } = useFinance();
    const [showAddTrip, setShowAddTrip] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Derived metrics for UI
    const earningsPerMile = metrics.milesDriven > 0
        ? (metrics.totalEarnings / metrics.milesDriven)
        : 0;

    return (
        <div className="container">
            {/* Back Button for Navigation */}
            <button
                onClick={onBack}
                style={{
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    zIndex: 200,
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                }}
            >
                <ArrowLeft size={20} />
            </button>

            {session.status === 'idle' && !showHistory && (
                <StartShiftModal onViewHistory={() => setShowHistory(true)} />
            )}

            <div className="dashboard-grid">
                {/* LEFT COLUMN: Controls & Key Metrics */}
                <div className="dashboard-left">
                    <Header />
                    <Stopwatch />

                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <MetricCard
                            label={t.dollarsPerMile}
                            value={`$${earningsPerMile.toFixed(2)}`}
                        />
                        <MetricCard
                            label={t.milesDriven}
                            value={metrics.milesDriven.toFixed(1)}
                            subtext={
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {(metrics.usingGPS || metrics.isGpsActive || metrics.gpsError) && (
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: metrics.gpsError ? '#FF4D4D' : (metrics.usingGPS ? '#00D775' : '#FFA500'),
                                            boxShadow: `0 0 5px ${metrics.gpsError ? '#FF4D4D' : (metrics.usingGPS ? '#00D775' : '#FFA500')}`
                                        }} />
                                    )}
                                    {metrics.gpsError
                                        ? `Err: ${metrics.gpsError}`
                                        : metrics.usingGPS
                                            ? 'GPS Tracking'
                                            : metrics.isGpsActive
                                                ? 'GPS Ready'
                                                : `${t.odo}: ${metrics.lastOdometer}`}
                                </span>
                            }
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN: Trip List (Timeline) */}
                <div className="dashboard-right">
                    <MetricsComparison />
                    <TripList />
                </div>
            </div>


            {/* History Button */}
            <button
                onClick={() => setShowHistory(true)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '24px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100,
                    cursor: 'pointer'
                }}
            >
                <History size={20} color="var(--text-primary)" />
            </button>

            {/* FAB: Add Trip */}
            {session.status !== 'idle' && (
                <button
                    onClick={() => setShowAddTrip(true)}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--accent-color)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px var(--accent-glow)',
                        zIndex: 100,
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={32} color="black" />
                </button>
            )}

            {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
            {showAddTrip && <TripForm onClose={() => setShowAddTrip(false)} />}
            {session.status !== 'idle' && <VoiceControl />}

        </div>
    );
}
