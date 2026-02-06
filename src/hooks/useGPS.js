import { useState, useEffect, useRef } from 'react';

export const useGPS = (isActive) => {
    const [gpsMiles, setGpsMiles] = useState(0);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);

    const lastPosRef = useRef(null);
    const watchIdRef = useRef(null);
    const wakeLockRef = useRef(null);

    // Haversine Formula for distance in Miles
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 3959; // Radius of Earth in miles
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Wake Lock to keep screen alive
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.warn('Wake Lock error:', err);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    };

    useEffect(() => {
        if (!isActive) {
            // Stop tracking
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            lastPosRef.current = null;
            releaseWakeLock();
            return;
        }

        // Start tracking
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        requestWakeLock();

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, speed } = position.coords;

                // Update basic state
                setLocation({ lat: latitude, lng: longitude });
                setCurrentSpeed(speed ? (speed * 2.23694) : 0); // m/s to mph

                // Calculate distance
                if (lastPosRef.current) {
                    const dist = calculateDistance(
                        lastPosRef.current.lat,
                        lastPosRef.current.lng,
                        latitude,
                        longitude
                    );

                    // Noise filter: Ignore extremely small jumps (< 10 meters approx 0.006 miles) or massive jumps
                    if (dist > 0.005 && dist < 5.0) {
                        setGpsMiles(prev => prev + dist);
                    }
                }

                lastPosRef.current = { lat: latitude, lng: longitude };
            },
            (err) => setError(err.message),
            options
        );

        // Re-acquire wake lock on visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [isActive]);

    return { gpsMiles, setGpsMiles, currentSpeed, location, error };
};
