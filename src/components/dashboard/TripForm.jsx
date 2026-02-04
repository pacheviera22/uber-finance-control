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

    const [formData, setFormData] = useState({
        amount: '',
        odometer: '',
        timestamp: formatDatetime(Date.now())
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                amount: initialData.amount,
                odometer: initialData.odometer,
                timestamp: formatDatetime(initialData.timestamp)
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.amount && formData.odometer && formData.timestamp) {
            if (initialData) {
                actions.updateTrip(initialData.id, formData);
            } else {
                actions.addTrip(formData.amount, formData.odometer, formData.timestamp);
            }
            onClose();
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
                            {t.odometer} ({t.last}: {metrics.lastOdometer})
                        </label>
                        <input
                            type="number"
                            placeholder={metrics.lastOdometer}
                            value={formData.odometer}
                            onChange={e => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
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
            </div>
        </div>
    );
}
