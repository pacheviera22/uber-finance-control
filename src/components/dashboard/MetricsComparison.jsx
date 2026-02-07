import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { BarChart2, Calendar, Target, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function MetricsComparison() {
    const { allTrips, metrics, session, t, config, dailyRecords, actions: { updateConfig, updateDailyRecord } } = useFinance();

    // Date Selector State - BudgetBakers Style
    const [selectorMode, setSelectorMode] = useState(1); // 0: periods, 1: presets, 2: custom range
    const [periodType, setPeriodType] = useState('7d'); // For mode 0: 7d, 30d, 12w, 6m, 1y
    const [presetType, setPresetType] = useState('day'); // For mode 1: day, week, month, year
    const [presetOffset, setPresetOffset] = useState(0); // 0 = today/this week, -1 = yesterday/last week, etc
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);

    const [selectedMetric, setSelectedMetric] = useState('earnings');
    const [isEditingGas, setIsEditingGas] = useState(false);

    const getLocStr = (d) => {
        if (!d || isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Calculate date range based on selector mode
    const getDateRange = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let start, end;

        if (selectorMode === 0) {
            // Period mode: last X days/weeks/months
            end = new Date(now.getTime() + 86400000);
            switch (periodType) {
                case '7d': start = new Date(now.getTime() - 6 * 86400000); break;
                case '30d': start = new Date(now.getTime() - 29 * 86400000); break;
                case '12w': start = new Date(now.getTime() - 83 * 86400000); break;
                case '6m': start = new Date(now); start.setMonth(start.getMonth() - 6); break;
                case '1y': start = new Date(now); start.setFullYear(start.getFullYear() - 1); break;
                default: start = new Date(now.getTime() - 6 * 86400000);
            }
        } else if (selectorMode === 1) {
            // Preset mode with offset
            const baseDate = new Date(now);

            if (presetType === 'day') {
                baseDate.setDate(baseDate.getDate() + presetOffset);
                start = new Date(baseDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(start.getTime() + 86400000);
            } else if (presetType === 'week') {
                const dayOfWeek = baseDate.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                baseDate.setDate(baseDate.getDate() + diff + (presetOffset * 7));
                start = new Date(baseDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(start.getTime() + 7 * 86400000);
            } else if (presetType === 'month') {
                baseDate.setMonth(baseDate.getMonth() + presetOffset);
                start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
            } else if (presetType === 'year') {
                baseDate.setFullYear(baseDate.getFullYear() + presetOffset);
                start = new Date(baseDate.getFullYear(), 0, 1);
                end = new Date(baseDate.getFullYear() + 1, 0, 1);
            }
        } else {
            // Custom range mode
            start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getTime() - 6 * 86400000);
            end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date(now.getTime() + 86400000);
        }

        return { start: start.getTime(), end: end.getTime() };
    };

    // Get display label for current selection
    const getDateLabel = () => {
        const now = new Date();
        if (selectorMode === 0) {
            const labels = { '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', '12w': 'Últimas 12 semanas', '6m': 'Últimos 6 meses', '1y': 'Último año' };
            return labels[periodType] || '';
        } else if (selectorMode === 1) {
            const baseDate = new Date(now);
            if (presetType === 'day') {
                baseDate.setDate(baseDate.getDate() + presetOffset);
                if (presetOffset === 0) return 'Hoy';
                if (presetOffset === -1) return 'Ayer';
                return baseDate.toLocaleDateString('es', { day: 'numeric', month: 'short' });
            } else if (presetType === 'week') {
                if (presetOffset === 0) return 'Esta Semana';
                if (presetOffset === -1) return 'Semana Pasada';
                const dayOfWeek = baseDate.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                baseDate.setDate(baseDate.getDate() + diff + (presetOffset * 7));
                const endDate = new Date(baseDate.getTime() + 6 * 86400000);
                return `${baseDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;
            } else if (presetType === 'month') {
                baseDate.setMonth(baseDate.getMonth() + presetOffset);
                if (presetOffset === 0) return 'Este Mes';
                return baseDate.toLocaleDateString('es', { month: 'long', year: 'numeric' });
            } else if (presetType === 'year') {
                baseDate.setFullYear(baseDate.getFullYear() + presetOffset);
                if (presetOffset === 0) return 'Este Año';
                return baseDate.getFullYear().toString();
            }
        } else {
            if (!customStart || !customEnd) return 'Seleccionar rango';
            return `${new Date(customStart).toLocaleDateString('es', { day: 'numeric', month: 'short' })} - ${new Date(customEnd).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;
        }
        return '';
    };

    // Get effective gas price for a specific date - looks backward for inherited price
    const getEffectiveGasPrice = (dateStr) => {
        // First check if there's a direct record for this date
        if (dailyRecords?.[dateStr]?.gasPrice) {
            return dailyRecords[dateStr].gasPrice;
        }

        // Look backward through previous days to find the most recent price
        const targetDate = new Date(dateStr + 'T00:00:00');
        const allDates = Object.keys(dailyRecords || {})
            .filter(d => dailyRecords[d]?.gasPrice)
            .sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

        for (const d of allDates) {
            const recordDate = new Date(d + 'T00:00:00');
            if (recordDate <= targetDate) {
                return dailyRecords[d].gasPrice;
            }
        }

        // No previous record found, use global config
        return config.gasPrice;
    };

    // Get average gas price for a date range (for multi-day analysis periods)
    const getAverageGasPriceForRange = (startTs, endTs) => {
        const startDate = new Date(startTs);
        const endDate = new Date(endTs);
        const days = Math.ceil((endTs - startTs) / 86400000);

        if (days <= 1) {
            return getEffectiveGasPrice(getLocStr(startDate));
        }

        // Collect all unique prices in the range
        const pricesInRange = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(startTs + i * 86400000);
            const dateStr = getLocStr(d);
            if (dailyRecords?.[dateStr]?.gasPrice) {
                pricesInRange.push(dailyRecords[dateStr].gasPrice);
            }
        }

        // If multiple prices registered in this period, average them
        if (pricesInRange.length > 1) {
            return pricesInRange.reduce((a, b) => a + b, 0) / pricesInRange.length;
        }

        // Otherwise use the effective price at the start of the range
        return getEffectiveGasPrice(getLocStr(startDate));
    };

    const currentPrice = useMemo(() => {
        const { start: s, end: e } = getDateRange();
        return getAverageGasPriceForRange(s, e);
    }, [dailyRecords, config.gasPrice, selectorMode, periodType, presetType, presetOffset, customStart, customEnd]);

    const effectiveGasPrice = currentPrice;
    const [tempGasPrice, setTempGasPrice] = useState(effectiveGasPrice);

    React.useEffect(() => {
        if (!isEditingGas) setTempGasPrice(effectiveGasPrice);
    }, [effectiveGasPrice, isEditingGas]);

    const filteredData = useMemo(() => {
        const { start, end } = getDateRange();

        const timeframeTrips = allTrips.filter(t => t.timestamp >= start && t.timestamp < end);

        let totalEarnings = 0, totalMiles = 0, totalExpenses = 0, productiveMiles = 0;
        const sessionDateStr = session.startTime ? getLocStr(new Date(session.startTime)) : null;
        const selectedDateStr = getLocStr(new Date(start));
        const matchesSessionContext = selectorMode === 1 && presetType === 'day' && session.startTime && selectedDateStr === sessionDateStr;

        const chartMap = {};

        // Determine chart granularity based on date range
        const rangeDays = (end - start) / 86400000;
        let chartMode = 'hour'; // hour, day, week, month

        if (rangeDays <= 1) {
            chartMode = 'hour';
            for (let i = 0; i <= 23; i++) chartMap[i] = 0;
        } else if (rangeDays <= 7) {
            chartMode = 'day';
            for (let i = 0; i < rangeDays; i++) {
                const d = new Date(start + i * 86400000);
                chartMap[d.toLocaleDateString('es', { weekday: 'short' })] = 0;
            }
        } else if (rangeDays <= 31) {
            chartMode = 'day';
            for (let i = 0; i < rangeDays; i++) {
                const d = new Date(start + i * 86400000);
                chartMap[d.getDate()] = 0;
            }
        } else {
            chartMode = 'week';
            const weeks = Math.ceil(rangeDays / 7);
            for (let i = 0; i < weeks; i++) chartMap[`S${i + 1}`] = 0;
        }

        timeframeTrips.forEach(trip => {
            const earnings = trip.amount || 0;
            const miles = trip.distance || 0;
            const tripDateKey = new Date(trip.timestamp).toISOString().split('T')[0];
            // Use inherited gas price for this specific day
            const priceForDay = getEffectiveGasPrice(tripDateKey);
            const cost = (miles / config.vehicleMpg * priceForDay) + (miles * config.maintenanceCostPerMile);
            const net = earnings - cost;
            totalEarnings += earnings;
            totalMiles += miles;
            productiveMiles += miles;
            totalExpenses += cost;

            let key;
            const tripDate = new Date(trip.timestamp);
            if (chartMode === 'hour') {
                key = tripDate.getHours();
            } else if (chartMode === 'day' && rangeDays <= 7) {
                key = tripDate.toLocaleDateString('es', { weekday: 'short' });
            } else if (chartMode === 'day') {
                key = tripDate.getDate();
            } else {
                const weekNum = Math.floor((trip.timestamp - start) / (7 * 86400000));
                key = `S${weekNum + 1}`;
            }

            let valToAdd = selectedMetric === 'earnings' ? earnings : selectedMetric === 'net' ? net : selectedMetric === 'miles' ? miles : cost;
            if (chartMap[key] !== undefined) chartMap[key] += valToAdd;
        });

        let finalTotalMiles = totalMiles, finalTotalExpenses = totalExpenses;
        if (matchesSessionContext && metrics.milesDriven > totalMiles) {
            const unassignedMiles = metrics.milesDriven - totalMiles;
            finalTotalMiles += unassignedMiles;
            // Use inherited gas price for the selected date
            const dailyPrice = getEffectiveGasPrice(selectedDateStr);
            finalTotalExpenses += (unassignedMiles / config.vehicleMpg * dailyPrice) + (unassignedMiles * config.maintenanceCostPerMile);
        }

        return {
            totalEarnings, totalMiles: finalTotalMiles, totalExpenses: finalTotalExpenses,
            totalNet: totalEarnings - finalTotalExpenses,
            chartData: Object.entries(chartMap).map(([label, value]) => ({ label, value })),
            tripCount: timeframeTrips.length,
            productiveMiles
        };
    }, [allTrips, selectorMode, periodType, presetType, presetOffset, customStart, customEnd, selectedMetric, config, dailyRecords, metrics.milesDriven, session.startTime]);

    const handleGasUpdate = () => {
        const val = parseFloat(tempGasPrice);
        if (!isNaN(val)) {
            // Save to the start date of the current selection
            const { start } = getDateRange();
            const targetDate = getLocStr(new Date(start));
            updateDailyRecord(targetDate, { gasPrice: val });
        }
        setIsEditingGas(false);
    };

    // Advanced Metrics Calculations
    const { start: activeStart, end: activeEnd } = getDateRange();

    // Determine if we are viewing "Today" or the active session
    const todayStr = getLocStr(new Date());
    const sessionDateStr = session.startTime ? getLocStr(new Date(session.startTime)) : null;
    const isViewingActiveSession = (selectorMode === 1 && presetType === 'day' && presetOffset === 0) ||
        (selectorMode === 1 && presetType === 'day' && session.startTime && getLocStr(new Date(activeStart)) === sessionDateStr);

    let workedHours = 0;

    if (isViewingActiveSession && session.startTime) {
        // Live tracking for active session
        workedHours = (Date.now() - session.startTime - (session.totalPausedTime || 0)) / 3600000;
    } else {
        // Historical / Closed periods: Estimate based on trip timestamps
        if (filteredData.tripCount > 0) {
            // Sort trips to find first and last
            const sortedTrips = [...allTrips].filter(t => t.timestamp >= activeStart && t.timestamp < activeEnd).sort((a, b) => a.timestamp - b.timestamp);
            if (sortedTrips.length > 0) {
                const firstTrip = sortedTrips[0].timestamp;
                const lastTrip = sortedTrips[sortedTrips.length - 1].timestamp;
                // Add 1 hour buffer for "prep/cleanup" or just raw diff. Using raw diff + average trip time buffer
                // Ensure at least 1 hour if only 1 trip
                workedHours = Math.max((lastTrip - firstTrip) / 3600000, 1);
            }
        }
    }

    // Ensure no division by zero
    workedHours = Math.max(workedHours, 0.1);

    const netPerHour = workedHours > 0 ? filteredData.totalNet / workedHours : 0;
    const tripsPerHour = workedHours > 0 ? filteredData.tripCount / workedHours : 0;

    const deadheadMiles = filteredData.totalMiles - filteredData.productiveMiles;
    const deadheadPct = filteredData.totalMiles > 0 ? (deadheadMiles / filteredData.totalMiles) * 100 : 0;

    // Projections only make sense for ACTIVE session
    let projectedTotal = 0;
    let projectedNet = 0;
    let showProjection = false;

    if (isViewingActiveSession && session.startTime && !session.endTime) {
        // Active session projection
        const timeToEndMs = session.endTime ? session.endTime - Date.now() : 0;
        const targetHours = 8; // Assumed target shift length if not set? Or use goal
        // Simple projection: Current Rate * Remaining Time (if set) OR Current Rate * Standard 8h Shift

        // Let's project based on "Pace to Goal" if available, or simple extrapolation
        const elapsed = (Date.now() - session.startTime) / 3600000;
        if (elapsed > 0) {
            const pace = filteredData.totalEarnings / elapsed;
            // Project to 8 hours or goal
            projectedTotal = pace * 8; // Project to 8 hour shift
            showProjection = true;
        }
    } else {
        // Past dates: Projection is just the Actual Total
        projectedTotal = filteredData.totalEarnings;
        showProjection = false; // Don't show "Projection", show "Total"
    }

    const dailyGoal = metrics.meta || 250;
    const goalProgress = Math.min((filteredData.totalEarnings / dailyGoal) * 100, 100);
    const onTrack = isViewingActiveSession ? (projectedTotal >= dailyGoal) : (filteredData.totalEarnings >= dailyGoal);

    const metricColors = {
        earnings: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', glow: 'rgba(102, 126, 234, 0.4)' },
        net: { gradient: 'linear-gradient(135deg, #00D775 0%, #00B861 100%)', glow: 'rgba(0, 215, 117, 0.4)' },
        expenses: { gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', glow: 'rgba(239, 68, 68, 0.4)' },
        miles: { gradient: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', glow: 'rgba(0, 210, 255, 0.4)' }
    };

    const advancedMetrics = [
        { label: '$/HR NETO', value: netPerHour, format: v => `$${v.toFixed(2)}`, color: netPerHour >= 20 ? '#00D775' : netPerHour >= 15 ? '#F59E0B' : '#EF4444' },
        { label: 'VIAJES/HR', value: tripsPerHour, format: v => v.toFixed(1), color: '#fff' },
        { label: 'MILLAS VACÍAS', value: deadheadPct, format: v => `${v.toFixed(0)}%`, color: deadheadPct < 10 ? '#00D775' : deadheadPct < 25 ? '#F59E0B' : '#EF4444' },
        { label: showProjection ? 'PROYECCIÓN' : 'TOTAL', value: projectedTotal, format: v => `$${v.toFixed(0)}`, color: '#667eea' }
    ];

    const maxVal = Math.max(...filteredData.chartData.map(o => o.value), 10);

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden', marginBottom: '20px'
        }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BarChart2 size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Análisis Financiero</h3>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{filteredData.tripCount} viajes</p>
                        </div>
                    </div>
                </div>

                {/* === BudgetBakers Style Date Selector === */}
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '16px', padding: '16px' }}>
                    {/* Main Display Bar with Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <button onClick={() => {
                            if (selectorMode === 0) {
                                const periods = ['7d', '30d', '12w', '6m', '1y'];
                                const idx = periods.indexOf(periodType);
                                if (idx > 0) setPeriodType(periods[idx - 1]);
                            } else if (selectorMode === 1) {
                                setPresetOffset(presetOffset - 1);
                            }
                        }} style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            <ChevronLeft size={20} />
                        </button>

                        <div style={{ textAlign: 'center', flex: 1 }} onClick={() => selectorMode === 1 && setShowPresetDropdown(!showPresetDropdown)}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', cursor: selectorMode === 1 ? 'pointer' : 'default' }}>
                                {getDateLabel()}
                            </div>
                        </div>

                        <button onClick={() => {
                            if (selectorMode === 0) {
                                const periods = ['7d', '30d', '12w', '6m', '1y'];
                                const idx = periods.indexOf(periodType);
                                if (idx < periods.length - 1) setPeriodType(periods[idx + 1]);
                            } else if (selectorMode === 1) {
                                if (presetOffset < 0) setPresetOffset(presetOffset + 1);
                            }
                        }} disabled={selectorMode === 1 && presetOffset >= 0} style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: selectorMode === 1 && presetOffset >= 0 ? 'rgba(255,255,255,0.2)' : 'white'
                        }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Preset Dropdown (Mode 1) */}
                    {selectorMode === 1 && showPresetDropdown && (
                        <div style={{
                            background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '8px', marginBottom: '12px',
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'
                        }}>
                            {[
                                { key: 'day', label: 'Día' },
                                { key: 'week', label: 'Semana' },
                                { key: 'month', label: 'Mes' },
                                { key: 'year', label: 'Año' }
                            ].map(p => (
                                <button key={p.key} onClick={() => { setPresetType(p.key); setPresetOffset(0); setShowPresetDropdown(false); }}
                                    style={{
                                        padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                        background: presetType === p.key ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                                        color: 'white', fontSize: '12px', fontWeight: '600'
                                    }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Period Options (Mode 0) */}
                    {selectorMode === 0 && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[
                                { key: '7d', label: '7D' },
                                { key: '30d', label: '30D' },
                                { key: '12w', label: '12S' },
                                { key: '6m', label: '6M' },
                                { key: '1y', label: '1A' }
                            ].map(p => (
                                <button key={p.key} onClick={() => setPeriodType(p.key)}
                                    style={{
                                        padding: '8px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                        background: periodType === p.key ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                                        color: 'white', fontSize: '12px', fontWeight: '600'
                                    }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Custom Range (Mode 2) */}
                    {selectorMode === 2 && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Desde</label>
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Hasta</label>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Mode Selector Pills */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        {[0, 1, 2].map(mode => (
                            <button key={mode} onClick={() => setSelectorMode(mode)}
                                style={{
                                    width: selectorMode === mode ? '24px' : '10px',
                                    height: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                                    background: selectorMode === mode ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.2)',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards - Show only for daily view */}
            {selectorMode === 1 && presetType === 'day' && (
                <div style={{ padding: '20px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Target size={14} color="#00D775" /> Progreso hacia meta
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: onTrack ? '#00D775' : '#F59E0B' }}>
                                ${filteredData.totalEarnings.toFixed(0)} / ${dailyGoal}
                            </span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${goalProgress}%`, height: '100%',
                                background: onTrack ? 'linear-gradient(90deg, #00D775 0%, #00FF88 100%)' : 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)',
                                borderRadius: '5px', transition: 'width 0.5s ease'
                            }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        <div style={{ background: 'linear-gradient(145deg, rgba(0, 215, 117, 0.15), rgba(0, 184, 97, 0.05))', borderRadius: '14px', padding: '14px', textAlign: 'center', border: '1px solid rgba(0, 215, 117, 0.2)' }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>$/Hr Neto</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: netPerHour > 20 ? '#00D775' : netPerHour > 15 ? '#F59E0B' : '#EF4444' }}>${netPerHour.toFixed(2)}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Viajes/Hr</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{tripsPerHour.toFixed(1)}</div>
                        </div>
                        <div style={{ background: deadheadPct > 30 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '14px', textAlign: 'center', border: deadheadPct > 30 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Millas Vacías</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: deadheadPct > 30 ? '#EF4444' : '#00D775' }}>{deadheadPct.toFixed(0)}%</div>
                        </div>
                        <div style={{ background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.05))', borderRadius: '14px', padding: '14px', textAlign: 'center', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Proyección</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#667eea' }}>${projectedTotal.toFixed(0)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '20px' }}>
                {[
                    { key: 'earnings', label: 'Bruto', value: filteredData.totalEarnings, format: v => `$${v.toFixed(0)}` },
                    { key: 'net', label: 'Neto', value: filteredData.totalNet, format: v => `$${v.toFixed(0)}` },
                    { key: 'expenses', label: 'Gastos', value: filteredData.totalExpenses, format: v => `$${v.toFixed(0)}` },
                    { key: 'miles', label: 'Millas', value: filteredData.totalMiles, format: v => v.toFixed(1) }
                ].map(m => (
                    <button key={m.key} onClick={() => setSelectedMetric(m.key)} style={{
                        background: selectedMetric === m.key ? metricColors[m.key].gradient : 'rgba(0,0,0,0.25)',
                        border: selectedMetric === m.key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', padding: '16px 12px', cursor: 'pointer', textAlign: 'center',
                        boxShadow: selectedMetric === m.key ? `0 8px 24px ${metricColors[m.key].glow}` : 'none',
                        transform: selectedMetric === m.key ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.3s ease'
                    }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: selectedMetric === m.key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{m.label}</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{m.format(m.value)}</div>
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div style={{ padding: '0 24px 24px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Distribución
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', paddingBottom: '25px', position: 'relative' }}>
                    {filteredData.chartData.length > 0 ? filteredData.chartData.map((d, i) => {
                        const heightPct = (d.value / maxVal) * 100;
                        return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                {d.value > 0 && (
                                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>
                                        {selectedMetric === 'miles' ? d.value.toFixed(0) : `$${d.value.toFixed(0)}`}
                                    </div>
                                )}
                                <div style={{
                                    width: '100%', maxWidth: '32px',
                                    height: `${Math.max(heightPct, 3)}%`,
                                    background: metricColors[selectedMetric].gradient,
                                    borderRadius: '6px 6px 2px 2px',
                                    boxShadow: `0 4px 12px ${metricColors[selectedMetric].glow}`,
                                    transition: 'height 0.4s ease', position: 'relative'
                                }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', borderRadius: '6px 6px 0 0' }} />
                                </div>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', position: 'absolute', bottom: 0 }}>{d.label}</span>
                            </div>
                        );
                    }) : (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', width: '100%', fontStyle: 'italic', fontSize: '14px' }}>
                            Sin datos para este periodo
                        </div>
                    )}
                </div>
            </div>

            {/* Gas Price Footer */}
            <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Precio Gas</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#EF4444', fontWeight: '600' }}>$</span>
                    {isEditingGas ? (
                        <input type="number" value={tempGasPrice ?? effectiveGasPrice ?? 0}
                            onChange={e => setTempGasPrice(e.target.value)}
                            onBlur={handleGasUpdate}
                            onKeyDown={e => { if (e.key === 'Enter') handleGasUpdate(); }}
                            style={{ width: '60px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '14px' }}
                            autoFocus
                        />
                    ) : (
                        <div onClick={() => { setIsEditingGas(true); setTempGasPrice(effectiveGasPrice); }}
                            style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)', fontWeight: '700', fontSize: '16px', color: '#fff' }}>
                            {effectiveGasPrice?.toFixed(2)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
