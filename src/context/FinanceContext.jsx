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
                    totalPausedTime: sessionData.total_paused_time
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
                    timestamp: Number(t.timestamp)
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
                            totalPausedTime: newSession.total_paused_time
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
                            timestamp: Number(payload.new.timestamp)
                        };
                        setTrips(prev => [...prev, newTrip]);
                    } else if (payload.eventType === 'DELETE') {
                        setTrips(prev => prev.filter(t => t.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = {
                            ...payload.new,
                            amount: Number(payload.new.amount),
                            odometer: Number(payload.new.odometer),
                            timestamp: Number(payload.new.timestamp)
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

        await supabase.from('sessions').update(dbData).eq('id', 1);
    };

    const startShift = (meta, initialOdometer, endTime, startTime = Date.now()) => {
        updateSessionInCloud({
            status: 'active',
            meta: parseFloat(meta),
            initialOdometer: parseFloat(initialOdometer),
            startTime: new Date(startTime).getTime(),
            endTime: new Date(endTime).getTime(),
            lastPauseTime: null,
            totalPausedTime: 0, // Fresh start
        });
    };

    const pauseShift = () => {
        if (session.status !== 'active') return;
        updateSessionInCloud({
            status: 'paused',
            lastPauseTime: Date.now()
        });
    };

    const resumeShift = () => {
        if (session.status !== 'paused') return;
        const pauseDuration = Date.now() - session.lastPauseTime;
        updateSessionInCloud({
            status: 'active',
            lastPauseTime: null,
            totalPausedTime: session.totalPausedTime + pauseDuration
        });
    };

    const endShift = () => {
        updateSessionInCloud({ status: 'idle', startTime: null });
    };

    const addTrip = async (amount, odometer, timestamp = Date.now()) => {
        // Optimistic update optional, but we rely on realtime subscription usually
        // Implementation: Just insert, UI updates via Subscription
        await supabase.from('trips').insert({
            amount: parseFloat(amount),
            odometer: parseFloat(odometer),
            timestamp: new Date(timestamp).getTime()
        });
    };

    const updateTrip = async (id, data) => {
        await supabase.from('trips').update({
            amount: parseFloat(data.amount),
            odometer: parseFloat(data.odometer),
            timestamp: new Date(data.timestamp).getTime()
        }).eq('id', id);
    };

    const deleteTrip = async (id) => {
        await supabase.from('trips').delete().eq('id', id);
    };

    const updateStartTime = (newStartTime) => {
        updateSessionInCloud({
            startTime: new Date(newStartTime).getTime(),
            totalPausedTime: 0 // Reset logic from previous fix
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
    const milesDriven = Math.max(0, (lastOdometer || 0) - (session.initialOdometer || 0));
    const metaRestante = Math.max(0, (session.meta || 0) - totalEarnings);

    if (loading) {
        return <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Syncing with cloud...</div>;
    }

    return (
        <FinanceContext.Provider value={{
            language,
            toggleLanguage,
            t,
            session,
            trips: currentTrips,
            allTrips: trips,
            actions: { startShift, pauseShift, resumeShift, endShift, addTrip, updateTrip, deleteTrip, updateStartTime, updateStartOdometer, updateEndTime },
            metrics: {
                totalEarnings,
                milesDriven,
                metaRestante,
                lastOdometer
            }
        }}>
            {children}
        </FinanceContext.Provider>
    );
};
