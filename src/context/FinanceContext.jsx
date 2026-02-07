import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { translations } from '../utils/translations';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

export const FinanceProvider = ({ children }) => {
    // Language State (Local Preference is fine in localStorage)
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('uber_lang') || 'es';
    });

    // Configuration State (Local Preference)
    const [config, setConfig] = useState(() => {
        return {
            gasPrice: parseFloat(localStorage.getItem('uber_gas_price')) || 3.10,
            vehicleMpg: parseFloat(localStorage.getItem('uber_vehicle_mpg')) || 24,
            maintenanceCostPerMile: 0.30,
            isGpsEnabled: localStorage.getItem('uber_gps_enabled') !== 'false' // Default true
        };
    });

    const updateConfig = (newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            if (newConfig.gasPrice) localStorage.setItem('uber_gas_price', newConfig.gasPrice);
            if (newConfig.vehicleMpg) localStorage.setItem('uber_vehicle_mpg', newConfig.vehicleMpg);
            if (newConfig.isGpsEnabled !== undefined) localStorage.setItem('uber_gps_enabled', newConfig.isGpsEnabled);
            return updated;
        });
    };

    const toggleLanguage = () => {
        setLanguage(prev => {
            const newLang = prev === 'en' ? 'es' : 'en';
            localStorage.setItem('uber_lang', newLang);
            return newLang;
        });
    };

    const t = translations[language];

    // Session State (Cloud)
    // Initialize with default, but will be overwritten by Supabase immediately
    const [session, setSession] = useState({
        status: 'idle',
        meta: 0,
        initialOdometer: 0,
        startTime: null,
        endTime: null,
        lastPauseTime: null,
        totalPausedTime: 0,
        gpsMiles: 0
    });

    // Data State (Cloud)
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    // Daily Records State
    const [dailyRecords, setDailyRecords] = useState({});

    // Initial Load & Realtime Subscription
    useEffect(() => {
        const loadDat = async () => {
            setLoading(true);

            // 1. Get Session (ID=1)
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', 1)
                .single();

            if (sessionData) {
                // Map snake_case to camelCase
                setSession({
                    status: sessionData.status,
                    meta: Number(sessionData.meta),
                    initialOdometer: Number(sessionData.initial_odometer),
                    startTime: sessionData.start_time,
                    endTime: sessionData.end_time,
                    lastPauseTime: sessionData.last_pause_time,
                    totalPausedTime: sessionData.total_paused_time,
                    gpsMiles: Number(sessionData.gps_miles || 0)
                });
            } else if (sessionError && sessionError.code === 'PGRST116') {
                console.warn("Session row not found. Did you run the SQL script?");
            }

            // 2. Get Trips
            const { data: tripsData } = await supabase
                .from('trips')
                .select('*')
                .order('timestamp', { ascending: true });

            if (tripsData) {
                setTrips(tripsData.map(t => ({
                    ...t,
                    amount: Number(t.amount),
                    odometer: Number(t.odometer),
                    timestamp: Number(t.timestamp),
                    distance: Number(t.distance || 0),
                    gasPrice: Number(t.gas_price || 0), // from DB snake_case
                    mpg: Number(t.mpg || 24)
                })));
            }

            // 3. Get Daily Records
            const { data: dailyData } = await supabase
                .from('daily_records')
                .select('*');

            if (dailyData) {
                const recordsMap = {};
                dailyData.forEach(r => {
                    recordsMap[r.date] = {
                        gasPrice: Number(r.gas_price),
                        notes: r.notes
                    };
                });
                setDailyRecords(recordsMap);
            }

            setLoading(false);
        };

        loadDat();

        // 4. Realtime Subscription
        const channel = supabase
            .channel('uber_finance_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions', filter: 'id=eq.1' },
                (payload) => {
                    const newSession = payload.new;
                    if (newSession) {
                        setSession({
                            status: newSession.status,
                            meta: Number(newSession.meta),
                            initialOdometer: Number(newSession.initial_odometer),
                            startTime: newSession.start_time,
                            endTime: newSession.end_time,
                            lastPauseTime: newSession.last_pause_time,
                            totalPausedTime: newSession.total_paused_time,
                            gpsMiles: Number(newSession.gps_miles || 0)
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'trips' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newTrip = {
                            ...payload.new,
                            amount: Number(payload.new.amount),
                            odometer: Number(payload.new.odometer),
                            timestamp: Number(payload.new.timestamp),
                            distance: Number(payload.new.distance || 0),
                            gasPrice: Number(payload.new.gas_price || 0),
                            mpg: Number(payload.new.mpg || 24)
                        };
                        setTrips(prev => [...prev, newTrip]);
                    } else if (payload.eventType === 'DELETE') {
                        setTrips(prev => prev.filter(t => t.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = {
                            ...payload.new,
                            amount: Number(payload.new.amount),
                            odometer: Number(payload.new.odometer),
                            timestamp: Number(payload.new.timestamp),
                            distance: Number(payload.new.distance || 0),
                            gasPrice: Number(payload.new.gas_price || 0),
                            mpg: Number(payload.new.mpg || 24)
                        };
                        setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'daily_records' },
                (payload) => {
                    if (payload.new) {
                        setDailyRecords(prev => ({
                            ...prev,
                            [payload.new.date]: {
                                gasPrice: Number(payload.new.gas_price),
                                notes: payload.new.notes
                            }
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // GPS logic removed per user request. Relying on Odometer.


    // Actions (Write to Supabase)

    const updateSessionInCloud = async (newData) => {
        // Optimistic update locally
        setSession(prev => ({ ...prev, ...newData }));

        // Convert to snake_case for DB
        const dbData = {};
        if (newData.status !== undefined) dbData.status = newData.status;
        if (newData.meta !== undefined) dbData.meta = newData.meta;
        if (newData.initialOdometer !== undefined) dbData.initial_odometer = newData.initialOdometer;
        if (newData.startTime !== undefined) dbData.start_time = newData.startTime;
        if (newData.endTime !== undefined) dbData.end_time = newData.endTime;
        if (newData.lastPauseTime !== undefined) dbData.last_pause_time = newData.lastPauseTime;
        if (newData.totalPausedTime !== undefined) dbData.total_paused_time = newData.totalPausedTime;
        if (newData.gpsMiles !== undefined) dbData.gps_miles = newData.gpsMiles;

        await supabase.from('sessions').update(dbData).eq('id', 1);
    };

    const startNewShift = (meta, initialOdometer, endTime, startTime = Date.now()) => {
        // Completely reset session
        updateSessionInCloud({
            status: 'active',
            meta: parseFloat(meta),
            initialOdometer: parseFloat(initialOdometer),
            startTime: new Date(startTime).getTime(),
            endTime: new Date(endTime).getTime(),
            lastPauseTime: null,
            totalPausedTime: 0,
            gpsMiles: 0
        });
        setGpsMiles(0); // Reset GPS hook
    };

    // Alias: startShift now calls startNewShift (legacy support)
    const startShift = startNewShift;

    const pauseShift = () => {
        if (session.status !== 'active') return;
        updateSessionInCloud({
            status: 'paused',
            lastPauseTime: Date.now()
        });
    };

    const resumeShift = () => {
        // Allow resuming from paused OR idle (if it was a soft end)
        if (session.status !== 'paused' && session.status !== 'idle') return;

        const pauseDuration = session.lastPauseTime ? (Date.now() - session.lastPauseTime) : 0;

        updateSessionInCloud({
            status: 'active',
            lastPauseTime: null,
            // Only add pause time if we were actually paused/idle
            totalPausedTime: session.totalPausedTime + pauseDuration
        });
    };

    const endShift = () => {
        // Soft End: Just go idle, but keep data so we can resume if needed
        // We set lastPauseTime so we can count the "idle" time as a pause if they resume
        updateSessionInCloud({
            status: 'idle',
            lastPauseTime: Date.now()
        });
    };

    const addTrip = async ({ amount, odometer, timestamp = Date.now(), platform = 'uber', distance = 0 }) => {
        await supabase.from('trips').insert({
            amount: parseFloat(amount),
            odometer: parseFloat(odometer),
            timestamp: new Date(timestamp).getTime(),
            platform,
            distance: parseFloat(distance),
            gas_price: config.gasPrice, // Snapshot current price
            mpg: config.vehicleMpg // Snapshot current mpg
        });
    };

    const updateTrip = async (id, data) => {
        const updateData = {
            amount: parseFloat(data.amount),
            odometer: parseFloat(data.odometer),
            timestamp: new Date(data.timestamp).getTime(),
            distance: parseFloat(data.distance || 0)
        };
        if (data.platform) updateData.platform = data.platform;
        // Optional: Update costs if explicitly requested, but usually historical data should stay unless fixed
        if (data.gasPrice) updateData.gas_price = data.gasPrice;
        if (data.mpg) updateData.mpg = data.mpg;

        await supabase.from('trips').update(updateData).eq('id', id);
    };

    const deleteTrip = async (id) => {
        await supabase.from('trips').delete().eq('id', id);
    };

    const updateStartTime = (newStartTime) => {
        updateSessionInCloud({
            startTime: new Date(newStartTime).getTime(),
            totalPausedTime: 0
        });
    };

    const updateStartOdometer = (newOdometer) => {
        updateSessionInCloud({
            initialOdometer: parseFloat(newOdometer)
        });
    };

    const updateEndTime = (newEndTime) => {
        updateSessionInCloud({
            endTime: new Date(newEndTime).getTime()
        });
    };

    const updateDailyRecord = async (date, data) => {
        const { error } = await supabase
            .from('daily_records')
            .upsert({ date, gas_price: data.gasPrice, notes: data.notes })
            .select();

        if (error) console.error("Error updating daily record", error);
    };

    // Metrics Calculation
    const currentTrips = session.startTime
        ? trips.filter(t => t.timestamp >= session.startTime) // Filter in memory for MVP
        : [];

    const totalEarnings = currentTrips.reduce((sum, t) => sum + t.amount, 0);

    const lastOdometer = currentTrips.length > 0
        ? currentTrips[currentTrips.length - 1].odometer
        : session.initialOdometer;

    // Safety check for NaN
    const milesDriven = Math.max(0, (lastOdometer || 0) - (session.initialOdometer || 0));

    const metaRestante = Math.max(0, (session.meta || 0) - totalEarnings);

    // Profitability Metrics (Current Session)
    // Refactored: Use Session Miles (Odometer Diff) for total cost
    const totalOperatingCost = (
        (milesDriven / config.vehicleMpg * config.gasPrice) +
        (milesDriven * config.maintenanceCostPerMile)
    );

    const totalNetProfit = totalEarnings - totalOperatingCost;

    // Weekly Goal (Local Storage)
    const [weeklyGoal, setWeeklyGoal] = useState(() => {
        return parseFloat(localStorage.getItem('uber_weekly_goal')) || 1000;
    });

    const updateWeeklyGoal = (amount) => {
        setWeeklyGoal(amount);
        localStorage.setItem('uber_weekly_goal', amount);
    };

    if (loading) {
        return <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Syncing with cloud...</div>;
    }

    // Weekly Calculations
    const getWeekRange = () => {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.getTime();
    };

    const startOfWeek = getWeekRange();
    const weeklyEarnings = trips
        .filter(t => t.timestamp >= startOfWeek)
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <FinanceContext.Provider value={{
            language,
            toggleLanguage,
            t,
            config,
            updateConfig,
            session,
            trips: currentTrips,
            allTrips: trips,
            dailyRecords,
            actions: {
                startShift,
                pauseShift,
                resumeShift,
                endShift,
                addTrip,
                updateTrip,
                deleteTrip,
                updateStartTime,
                updateStartOdometer,
                updateEndTime,
                updateConfig,
                updateDailyRecord
            },
            metrics: {
                totalEarnings,
                milesDriven,
                metaRestante,
                lastOdometer,
                weeklyEarnings,
                weeklyGoal,
                totalOperatingCost,
                totalNetProfit,
                currentSpeed: 0 // No GPS
            },
            updateWeeklyGoal
        }}>
            {children}
        </FinanceContext.Provider >
    );
};
