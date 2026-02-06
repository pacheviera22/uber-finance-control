import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import HomeMenu from './components/dashboard/HomeMenu';
import ShiftDashboard from './components/dashboard/ShiftDashboard';
import HistoryModal from './components/dashboard/HistoryModal'; // Importing directly to re-use if needed or just use ShiftDashboard's modal

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
        // Re-using ShiftDashboard but maybe we want to open the modal immediately?
        // For simplicity, let's just go to dashboard and open history manually or maybe pass a prop?
        // Let's keep it simple: Go to Dashboard for now as it contains the history.
        // OR better: Create a wrapper or pass a prop to ShiftDashboard to auto-open history.
        // But the user asked for "pages". Let's use the ShiftDashboard as the main "Work" view.
        // But for "History" specifically, maybe we can just show the HistoryModal over the Home?
        // Let's implement a simple placeholder for now or redirect to dashboard.
        // Let's try to render ShiftDashboard and maybe we can control it?
        // Actually, let's just make 'history' open the dashboard with history modal open?
        // For this iteration, let's just map everything to Dashboard if it's not implemented yet, or show a "Coming Soon" for settings.

        <ShiftDashboard onBack={() => setCurrentView('home')} />
      )}

      {currentView === 'stats' && (
        <ShiftDashboard onBack={() => setCurrentView('home')} />
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
