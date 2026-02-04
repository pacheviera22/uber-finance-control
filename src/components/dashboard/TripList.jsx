import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Trash2 } from 'lucide-react';

export default function TripList() {
    const { trips, actions, t } = useFinance();

    // Reverse sort to show newest first
    const sortedTrips = [...trips].sort((a, b) => b.timestamp - a.timestamp);

    if (sortedTrips.length === 0) {
        return (
            <div className="card text-center text-muted" style={{ padding: '32px' }}>
                {t.noTrips}
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                {t.recentActivity}
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {sortedTrips.map(trip => (
                    <div key={trip.id} className="flex-between" style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                ${trip.amount.toFixed(2)}
                            </div>
                            <div className="text-muted" style={{ fontSize: '12px' }}>
                                {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {trip.odometer} {t.odo}
                            </div>
                        </div>
                        <button
                            onClick={() => actions.deleteTrip(trip.id)}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
