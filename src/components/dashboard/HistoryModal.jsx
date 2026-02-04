import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { X, Trash2, Edit2, Calendar, AlertTriangle } from 'lucide-react';
import TripForm from './TripForm';

export default function HistoryModal({ onClose }) {
    const { allTrips, actions, t } = useFinance();
    const [editingTrip, setEditingTrip] = useState(null);
    const [deleteConfirmationId, setDeleteConfirmationId] = useState(null);

    // Group trips by Date
    const groupedTrips = allTrips.reduce((acc, trip) => {
        const dateKey = new Date(trip.timestamp).toLocaleDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(trip);
        return acc;
    }, {});

    // Sort dates descending
    const sortedDates = Object.keys(groupedTrips).sort((a, b) => new Date(b) - new Date(a));

    const handleDelete = (id) => {
        actions.deleteTrip(id);
        setDeleteConfirmationId(null);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'var(--bg-primary)',
            zIndex: 900,
            display: 'flex', flexDirection: 'column',
            padding: '20px'
        }}>
            {/* Header */}
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px' }}>{t.history}</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                    <X size={28} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {sortedDates.length === 0 && (
                    <div className="text-center text-muted" style={{ marginTop: '40px' }}>
                        {t.noTrips}
                    </div>
                )}

                {sortedDates.map(date => (
                    <div key={date} style={{ marginBottom: '24px' }}>
                        <div style={{
                            fontSize: '14px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            borderBottom: '1px solid var(--border-color)',
                            paddingBottom: '4px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <Calendar size={14} />
                            {date}
                        </div>

                        {groupedTrips[date]
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .map(trip => (
                                <div key={trip.id} className="card" style={{ padding: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                            ${trip.amount.toFixed(2)}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '12px' }}>
                                            {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {trip.odometer} {t.odo}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <button
                                            onClick={() => setEditingTrip(trip)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmationId(trip.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                ))}
            </div>

            {editingTrip && (
                <TripForm
                    initialData={editingTrip}
                    onClose={() => setEditingTrip(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmationId && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="card glass-card" style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}>
                        <AlertTriangle size={48} color="var(--error-color)" style={{ marginBottom: '16px' }} />
                        <h3 style={{ marginBottom: '8px' }}>{t.delete}?</h3>
                        <p className="text-muted" style={{ marginBottom: '24px' }}>{t.confirmDelete}</p>

                        <div className="flex-between" style={{ gap: '16px' }}>
                            <button
                                onClick={() => setDeleteConfirmationId(null)}
                                className="btn btn-secondary"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmationId)}
                                className="btn"
                                style={{ background: 'var(--error-color)', color: 'white' }}
                            >
                                {t.delete}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
