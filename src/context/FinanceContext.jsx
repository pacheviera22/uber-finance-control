import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGPS } from '../hooks/useGPS';
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
            maintenanceCostPerMile: 0.30
        };
    });

    const updateConfig = (newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            if (newConfig.gasPrice) localStorage.setItem('uber_gas_price', newConfig.gasPrice);
            if (newConfig.vehicleMpg) localStorage.setItem('uber_vehicle_mpg', newConfig.vehicleMpg);
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
                // Row not found? Create it safely if not exists? 
                // We rely on the SQL script having run "insert into sessions..."
                console.warn("Session row not found. Did you run the SQL script?");
            }

            // 2. Get Trips
            const { data: tripsData, error: tripsError } = await supabase
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

            setLoading(false);
        };

        loadDat();

        // 3. Realtime Subscription
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
                    // Simple approach: reload all trips on any change to ensure consistency
                    // Or manage state optimistically. For MVP, reload is safest or simple append.
                    // Let's do a smart merge for MVP.
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
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Integra GPS Hook
    const { gpsMiles: liveGpsMiles, setGpsMiles, currentSpeed, location, error: gpsError } = useGPS(session.status === 'active');

    // Sync Live GPS to Session State & Cloud (Throttled?)
    useEffect(() => {
        if (liveGpsMiles > 0) {
            // Update local session state to include new miles
            // But be careful not to infinite loop or override. 
            // Actually, we should accumulate.
            // Simplified: Just add liveGpsMiles to the base "gpsMiles" loaded from DB is tricky.
            // Better: 'liveGpsMiles' in hook resets to 0 on mount.
            // We need to capture the delta and add it to session.gpsMiles.
        }
    }, [liveGpsMiles]);

    // Better Approach for MVP:
    // The Hook tracks "Miles since mount". We verify "base miles" from session.
    // Actually, let's just make the hook handle the "active" state and we periodically save to DB.

    // Let's implement a simple saver interval
    useEffect(() => {
        if (session.status === 'active' && liveGpsMiles > 0) {
            const timer = setTimeout(() => {
                // We need to commit 'liveGpsMiles' to the DB and reset the hook's counter? 
                // Or just treat session.gpsMiles as the Source of Truth and have the hook notify increments.
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [liveGpsMiles, session.status]);

    // Alternative: Let's pass the current session.gpsMiles to the hook? No.
    // Let's manually handle the update logic here.

    // When liveGpsMiles changes, we update the session ONLY if it's significant change to avoid DB spam
    // For MVP: Let's trust 'milesDriven' calculation for now and just ADD a 'gpsSupported' flag
    // wait, the goal IS to use GPS.

    // New Strategy:
    // 1. We keep 'session.gpsMiles' in DB.
    // 2. We add 'liveGpsMiles' (from hook) to it for display.
    // 3. We save to DB periodically.

    // Actually, simply updating the 'milesDriven' calculation is what we want.
    // milesDriven = MAX( (Odo - InitOdo), session.gpsMiles + liveGpsMiles )

    const [unsavedGpsMiles, setUnsavedGpsMiles] = useState(0);

    useEffect(() => {
        setUnsavedGpsMiles(liveGpsMiles);
    }, [liveGpsMiles]);

    // Periodic Save (every 30s or on pause)
    useEffect(() => {
        if (unsavedGpsMiles > 0.1) {
            const interval = setInterval(() => {
                const newTotal = (session.gpsMiles || 0) + unsavedGpsMiles;
                updateSessionInCloud({ gpsMiles: newTotal });
                setGpsMiles(0); // Reset hook
                setUnsavedGpsMiles(0);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [unsavedGpsMiles]);


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

    // Metrics Calculation
    const currentTrips = session.startTime
        ? trips.filter(t => t.timestamp >= session.startTime) // Filter in memory for MVP
        : [];

    const totalEarnings = currentTrips.reduce((sum, t) => sum + t.amount, 0);

    const lastOdometer = currentTrips.length > 0
        ? currentTrips[currentTrips.length - 1].odometer
        : session.initialOdometer;

    // Safety check for NaN
    // Hybrid Miles Calculation: Use GPS if available and > Odometer, else Odometer
    const odoMiles = Math.max(0, (lastOdometer || 0) - (session.initialOdometer || 0));
    const totalGpsMiles = (session.gpsMiles || 0) + (unsavedGpsMiles || 0);

    // We prefer GPS if it has data (> 0.1), otherwise fallback to odometer
    // This allows the user to switch between modes seamlessly.
    // If they forget to set start odometer, GPS saves them.
    // If GPS fails, they can fix end odometer.
    const milesDriven = totalGpsMiles > odoMiles ? totalGpsMiles : odoMiles;
    // Safety check for NaN

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
                updateConfig
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
                currentSpeed,
                usingGPS: totalGpsMiles > 0.1,
                isGpsActive: !!location && !gpsError,
                gpsError
            },
            updateWeeklyGoal
        }}>
            {children}
        </FinanceContext.Provider >
    );
};
