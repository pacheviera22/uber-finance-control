import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { TrendingUp, TrendingDown, BarChart2, Calendar, DollarSign, Activity, Settings } from 'lucide-react';

export default function MetricsComparison() {
    const { allTrips, metrics, session, t, config, actions: { updateConfig } } = useFinance();

    // State for Config/Filters
    const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [selectedMetric, setSelectedMetric] = useState('earnings'); // 'earnings' | 'net' | 'miles' | 'expenses'

    const [isEditingGas, setIsEditingGas] = useState(false);
    const [tempGasPrice, setTempGasPrice] = useState(config.gasPrice);

    // --- Helpers ---
    const getStartEndTimestamps = (mode, dateStr) => {
        const date = new Date(dateStr + 'T00:00:00'); // Local midnight

        let start, end;
        if (mode === 'daily') {
            start = date.getTime();
            end = start + 86400000; // +24h
        } else {
            // Weekly: Start from Monday of the selected week
            const day = date.getDay(); // 0 (Sun) - 6 (Sat)
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            const monday = new Date(date.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            start = monday.getTime();
            end = start + (7 * 86400000);
        }
        return { start, end };
    };

    // --- Data Processing ---
    const filteredData = useMemo(() => {
        const { start, end } = getStartEndTimestamps(viewMode, selectedDate);

        // Filter trips in range
        const timeframeTrips = allTrips.filter(t => t.timestamp >= start && t.timestamp < end);

        // Aggregate Defaults
        let totalEarnings = 0;
        let totalMiles = 0;
        let totalExpenses = 0;

        // Chart Data Struct
        const chartMap = {};

        // Initialize Chart Labels
        if (viewMode === 'daily') {
            for (let i = 0; i < 24; i++) chartMap[i] = 0;
        } else {
            // Weekly: 0 (Sun) to 6 (Sat) or 0 (Mon) to 6 (Sun). Let's use Date Index 0-6.
            // Simplified: Map Date String to Value
            for (let i = 0; i < 7; i++) {
                const d = new Date(start + i * 86400000);
                const k = d.toLocaleDateString(undefined, { weekday: 'short' });
                chartMap[k] = 0;
            }
        }

        // Process Trips
        timeframeTrips.forEach(trip => {
            // Calc Financials
            const earnings = trip.amount || 0;
            const dist = trip.distance || 0; // Assuming we have trip distance logic or using odometer diff if sequential
            // Fallback for distance if per-trip distance not stored explicitly, use estimated avg or 0
            // Note: Odometer calc is tricky per-trip if not strictly sequential. 
            // Using placeholder logic: avg 5 miles per trip or user input if available.
            const miles = dist > 0 ? dist : 5; // Fallback

            const cost = (miles / config.vehicleMpg * config.gasPrice) + (miles * config.maintenanceCostPerMile);
            const net = earnings - cost;

            totalEarnings += earnings;
            totalMiles += miles;
            totalExpenses += cost;

            // Chart Aggregation
            let key;
            const tripDate = new Date(trip.timestamp);
            if (viewMode === 'daily') {
                key = tripDate.getHours();
            } else {
                key = tripDate.toLocaleDateString(undefined, { weekday: 'short' });
            }

            // Add to chart based on selected metric
            let valToAdd = 0;
            if (selectedMetric === 'earnings') valToAdd = earnings;
            if (selectedMetric === 'net') valToAdd = net;
            if (selectedMetric === 'miles') valToAdd = miles;
            if (selectedMetric === 'expenses') valToAdd = cost;

            if (chartMap[key] !== undefined) chartMap[key] += valToAdd;
        });

        // Convert Chart Map to Array
        const chartData = Object.entries(chartMap).map(([label, value]) => ({ label, value }));

        return {
            totalEarnings,
            totalMiles,
            totalExpenses,
            totalNet: totalEarnings - totalExpenses,
            chartData,
            tripCount: timeframeTrips.length
        };
    }, [allTrips, viewMode, selectedDate, selectedMetric, config]);

    // Format Helpers
    const formatCurrency = (val) => `$${val.toFixed(0)}`;
    const formatNet = (val) => `$${val.toFixed(2)}`;

    return (
        <div className="card glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* 1. Header & Filters */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                {/* Top Row: Title + Toggle */}
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={16} color="var(--accent-color)" />
                        ANÁLISIS
                    </h3>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2px', display: 'flex' }}>
                        <button
                            onClick={() => setViewMode('daily')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                background: viewMode === 'daily' ? 'var(--accent-color)' : 'transparent',
                                color: viewMode === 'daily' ? '#fff' : 'var(--text-muted)'
                            }}
                        >
                            Día
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                background: viewMode === 'weekly' ? 'var(--accent-color)' : 'transparent',
                                color: viewMode === 'weekly' ? '#fff' : 'var(--text-muted)'
                            }}
                        >
                            Semana
                        </button>
                    </div>
                </div>

                {/* Second Row: Date Picker + Legend */}
                <div className="flex-between">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', fontFamily: 'inherit', padding: 0, margin: 0, width: 'auto'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border-color)' }}>
                {['earnings', 'net', 'expenses', 'miles'].map(metric => {
                    const isActive = selectedMetric === metric;
                    let val = 0;
                    let label = '';
                    let color = '';

                    if (metric === 'earnings') { val = filteredData.totalEarnings; label = 'Bruto'; color = '#fff'; }
                    if (metric === 'net') { val = filteredData.totalNet; label = 'Neto'; color = '#00D775'; }
                    if (metric === 'expenses') { val = filteredData.totalExpenses; label = 'Gastos'; color = '#ff4d4d'; }
                    if (metric === 'miles') { val = filteredData.totalMiles; label = 'Millas'; color = '#00d2ff'; }

                    return (
                        <button
                            key={metric}
                            onClick={() => setSelectedMetric(metric)}
                            style={{
                                background: isActive ? 'rgba(255,255,255,0.08)' : 'var(--bg-card)',
                                border: 'none', padding: '12px 4px', cursor: 'pointer', textAlign: 'center',
                                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: color }}>
                                {metric === 'miles' ? val.toFixed(1) : `$${val.toFixed(0)}`}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 3. Main Chart */}
            <div style={{ padding: '20px', minHeight: '250px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
                    {viewMode === 'daily' ? `Por Hora (${selectedMetric})` : `Por Día (${selectedMetric})`}
                </div>

                <div className="chart-container" style={{ height: '200px' }}>
                    {filteredData.chartData.length > 0 ? filteredData.chartData.map((d, i) => {
                        const maxVal = Math.max(...filteredData.chartData.map(o => o.value), 10);
                        const heightPct = (d.value / maxVal) * 100;

                        return (
                            <div key={i} className="bar-group">
                                <div className="bar-wrapper">
                                    {d.value > 0 && (
                                        <div style={{
                                            position: 'absolute', bottom: `${Math.max(heightPct, 5)}%`, marginBottom: '8px',
                                            fontSize: '9px', fontWeight: 'bold', color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.8)'
                                        }}>
                                            {selectedMetric === 'miles' ? d.value.toFixed(0) : `$${d.value.toFixed(0)}`}
                                        </div>
                                    )}
                                    <div className="bar-3d" style={{
                                        height: `${Math.max(heightPct, 2)}%`,
                                        background: selectedMetric === 'expenses' ? 'linear-gradient(to top, #800000, #ff4d4d)' :
                                            selectedMetric === 'net' ? 'linear-gradient(to top, #004d29, #00D775)' : undefined
                                    }}>
                                        <div className="bar-top" style={{ background: '#fff' }}></div>
                                    </div>
                                </div>
                                <span className="bar-label" style={{ fontSize: '9px' }}>{d.label}</span>
                            </div>
                        );
                    }) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', width: '100%', fontStyle: 'italic' }}>
                            Sin datos para este periodo
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Edit Config Quick Access */}
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configuración de Costos:</span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#ff4d4d' }}>Gas:</span>
                        {isEditingGas ? (
                            <input
                                type="number" value={tempGasPrice}
                                onChange={e => setTempGasPrice(e.target.value)}
                                onBlur={() => { updateConfig({ gasPrice: parseFloat(tempGasPrice) }); setIsEditingGas(false); }}
                                onKeyDown={e => { if (e.key === 'Enter') { updateConfig({ gasPrice: parseFloat(tempGasPrice) }); setIsEditingGas(false); } }}
                                style={{ width: '40px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '2px' }}
                                autoFocus
                            />
                        ) : (
                            <span onClick={() => { setIsEditingGas(true); setTempGasPrice(config.gasPrice); }} style={{ cursor: 'pointer', borderBottom: '1px dashed #666' }}>
                                ${config.gasPrice}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
