import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { TrendingUp, TrendingDown, BarChart2, MapPin, Clock } from 'lucide-react';

export default function MetricsComparison() {
    const { allTrips, metrics, session, t, config, actions: { updateConfig } } = useFinance();
    const [period, setPeriod] = useState('yesterday'); // 'yesterday' | 'weekly'
    const [isEditingGas, setIsEditingGas] = useState(false);
    const [tempGasPrice, setTempGasPrice] = useState(config.gasPrice);

    // Calculate historical stats
    const stats = useMemo(() => {
        const calculateStats = (tripList) => {
            const earnings = tripList.reduce((sum, t) => sum + t.amount, 0);

            // Refactored: Calculate miles from max/min odometer in the period
            let miles = 0;
            if (tripList.length > 1) {
                // Sort by odometer to be safe
                const sorted = [...tripList].sort((a, b) => a.odometer - b.odometer);
                const minOdo = sorted[0].odometer;
                const maxOdo = sorted[sorted.length - 1].odometer;
                miles = maxOdo - minOdo;
            } else if (tripList.length === 1) {
                // Estimated avg per trip if only 1 data point (fallback)
                miles = 5;
            }

            const costs = (
                (miles / config.vehicleMpg * config.gasPrice) +
                (miles * config.maintenanceCostPerMile)
            );

            return { earnings, costs, net: earnings - costs };
        };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        // Yesterday
        const yesterdayStart = new Date(todayStart - 86400000).getTime();
        const yesterdayEnd = todayStart;

        // Last 7 Days
        const lastWeekStart = new Date(todayStart - (7 * 86400000)).getTime();

        const tripsYesterday = allTrips.filter(t => t.timestamp >= yesterdayStart && t.timestamp < yesterdayEnd);
        const statsYesterday = calculateStats(tripsYesterday);

        const tripsLastWeek = allTrips.filter(t => t.timestamp >= lastWeekStart && t.timestamp < todayStart);
        const statsLastWeek = calculateStats(tripsLastWeek);

        // Daily Avg
        const dayMap = {};
        const costMap = {};
        const netMap = {};

        tripsLastWeek.forEach(t => {
            const dayKey = new Date(t.timestamp).toDateString();
            if (!dayMap[dayKey]) { dayMap[dayKey] = 0; costMap[dayKey] = 0; netMap[dayKey] = 0; }

            // Re-calc cost per trip here to be safe
            const dist = t.distance || 0;
            const mpg = t.mpg || config.vehicleMpg;
            const price = t.gasPrice || config.gasPrice;
            const cost = ((dist / mpg) * price) + (dist * config.maintenanceCostPerMile);

            dayMap[dayKey] += t.amount;
            costMap[dayKey] += cost;
            netMap[dayKey] += (t.amount - cost);
        });

        const activeDays = Object.keys(dayMap).length;

        const avgEarnings = activeDays > 0 ? (statsLastWeek.earnings / activeDays) : 0;
        const avgCosts = activeDays > 0 ? (statsLastWeek.costs / activeDays) : 0;
        const avgNet = activeDays > 0 ? (statsLastWeek.net / activeDays) : 0;

        return {
            yesterday: statsYesterday,
            weeklyAvg: {
                earnings: avgEarnings,
                costs: avgCosts,
                net: avgNet
            },
            _yesterdayStart: yesterdayStart
        };
    }, [allTrips, config]);

    // Hourly Chart Data (Current Shift)
    const chartData = useMemo(() => {
        if (!session.startTime) return [];

        const hours = {};
        const getHourLabel = (ts) => {
            const date = new Date(ts);
            return date.getHours(); // 0-23
        };

        // Initialize session hours
        const startHour = new Date(session.startTime).getHours();
        const currentHour = new Date().getHours();

        // Handle day crossing logic simply: just iterate from start to current
        // If current < start, add 24 to current for loop, then modulo 24 for label
        let endIter = currentHour < startHour ? currentHour + 24 : currentHour;

        for (let i = startHour; i <= endIter; i++) {
            hours[i % 24] = 0;
        }

        // Fill with trip data
        // Filter trips belonging to current session
        const sessionTrips = allTrips.filter(t => t.timestamp >= session.startTime);

        sessionTrips.forEach(t => {
            const h = new Date(t.timestamp).getHours();
            if (hours[h] !== undefined) {
                hours[h] += t.amount;
            }
        });

        return Object.entries(hours).map(([hour, amount]) => ({
            hour: `${hour}:00`,
            amount
        }));
    }, [allTrips, session.startTime]);

    const comparisonObj = period === 'yesterday' ? stats.yesterday : stats.weeklyAvg;
    const currentNet = metrics.totalNetProfit;
    const diff = currentNet - comparisonObj.net;
    const isPositive = diff >= 0;

    // Derived Current Stats
    const earningsPerMile = metrics.milesDriven > 0 ? (metrics.totalEarnings / metrics.milesDriven) : 0;
    const durationHours = session.startTime ? ((Date.now() - session.startTime - session.totalPausedTime) / 3600000) : 0;
    const earningsPerHour = durationHours > 0 ? (metrics.totalEarnings / durationHours) : 0;

    // Derived Historical Stats (Approximate)


    // Helper to render comparison text
    const renderComp = (current, historical) => {
        const diff = current - historical;
        const isPos = diff >= 0;
        return (
            <span style={{ fontSize: '12px', color: isPos ? 'var(--accent-color)' : 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {/* Only show percent if meaningful, else show abs diff */}
                {Math.abs(diff).toFixed(2)}
            </span>
        );
    };

    return (
        <div className="card glass-card">
            <div className="flex-between" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={16} color="var(--accent-color)" />
                    {t.analytics}
                </h3>

                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px', display: 'flex' }}>
                    <button onClick={() => setPeriod('yesterday')} style={{ background: period === 'yesterday' ? 'var(--accent-color)' : 'transparent', color: period === 'yesterday' ? '#000' : 'var(--text-muted)', border: 'none', padding: '4px 12px', borderRadius: '2px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease' }}>
                        {t.yesterday}
                    </button>
                    <button onClick={() => setPeriod('weekly')} style={{ background: period === 'weekly' ? 'var(--accent-color)' : 'transparent', color: period === 'weekly' ? '#000' : 'var(--text-muted)', border: 'none', padding: '4px 12px', borderRadius: '2px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease' }}>
                        {t.weeklyAvg}
                    </button>
                </div>
            </div>

            {/* Comparison Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(0, 215, 117, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 215, 117, 0.2)' }}>
                    <div className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', color: '#00D775' }}>
                        <span>Net Profit (Est.)</span>
                        {renderComp(metrics.totalNetProfit, comparisonObj.net)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#00D775', textShadow: '0 0 15px rgba(0, 215, 117, 0.4)' }}>
                            ${metrics.totalNetProfit.toFixed(0)}<span style={{ fontSize: '16px' }}>.{metrics.totalNetProfit.toFixed(2).split('.')[1]}</span>
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '400' }}>
                            / ${comparisonObj.net.toFixed(0)}
                        </span>
                    </div>
                </div>
                <div style={{ background: 'rgba(255, 77, 77, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                    <div className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', color: '#ff4d4d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Pocket Cost</span>
                            <button
                                onClick={() => { setIsEditingGas(true); setTempGasPrice(config.gasPrice); }}
                                style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', opacity: 0.7 }}
                            >
                                ✏️
                            </button>
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>AVG: ${comparisonObj.costs.toFixed(0)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4d', textShadow: '0 0 15px rgba(255, 77, 77, 0.4)' }}>
                            ${metrics.totalOperatingCost.toFixed(0)}<span style={{ fontSize: '16px' }}>.{metrics.totalOperatingCost.toFixed(2).split('.')[1]}</span>
                        </span>
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,77,77,0.7)', marginTop: '4px' }}>
                        {isEditingGas ? (
                            <input
                                type="number"
                                step="0.01"
                                value={tempGasPrice}
                                autoFocus
                                onChange={(e) => setTempGasPrice(e.target.value)}
                                onBlur={() => {
                                    updateConfig({ gasPrice: parseFloat(tempGasPrice) });
                                    setIsEditingGas(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateConfig({ gasPrice: parseFloat(tempGasPrice) });
                                        setIsEditingGas(false);
                                    }
                                }}
                                style={{ width: '50px', fontSize: '10px', padding: '2px', borderRadius: '4px', border: 'none' }}
                            />
                        ) : (
                            <span>Fuel (${config.gasPrice.toFixed(2)}/g) + Wear (${config.maintenanceCostPerMile}/mi)</span>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ alignItems: 'center', marginBottom: '20px', background: 'linear-gradient(90deg, rgba(255,102,0,0.1) 0%, transparent 100%)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
                <div className="flex-between">
                    <div>
                        <div className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>GROSS EARNINGS</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>${metrics.totalEarnings.toFixed(0)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{period === 'yesterday' ? t.vsYesterday : t.vsAverage}</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>${comparisonObj.earnings.toFixed(0)}</div>
                    </div>
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right', color: (metrics.totalEarnings - comparisonObj.earnings) >= 0 ? 'var(--accent-color)' : 'var(--error-color)', fontWeight: 'bold' }}>
                    {(metrics.totalEarnings - comparisonObj.earnings) >= 0 ? '+' : ''}{(metrics.totalEarnings - comparisonObj.earnings).toFixed(0)}
                </div>
            </div>

            {/* 3D Chart Section */}
            <div>
                <div className="text-muted" style={{ fontSize: '12px', marginBottom: '12px' }}>{t.hourlyEarnings} (3D)</div>
                <div className="chart-container">
                    {chartData.length > 0 ? chartData.map((d, i) => {
                        const maxVal = Math.max(...chartData.map(o => o.amount), 1); // Avoid div by 0
                        const heightPct = (d.amount / maxVal) * 100;

                        return (
                            <div key={i} className="bar-group">
                                <div className="bar-wrapper">
                                    {d.amount > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: `${Math.max(heightPct, 2)}%`,
                                            marginBottom: '12px',
                                            color: 'var(--accent-color)',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            textShadow: '0 0 5px rgba(0,0,0,0.5)',
                                            transform: 'translateZ(20px)', // Bring forward
                                            whiteSpace: 'nowrap'
                                        }}>
                                            ${d.amount.toFixed(0)}
                                        </div>
                                    )}
                                    <div className="bar-3d" style={{ height: `${Math.max(heightPct, 2)}%` }}>
                                        <div className="bar-top"></div>
                                    </div>
                                </div>
                                <span className="bar-label">{d.hour}</span>
                            </div>
                        );
                    }) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                            Start driving to see data
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
