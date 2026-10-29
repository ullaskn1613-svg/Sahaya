/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STOPS } from '../data/bmtcData';
import { Stop } from '../types';
import { calculateHaversineDistance } from './journeyEngine';

export interface LocationPreset {
  id: string;
  name: string;
  zone: 'North' | 'South' | 'East' | 'West' | 'Central';
  lat: number;
  lng: number;
  description: string;
}

export const BENGALURU_LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'hebbal_hub',
    name: 'Hebbal (North Corridor)',
    zone: 'North',
    lat: 13.0358,
    lng: 77.597,
    description: 'Near Hebbal Flyover & Manyata Tech Park corridor',
  },
  {
    id: 'majestic_center',
    name: 'Majestic (City Center)',
    zone: 'Central',
    lat: 12.9772,
    lng: 77.5713,
    description: 'Near Kempegowda Bus Station & KSR Railway Station',
  },
  {
    id: 'silk_board_south',
    name: 'Central Silk Board',
    zone: 'South',
    lat: 12.9176,
    lng: 77.6238,
    description: 'Near Outer Ring Road & Hosur Road Junction',
  },
  {
    id: 'indiranagar_east',
    name: 'Indiranagar 100ft Road',
    zone: 'East',
    lat: 12.9784,
    lng: 77.6408,
    description: 'Near Indiranagar Metro Station & CMH Road',
  },
  {
    id: 'whitefield_tech',
    name: 'Whitefield (ITPL)',
    zone: 'East',
    lat: 12.9868,
    lng: 77.7381,
    description: 'Near International Tech Park & Hope Farm',
  },
  {
    id: 'electronic_city_gate',
    name: 'Electronic City Toll',
    zone: 'South',
    lat: 12.8452,
    lng: 77.6602,
    description: 'Near Infosys & Wipro Phase 1 Flyover',
  },
  {
    id: 'shivajinagar_cantonment',
    name: 'Shivajinagar Bus Station',
    zone: 'Central',
    lat: 12.9857,
    lng: 77.6058,
    description: 'Near Russell Market & Commercial Street',
  },
  {
    id: 'yeshwanthpur_ttmc',
    name: 'Yeshwanthpur TTMC',
    zone: 'West',
    lat: 13.0232,
    lng: 77.5502,
    description: 'Near Yeshwanthpur Railway Station & Malleshwaram',
  },
];

export interface GeoLocationResult {
  lat: number;
  lng: number;
  source: 'gps' | 'preset' | 'ip_approx';
  label?: string;
  isWithinBengaluru: boolean;
  distanceToBengaluruCenterKm: number;
}

// Bengaluru center coordinates approx (Vidhana Soudha / MG Road)
const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

/**
 * Checks whether given coordinates are approximately within Greater Bengaluru
 */
export function checkIsWithinBengaluru(lat: number, lng: number): {
  isWithin: boolean;
  distanceKm: number;
} {
  const dist = calculateHaversineDistance(lat, lng, BENGALURU_CENTER.lat, BENGALURU_CENTER.lng);
  // Within 45km of city center
  return {
    isWithin: dist <= 45,
    distanceKm: dist,
  };
}

/**
 * Finds the closest BMTC stop to any given coordinate
 */
export function findNearestStop(
  lat: number,
  lng: number
): { stop: Stop; distanceKm: number } | null {
  if (STOPS.length === 0) return null;

  let nearestStop = STOPS[0];
  let minDistance = calculateHaversineDistance(lat, lng, nearestStop.lat, nearestStop.lng);

  for (let i = 1; i < STOPS.length; i++) {
    const s = STOPS[i];
    const d = calculateHaversineDistance(lat, lng, s.lat, s.lng);
    if (d < minDistance) {
      minDistance = d;
      nearestStop = s;
    }
  }

  return {
    stop: nearestStop,
    distanceKm: minDistance,
  };
}

/**
 * Attempts real browser GPS with fast timeout & low-power cache fallback
 */
export function requestBrowserLocation(): Promise<GeoLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your current browser environment.'));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const { isWithin, distanceKm } = checkIsWithinBengaluru(latitude, longitude);

      resolve({
        lat: latitude,
        lng: longitude,
        source: 'gps',
        label: isWithin ? 'Live Browser GPS' : `GPS (${distanceKm} km from Bengaluru)`,
        isWithinBengaluru: isWithin,
        distanceToBengaluruCenterKm: distanceKm,
      });
    };

    const handleFailure = (err: GeolocationPositionError) => {
      let message = 'Unable to acquire location.';
      if (err.code === 1) {
        message = 'Location permission was denied. (If using an embedded preview or restricted browser, try clicking a Bengaluru Commuter Location below).';
      } else if (err.code === 2) {
        message = 'Position unavailable. Your device or network cannot determine geographic coordinates.';
      } else if (err.code === 3) {
        message = 'Location request timed out. Your device GPS satellite or Wi-Fi lookup took too long.';
      }
      reject(new Error(message));
    };

    // First attempt with cached/faster settings
    navigator.geolocation.getCurrentPosition(handleSuccess, (err) => {
      // If error occurs, attempt a relaxed retry with maximumAge cache
      navigator.geolocation.getCurrentPosition(handleSuccess, handleFailure, {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 600000, // 10 minutes cache
      });
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 120000, // 2 minutes cache
    });
  });
}
