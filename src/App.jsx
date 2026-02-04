import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import Header from './components/layout/Header';
import StartShiftModal from './components/dashboard/StartShiftModal';
import Stopwatch from './components/dashboard/Stopwatch';
import MetricCard from './components/dashboard/MetricCard';
import TripList from './components/dashboard/TripList';
import TripForm from './components/dashboard/TripForm';
import HistoryModal from './components/dashboard/HistoryModal';
import { Plus, History } from 'lucide-react';

function Dashboard() {
  const { session, metrics, t } = useFinance();
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Derived metrics for UI
  const earningsPerMile = metrics.milesDriven > 0
    ? (metrics.totalEarnings / metrics.milesDriven)
    : 0;

  return (
    <div className="container">
      {session.status === 'idle' && <StartShiftModal />}

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
          subtext={`${t.odo}: ${metrics.lastOdometer}`}
        />
      </div>

      <TripList />

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
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <Dashboard />
    </FinanceProvider>
  );
}
