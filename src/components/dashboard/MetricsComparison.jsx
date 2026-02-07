import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { TrendingUp, TrendingDown, BarChart2, Calendar, DollarSign, Activity, Settings } from 'lucide-react';

export default function MetricsComparison() {
    const { allTrips, metrics, session, t, config, dailyRecords, actions: { updateConfig, updateDailyRecord } } = useFinance();

    // State for Config/Filters
    const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'

    // Helper for Local Date (YYYY-MM-DD)
    const getLocalDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(getLocalDate());
    const [selectedMetric, setSelectedMetric] = useState('earnings'); // 'earnings' | 'net' | 'miles' | 'expenses'

    const [isEditingGas, setIsEditingGas] = useState(false);

    // Derived Gas Price: Check Daily Record -> Fallback to Config
    // Safe check if dailyRecords is loaded
    const dailyPriceRecord = dailyRecords && dailyRecords[selectedDate];
    const effectiveGasPrice = dailyPriceRecord ? dailyPriceRecord.gasPrice : config.gasPrice;

    // Temp state for editing
    const [tempGasPrice, setTempGasPrice] = useState(effectiveGasPrice);

    // Sync temp price when selection changes (unless editing)
    React.useEffect(() => {
        if (!isEditingGas) {
            setTempGasPrice(effectiveGasPrice);
        }
    }, [effectiveGasPrice, isEditingGas]);

    // --- Helpers ---
    const getLocStr = (d) => {
        if (!d || isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };



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

        // Shared Time Vars
        const todayStr = getLocStr(new Date());
        const sessionDateStr = session.startTime ? getLocStr(new Date(session.startTime)) : null;

        // Matches Session Context
        // This covers Active sessions (Today) and Ended sessions (SessionDate)
        // We define it here so it's available for both Chart Range and Gap Fill logic
        const matchesSessionContext = viewMode === 'daily' && (selectedDate === todayStr || (session.startTime && selectedDate === sessionDateStr));

        // Chart Data Struct
        const chartMap = {};

        // Initialize Chart Labels
        let rangeStart = 0;
        let rangeEnd = 23;

        // Dynamic Range for Daily View
        if (viewMode === 'daily') {
            // matchesSessionContext is now available here

            // Start with limits that force expansion
            let minH = 24;
            let maxH = -1;

            // 1. Incorporate Session Times (if relevant to this date)
            if (matchesSessionContext && session.startTime) {
                const sH = new Date(session.startTime).getHours();
                minH = Math.min(minH, sH);

                if (session.endTime) {
                    const eH = new Date(session.endTime).getHours();
                    // Handle cross-midnight: if end hour < start hour, for THIS day we go to 23
                    // For the NEXT day we start at 0 to endHour.
                    // Complex. Simplified: If same day, use endHour. If cross, use 23.
                    // We check if endTime > start + 24h? No.
                    // Just check timestamp.
                    const startTs = new Date(session.startTime).getTime();
                    const endTs = new Date(session.endTime).getTime();
                    const isSameDay = new Date(startTs).getDate() === new Date(endTs).getDate();

                    if (isSameDay) {
                        maxH = Math.max(maxH, eH);
                    } else {
                        // If selectedDate is Start Date, go to 23
                        // If selectedDate is End Date, goes from 0 to eH (Handled by minH initialization? No)
                        if (selectedDate === sessionDateStr) maxH = 23;
                    }
                } else {
                    // Open ended session - maybe go to current hour?
                    maxH = Math.max(maxH, new Date().getHours());
                }
            }

            // 2. Incorporate Trips
            timeframeTrips.forEach(t => {
                const h = new Date(t.timestamp).getHours();
                minH = Math.min(minH, h);
                maxH = Math.max(maxH, h);
            });

            // 3. Fallback if no data
            if (minH > maxH) {
                // Default to 8am - 6pm if completely empty? Or 0-23?
                // User said "hours defined in shift". If no shift...
                minH = 8;
                maxH = 18;
            }

            rangeStart = minH;
            rangeEnd = maxH;

            for (let i = rangeStart; i <= rangeEnd; i++) chartMap[i] = 0;
        } else {
            // Weekly
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
            const dist = trip.distance || 0;
            const miles = dist; // No Fallback, strict user input

            // Look up gas price for THIS trip's day
            const tripDateKey = new Date(trip.timestamp).toISOString().split('T')[0];
            const priceForDay = dailyRecords && dailyRecords[tripDateKey]
                ? dailyRecords[tripDateKey].gasPrice
                : config.gasPrice;

            const cost = (miles / config.vehicleMpg * priceForDay) + (miles * config.maintenanceCostPerMile);
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

        // [FIX] Gap Fill: Include Session Miles (Deadhead/Unassigned) if viewing "Today"
        // If the user's session is active or recently ended TODAY, metrics.milesDriven is the Authority.
        // We compare metrics.milesDriven vs the sum of trip miles.

        let finalTotalMiles = totalMiles;
        let finalTotalExpenses = totalExpenses;

        // Date Match Logic




        // Trigger if viewing Today OR Session Date
        // Reuse matchesSessionContext from above

        if (matchesSessionContext && metrics.milesDriven > totalMiles) {
            const unassignedMiles = metrics.milesDriven - totalMiles;
            finalTotalMiles += unassignedMiles;

            // Calculate cost for unassigned miles
            const dailyPrice = dailyRecords && dailyRecords[selectedDate]
                ? dailyRecords[selectedDate].gasPrice
                : config.gasPrice;

            const unassignedCost = (unassignedMiles / config.vehicleMpg * dailyPrice) +
                (unassignedMiles * config.maintenanceCostPerMile);

            finalTotalExpenses += unassignedCost;
        }

        return {
            totalEarnings,
            totalMiles: finalTotalMiles,
            totalExpenses: finalTotalExpenses,
            totalNet: totalEarnings - finalTotalExpenses,
            chartData,
            tripCount: timeframeTrips.length
        };
    }, [allTrips, viewMode, selectedDate, selectedMetric, config, dailyRecords, metrics.milesDriven, session.startTime]);

    // Format Helpers
    const formatCurrency = (val) => `$${val.toFixed(0)}`;
    const formatNet = (val) => `$${val.toFixed(2)}`;

    // Handle Gas Price Update
    const handleGasUpdate = () => {
        const val = parseFloat(tempGasPrice);
        if (!isNaN(val)) {
            // Save to Daily Record
            updateDailyRecord(selectedDate, { gasPrice: val });
        }
        setIsEditingGas(false);
    }

    return (
        <div className="card glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* 1. Header & Filters */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                {/* Top Row: Title + Toggle */}
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={16} color="var(--accent-color)" />
                        ANÁLISIS (v2.0)
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

            {/* 4. Edit Config Quick Access (DAILY OVERRIDE) */}
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Precio Gas ({dailyPriceRecord ? 'Diario' : 'Global'}):
                </span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#ff4d4d' }}>$</span>
                        {isEditingGas ? (
                            <input
                                type="number"
                                value={tempGasPrice ?? effectiveGasPrice ?? 0}
                                onChange={e => setTempGasPrice(e.target.value)}
                                onBlur={handleGasUpdate}
                                onKeyDown={e => { if (e.key === 'Enter') handleGasUpdate(); }}
                                style={{ width: '45px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '2px' }}
                                autoFocus
                            />
                        ) : (
                            <div
                                onClick={() => { setIsEditingGas(true); setTempGasPrice(effectiveGasPrice); }}
                                style={{
                                    cursor: 'pointer', borderBottom: '1px dashed #666', fontWeight: 'bold',
                                    color: dailyPriceRecord ? 'var(--accent-color)' : '#fff'
                                }}
                            >
                                {effectiveGasPrice?.toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
