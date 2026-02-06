import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Trash2, Banknote, Car } from 'lucide-react';

export default function TripList() {
    const { trips, actions, t, config } = useFinance();

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
                {sortedTrips.map(trip => {
                    const isCash = trip.platform === 'cash';
                    const isLyft = trip.platform === 'lyft';
                    // Default Uber or unknown
                    // Default Uber or unknown
                    const color = isCash ? '#00D775' : (isLyft ? '#FF00BF' : 'var(--text-primary)');
                    const Icon = isCash ? Banknote : Car;

                    // Cost Calculation
                    const distance = trip.distance || 0;
                    const mpg = trip.mpg || config.vehicleMpg;
                    const gasPrice = trip.gasPrice || config.gasPrice;

                    const fuelCost = (distance / mpg) * gasPrice;
                    const wearCost = distance * config.maintenanceCostPerMile; // 0.30
                    const totalCost = fuelCost + wearCost;
                    const netProfit = trip.amount - totalCost;

                    return (
                        <div key={trip.id} className="flex-between" style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '32px', height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: color
                                }}>
                                    <Icon size={16} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                        ${trip.amount.toFixed(2)}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>
                                        {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {trip.odometer} {t.odo}
                                    </div>
                                    {distance > 0 && (
                                        <div style={{ fontSize: '10px', marginTop: '2px', color: 'var(--text-muted)' }}>
                                            <span style={{ color: '#ff4d4d' }}>Op: ${totalCost.toFixed(2)}</span> •
                                            <span style={{ color: '#00D775', marginLeft: '4px' }}>Net: ${netProfit.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => actions.deleteTrip(trip.id)}
                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
