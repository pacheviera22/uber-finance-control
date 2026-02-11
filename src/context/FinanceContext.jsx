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

    // Weekly Goal State (migrating from localStorage to Supabase)
    const [currentWeeklyGoal, setCurrentWeeklyGoal] = useState(1000); // Default 1000
    const [weeklyRecords, setWeeklyRecords] = useState({});

    // Helper function to get week start date (Monday)
    const getWeekStartDate = () => {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    };

    // Initial Load & Realtime Subscription
    useEffect(() => {
        const loadDat = async () => {
            setLoading(true);

            // 1. Parallel Fetching (Avoid Waterfall)
            try {
                const [sessionRes, tripsRes, dailyRes, weeklyRes] = await Promise.all([
                    supabase.from('sessions').select('*').eq('id', 1).single(),
                    supabase.from('trips').select('*').order('timestamp', { ascending: true }),
                    supabase.from('daily_records').select('*'),
                    supabase.from('weekly_records').select('*')
                ]);

                const { data: sessionData, error: sessionError } = sessionRes;
                const { data: tripsData } = tripsRes;
                const { data: dailyData } = dailyRes;
                const { data: weeklyData } = weeklyRes;

                // Process Session
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
                } else if (sessionError && sessionError.code === 'PGRST116') {
                    console.warn("Session row not found. Did you run the SQL script?");
                }

                // Process Trips
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

                // Process Weekly Records
                if (weeklyData) {
                    const weeklyMap = {};
                    weeklyData.forEach(r => {
                        weeklyMap[r.week_start_date] = {
                            weeklyGoal: Number(r.weekly_goal),
                            notes: r.notes
                        };
                    });
                    setWeeklyRecords(weeklyMap);

                    // Set Current Weekly Goal from THIS WEEK'S record
                    const weekStart = getWeekStartDate();
                    if (weeklyMap[weekStart] && weeklyMap[weekStart].weeklyGoal > 0) {
                        console.log(`Setting currentWeeklyGoal from history: ${weeklyMap[weekStart].weeklyGoal}`);
                        setCurrentWeeklyGoal(weeklyMap[weekStart].weeklyGoal);
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

                        // If the update is for TODAY, sync currentDailyGoal
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        if (payload.new.date === todayStr) {
                            console.log("Realtime: Daily record updated for today. Syncing currentDailyGoal.");
                            setCurrentDailyGoal(Number(payload.new.daily_goal));
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'weekly_records' },
                (payload) => {
                    if (payload.new) {
                        setWeeklyRecords(prev => ({
                            ...prev,
                            [payload.new.week_start_date]: {
                                weeklyGoal: Number(payload.new.weekly_goal),
                                notes: payload.new.notes
                            }
                        }));

                        // If the update is for THIS WEEK, sync currentWeeklyGoal
                        const weekStart = getWeekStartDate();
                        if (payload.new.week_start_date === weekStart) {
                            console.log("Realtime: Weekly record updated for this week. Syncing currentWeeklyGoal.");
                            setCurrentWeeklyGoal(Number(payload.new.weekly_goal));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

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

    // Weekly Record Update Function (similar to updateDailyRecord)
    const updateWeeklyRecord = async (weekStartDate, updates) => {
        // updates: { weeklyGoal?: number, notes?: string }
        const currentRecord = weeklyRecords[weekStartDate] || {};
        const newRecord = { ...currentRecord, ...updates };

        // Optimistic update
        setWeeklyRecords(prev => ({
            ...prev,
            [weekStartDate]: newRecord
        }));

        // DB Update (Upsert)
        const { error } = await supabase
            .from('weekly_records')
            .upsert({
                week_start_date: weekStartDate,
                weekly_goal: newRecord.weeklyGoal,
                notes: newRecord.notes
            });

        if (error) console.error("Error updating weekly record:", error);
    };

    const updateWeeklyGoal = (newGoal) => {
        const val = parseFloat(newGoal);

        // 1. Update Local State immediately
        setCurrentWeeklyGoal(val);

        // 2. Update Weekly Record (Source of Truth)
        const weekStart = getWeekStartDate();

        console.log(`Updating weekly goal for week ${weekStart}: ${val}`);
        updateWeeklyRecord(weekStart, { weeklyGoal: val });

        // 3. Keep localStorage for backward compatibility (optional)
        localStorage.setItem('uber_weekly_goal', val);
    };

    // Memoize Actions to prevent re-creation
    const actions = React.useMemo(() => ({
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
        updateDailyGoal,
        updateWeeklyRecord,
        updateWeeklyGoal
    }), [session, config.gasPrice, config.vehicleMpg, config.maintenanceCostPerMile, dailyRecords, weeklyRecords]);
    console.log("DEBUG: Actions memoized");

    // Memoize Metrics Calculation
    const metrics = React.useMemo(() => {
        console.log("DEBUG: Calculating metrics...");
        const currentTrips = session.startTime
            ? trips.filter(t => t.timestamp >= session.startTime)
            : [];

        const totalEarnings = currentTrips.reduce((sum, t) => sum + t.amount, 0);

        const lastOdometer = currentTrips.length > 0
            ? currentTrips[currentTrips.length - 1].odometer
            : session.initialOdometer;

        const milesDriven = Math.max(0, (lastOdometer || 0) - (session.initialOdometer || 0));
        const metaRestante = Math.max(0, (currentDailyGoal || 0) - totalEarnings);

        const totalOperatingCost = (
            (milesDriven / config.vehicleMpg * config.gasPrice) +
            (milesDriven * config.maintenanceCostPerMile)
        );

        const totalNetProfit = totalEarnings - totalOperatingCost;

        const getWeekRange = () => {
            const now = new Date();
            const day = now.getDay(); // 0 is Sunday
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            const monday = new Date(now.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday.getTime();
        };

        const weekStart = getWeekRange();
        const weeklyEarnings = trips
            .filter(t => t.timestamp >= weekStart)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalEarnings,
            milesDriven,
            metaRestante,
            lastOdometer,
            weeklyEarnings,
            weeklyGoal: currentWeeklyGoal, // Use currentWeeklyGoal from state
            totalOperatingCost,
            totalNetProfit,
            currentSpeed: 0,
            currentDailyGoal
        };
    }, [session.startTime, session.initialOdometer, currentDailyGoal, currentWeeklyGoal, trips, config.vehicleMpg, config.gasPrice, config.maintenanceCostPerMile]);

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
        weeklyRecords,
        currentDailyGoal,
        currentWeeklyGoal,
        actions,
        metrics,
        updateWeeklyGoal
    }), [language, config, session, trips, dailyRecords, weeklyRecords, metrics, currentDailyGoal, currentWeeklyGoal, actions]);

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider >
    );
};
