import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Play, Calendar } from 'lucide-react';

export default function StartShiftModal() {
    const { actions, t } = useFinance();

    // Helpers for datetime formatting
    const toLocalISO = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const [formData, setFormData] = useState({
        meta: '',
        odometer: '',
        startTime: toLocalISO(new Date()),
        endTime: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.meta && formData.odometer && formData.endTime && formData.startTime) {
            // Create date objects
            const startDate = new Date(formData.startTime);

            // End Time Logic (handle crossing midnight if needed, though simple input assumes same day or user picks date if we switch input type)
            // Since endTime input is just TIME, we need to infer the date.
            // Strategy: Assume endTime is relative to startDate. If endTime < startTime (time-wise), assume next day.
            const [endHours, endMinutes] = formData.endTime.split(':');
            const endDate = new Date(startDate);
            endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            // If computed end date is before start date, add 1 day (overnight shift)
            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }

            actions.startShift(formData.meta, formData.odometer, endDate, startDate);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div className="card glass-card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{t.startShift}</h1>
                    <p className="text-muted">{t.setTargets}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t.dailyGoal}</label>
                        <input
                            type="number"
                            placeholder="e.g. 250"
                            value={formData.meta}
                            onChange={e => setFormData(prev => ({ ...prev, meta: e.target.value }))}
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t.startOdometer}</label>
                        <input
                            type="number"
                            placeholder="e.g. 15430"
                            value={formData.odometer}
                            onChange={e => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t.startTime}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="datetime-local"
                                    value={formData.startTime}
                                    onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                    required
                                    style={{ paddingLeft: '34px', fontSize: '14px' }}
                                />
                                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t.targetEndTime}</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                        <span style={{ marginRight: '8px' }}>{t.startDriving}</span>
                        <Play size={20} fill="black" />
                    </button>
                </form>
            </div>
        </div>
    );
}
