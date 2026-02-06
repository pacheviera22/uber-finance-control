import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Check, X, Calendar } from 'lucide-react';

export default function TripForm({ onClose, initialData = null }) {
    const { actions, metrics, t } = useFinance();

    // Format Date for Input (YYYY-MM-DDTHH:mm)
    const formatDatetime = (timestamp) => {
        const d = new Date(timestamp);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Helper to calculate distance based on last odometer
    // Default last odometer is metrics.lastOdometer
    // If we are editing, we need to be careful not to double count

    const [formData, setFormData] = useState({
        amount: '',
        odometer: '',
        timestamp: formatDatetime(Date.now()),
        platform: 'uber'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                amount: initialData.amount,
                odometer: initialData.odometer,
                timestamp: formatDatetime(initialData.timestamp),
                platform: initialData.platform || 'uber'
            });
        }
    }, [initialData]);

    // Smart Sync: Distance <-> Odometer
    const handleDistanceChange = (val) => {
        const dist = parseFloat(val);
        setFormData(prev => ({ ...prev, distance: val }));

        if (!isNaN(dist) && metrics.lastOdometer) {
            // New Odometer = Last Known + Distance
            // NOTE: This assumes adding a NEW trip. If editing, logic is trickier, so maybe strictly manual or differencing.
            // For now, let's just do it for new trips to be helpful.
            if (!initialData) {
                const newOdo = (metrics.lastOdometer + dist).toFixed(1);
                setFormData(prev => ({ ...prev, distance: val, odometer: newOdo }));
            }
        }
    };

    const handleOdometerChange = (val) => {
        const odo = parseFloat(val);
        setFormData(prev => ({ ...prev, odometer: val }));

        if (!isNaN(odo) && metrics.lastOdometer) {
            if (!initialData) {
                const dist = (odo - metrics.lastOdometer).toFixed(1);
                // Only update distance if it makes sense (positive)
                if (dist >= 0) {
                    setFormData(prev => ({ ...prev, odometer: val, distance: dist }));
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.amount && formData.odometer && formData.timestamp) {
                if (initialData) {
                    await actions.updateTrip(initialData.id, formData);
                } else {
                    await actions.addTrip({
                        amount: formData.amount,
                        odometer: formData.odometer,
                        timestamp: formData.timestamp,
                        platform: formData.platform
                    });
                }
                onClose();
            }
        } catch (error) {
            console.error("Failed to save trip:", error);
            // Alert already handled in context
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div className="card glass-card" style={{ width: '100%', maxWidth: '360px' }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '20px' }}>
                        {initialData ? t.edit : t.addTrip}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Platform Selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
                        {['uber', 'lyft', 'cash'].map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, platform: p }))}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: `1px solid ${formData.platform === p ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`,
                                    background: formData.platform === p ? 'rgba(255, 102, 0, 0.2)' : 'rgba(0,0,0,0.3)',
                                    color: formData.platform === p ? 'var(--accent-color)' : 'var(--text-muted)',
                                    fontWeight: 'bold',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {p === 'cash' ? t.cash : p}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>{t.earnings}</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            required
                            autoFocus={!initialData}
                            style={{ fontSize: '24px', textAlign: 'center' }}
                        />
                    </div>



                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                            Distance (miles)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={formData.distance}
                            onChange={e => handleDistanceChange(e.target.value)}
                            required
                            style={{ fontSize: '24px', textAlign: 'center' }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                            {t.odometer} ({t.last}: {metrics.lastOdometer})
                        </label>
                        <input
                            type="number"
                            placeholder={metrics.lastOdometer}
                            value={formData.odometer}
                            onChange={e => handleOdometerChange(e.target.value)}
                            required
                            style={{ fontSize: '24px', textAlign: 'center' }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                            {t.date} & {t.time}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="datetime-local"
                                value={formData.timestamp}
                                onChange={e => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                                required
                                style={{ paddingLeft: '40px' }}
                            />
                            <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                        <Check size={20} style={{ marginRight: '8px' }} />
                        {initialData ? t.update : t.saveTrip}
                    </button>
                </form>
            </div >
        </div >
    );
}
