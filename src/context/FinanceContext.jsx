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

    // NEW: Explicit state for current daily goal, decoupled from session.meta
    const [currentDailyGoal, setCurrentDailyGoal] = useState(250); // Default 250

    // Initial Load & Realtime Subscription
    useEffect(() => {
        const loadDat = async () => {
            setLoading(true);

            // 1. Parallel Fetching (Avoid Waterfall)
            try {
                const [sessionRes, tripsRes, dailyRes] = await Promise.all([
                    supabase.from('sessions').select('*').eq('id', 1).single(),
                    supabase.from('trips').select('*').order('timestamp', { ascending: true }),
                    supabase.from('daily_records').select('*')
                ]);

                const { data: sessionData, error: sessionError } = sessionRes;
                const { data: tripsData } = tripsRes;
                const { data: dailyData } = dailyRes;

                // ... (Session processing kept for other fields) ...
                if (sessionData) {
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
                }
                // ...

                // Process Daily Records
                if (dailyData) {
                    const recordsMap = {};
                    dailyData.forEach(r => {
                        recordsMap[r.date] = {
                            gasPrice: Number(r.gas_price),
                            dailyGoal: Number(r.daily_goal),
                            notes: r.notes
                        };
                    });
                    setDailyRecords(recordsMap);

                    // Set Current Daily Goal from TODAY'S record
                    const todayStr = new Date().toLocaleDateString('en-CA');
                    if (recordsMap[todayStr] && recordsMap[todayStr].dailyGoal > 0) {
                        console.log(`Setting currentDailyGoal from history: ${recordsMap[todayStr].dailyGoal}`);
                        setCurrentDailyGoal(recordsMap[todayStr].dailyGoal);
                    }
                }
            } catch (error) {
                console.error("Critical Error loading initial data:", error);
            } finally {
                setLoading(false);
            }
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
                                dailyGoal: Number(payload.new.daily_goal),
                                notes: payload.new.notes
                            }
                        }));

                        // If the update is for TODAY, sync session.meta
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        if (payload.new.date === todayStr) {
                            console.log("Realtime: Daily record updated for today. Syncing session.meta.");
                            setSession(prev => ({ ...prev, meta: Number(payload.new.daily_goal) }));
                        }
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

        try {
            const { error, count } = await supabase
                .from('sessions')
                .update(dbData)
                .eq('id', 1)
                .select('*', { count: 'exact' });

            if (error) {
                console.error("Error updating session in Supabase:", error);
                alert(`Error guardando datos: ${error.message}`);
            } else if (count === 0) {
                console.warn("No session row found with ID 1 to update.");
                alert("Error: No se encontró la sesión en la nube para actualizar.");
            } else {
                console.log("Session updated successfully", dbData);
            }
        } catch (err) {
            console.error("Unexpected error updating session:", err);
            alert("Error inesperado al guardar datos.");
        }
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
        // setGpsMiles(0); // Reset GPS hook - This line was removed as per previous instructions
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

    const updateDailyRecord = async (dateStr, updates) => {
        // updates: { gasPrice?: number, dailyGoal?: number, notes?: string }
        const currentRecord = dailyRecords[dateStr] || {};
        const newRecord = { ...currentRecord, ...updates };

        // Optimistic update
        setDailyRecords(prev => ({
            ...prev,
            [dateStr]: newRecord
        }));

        // DB Update (Upsert)
        const { error } = await supabase
            .from('daily_records')
            .upsert({
                date: dateStr,
                gas_price: newRecord.gasPrice,
                daily_goal: newRecord.dailyGoal,
                notes: newRecord.notes
            });

        if (error) console.error("Error updating daily record:", error);
    };

    const updateDailyGoal = (newGoal) => {
        const val = parseFloat(newGoal);

        // 1. Update Local State immediately
        setCurrentDailyGoal(val);

        // 2. Update Daily Record (Source of Truth)
        // Use session start time if active, otherwise use today's date
        const dateBasis = session.startTime ? new Date(session.startTime) : new Date();
        const dateStr = dateBasis.toLocaleDateString('en-CA');

        console.log(`Updating daily goal for ${dateStr}: ${val}`);
        updateDailyRecord(dateStr, { dailyGoal: val });

        // 3. Update Session (Deprecated but kept for backup/compatibility)
        updateSessionInCloud({
            meta: val
        });
    };

    // ... (Weekly Goal logic remains same)

    // Memoize Actions to prevent re-creation
    const actions = React.useMemo(() => ({
        // ... (other actions)
        updateDailyGoal
    }), [session, config.gasPrice, config.vehicleMpg, config.maintenanceCostPerMile, dailyRecords]);

    // ... (Metrics calculation needs update to use currentDailyGoal?)
    // Actually metrics calculation uses session.meta. We should update metrics to use currentDailyGoal too
    const metrics = React.useMemo(() => {
        // ...
        // Use currentDailyGoal instead of session.meta
        const metaRestante = Math.max(0, (currentDailyGoal || 0) - totalEarnings);

        // ...
        return {
            totalEarnings,
            milesDriven,
            metaRestante,
            lastOdometer,
            weeklyEarnings,
            weeklyGoal, // We might need to check this too later
            totalOperatingCost,
            totalNetProfit,
            currentSpeed: 0,
            currentDailyGoal // Expose it here too if needed by metrics consumers
        };
    }, [session.startTime, session.initialOdometer, currentDailyGoal, trips, config.vehicleMpg, config.gasPrice, config.maintenanceCostPerMile, weeklyGoal]);

    // Memoize Context Value
    const value = React.useMemo(() => ({
        language,
        toggleLanguage,
        t,
        config,
        updateConfig,
        session,
        trips: session.startTime ? trips.filter(t => t.timestamp >= session.startTime) : [],
        allTrips: trips,
        dailyRecords,
        currentDailyGoal, // EXPOSED HERE
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
            updateDailyRecord,
            updateDailyGoal
        },
        metrics,
        updateWeeklyGoal
    }), [language, config, session, trips, dailyRecords, metrics, weeklyGoal, currentDailyGoal]);

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider >
    );
};
