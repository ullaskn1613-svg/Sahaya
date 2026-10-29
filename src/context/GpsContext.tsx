/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  BENGALURU_GPS_PRESETS,
  findNearestBmtcStop,
  isCoordinateInBengaluru,
  NearestStopMatch,
  RealGpsPosition,
} from '../services/gpsService';

export type GpsStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error';

interface GpsContextType {
  position: RealGpsPosition | null;
  nearestStop: NearestStopMatch | null;
  status: GpsStatus;
  isTracking: boolean;
  isInsideBengaluru: boolean;
  errorMessage: string | null;
  requestRealGps: () => Promise<RealGpsPosition | null>;
  startLiveTracking: () => void;
  stopTracking: () => void;
  toggleLiveTracking: () => void;
  setPresetGps: (presetName: string) => void;
  clearGps: () => void;
}

const GpsContext = createContext<GpsContextType | undefined>(undefined);

export const GpsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [position, setPosition] = useState<RealGpsPosition | null>(null);
  const [nearestStop, setNearestStop] = useState<NearestStopMatch | null>(null);
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Update nearest stop whenever position changes
  useEffect(() => {
    if (position) {
      const match = findNearestBmtcStop(position.lat, position.lng);
      setNearestStop(match);
    } else {
      setNearestStop(null);
    }
  }, [position]);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const requestRealGps = (): Promise<RealGpsPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setStatus('unsupported');
        setErrorMessage('Geolocation hardware/API is not supported by this browser.');
        resolve(null);
        return;
      }

      setStatus('requesting');
      setErrorMessage(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const realPos: RealGpsPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyMeters: Math.round(pos.coords.accuracy),
            altitudeMeters: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
            speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
            headingDegrees: pos.coords.heading ? Math.round(pos.coords.heading) : null,
            timestamp: pos.timestamp,
            isSimulated: false,
          };
          setPosition(realPos);
          setStatus('active');
          resolve(realPos);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setStatus('denied');
            setErrorMessage(
              'Location permission denied. Geolocation requires HTTPS or localhost and explicit user permission in your browser.'
            );
          } else if (err.code === err.TIMEOUT) {
            setStatus('error');
            setErrorMessage('GPS acquisition timed out. Ensure location services are enabled on your device.');
          } else {
            setStatus('error');
            setErrorMessage(err.message || 'Error acquiring real GPS coordinates.');
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const startLiveTracking = () => {
    if (isTracking) return;

    if (!navigator.geolocation) {
      setStatus('unsupported');
      setErrorMessage('Geolocation hardware/API is not supported by this browser.');
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const livePos: RealGpsPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
          altitudeMeters: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
          headingDegrees: pos.coords.heading ? Math.round(pos.coords.heading) : null,
          timestamp: pos.timestamp,
          isSimulated: false,
        };
        setPosition(livePos);
        setStatus('active');
        setIsTracking(true);
      },
      (err) => {
        setIsTracking(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMessage(
            'Live GPS permission denied. Geolocation requires HTTPS or localhost and explicit user permission.'
          );
        } else {
          setStatus('error');
          setErrorMessage('Live GPS tracking encountered an error.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = id;
  };

  const toggleLiveTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startLiveTracking();
    }
  };

  const setPresetGps = (presetName: string) => {
    const preset = BENGALURU_GPS_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);

    const simulatedPos: RealGpsPosition = {
      lat: preset.lat,
      lng: preset.lng,
      accuracyMeters: 8,
      timestamp: Date.now(),
      isSimulated: true,
      presetName: preset.label,
    };

    setPosition(simulatedPos);
    setStatus('active');
    setErrorMessage(null);
  };

  const clearGps = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setPosition(null);
    setStatus('idle');
    setErrorMessage(null);
  };

  const isInsideBengaluru = position
    ? isCoordinateInBengaluru(position.lat, position.lng)
    : true;

  return (
    <GpsContext.Provider
      value={{
        position,
        nearestStop,
        status,
        isTracking,
        isInsideBengaluru,
        errorMessage,
        requestRealGps,
        startLiveTracking,
        stopTracking,
        toggleLiveTracking,
        setPresetGps,
        clearGps,
      }}
    >
      {children}
    </GpsContext.Provider>
  );
};

export const useRealGps = () => {
  const context = useContext(GpsContext);
  if (!context) {
    throw new Error('useRealGps must be used within a GpsProvider');
  }
  return context;
};
