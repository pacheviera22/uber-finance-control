import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import HomeMenu from './components/dashboard/HomeMenu';
import ShiftDashboard from './components/dashboard/ShiftDashboard';
import HistoryModal from './components/dashboard/HistoryModal';
import MetricsComparison from './components/dashboard/MetricsComparison';

// Simple Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: 'white', overflow: 'auto' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'dashboard', 'history', 'stats', 'settings'

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  return (
    <>
      {currentView === 'home' && (
        <HomeMenu onNavigate={handleNavigate} />
      )}

      {currentView === 'dashboard' && (
        <ShiftDashboard onBack={() => setCurrentView('home')} />
      )}

      {/* For now, map 'history' and 'stats' back to dashboard or placeholders until dedicated pages exist */}
      {currentView === 'history' && (
        <HistoryModal onClose={() => setCurrentView('home')} />
      )}

      {currentView === 'stats' && (
        <div className="container" style={{ paddingTop: '20px' }}>
          <button
            onClick={() => setCurrentView('home')}
            className="btn btn-secondary"
            style={{ marginBottom: '20px', alignSelf: 'flex-start' }}
          >
            ← Volver
          </button>
          <MetricsComparison />
        </div>
      )}

      {currentView === 'settings' && (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <button onClick={() => setCurrentView('home')} style={{ marginBottom: 20, background: 'none', border: 'none', color: 'white', fontSize: 20 }}>← Volver</button>
          <h1>Configuración</h1>
          <p>Próximamente...</p>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </FinanceProvider>
  );
}
