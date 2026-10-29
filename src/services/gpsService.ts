/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAllActiveStops } from './gtfsEngine';
import { calculateHaversineDistance } from './journeyEngine';
import { Stop } from '../types';

export interface RealGpsPosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
  altitudeMeters?: number | null;
  speedKmh?: number | null;
  headingDegrees?: number | null;
  timestamp: number;
  isSimulated?: boolean;
  presetName?: string;
}

export interface NearestStopMatch {
  stop: Stop;
  distanceKm: number;
  distanceMeters: number;
  walkingMinutes: number;
}

// Bengaluru metropolitan bounding box
export const BENGALURU_BOUNDS = {
  minLat: 12.75,
  maxLat: 13.35,
  minLng: 77.35,
  maxLng: 77.85,
};

/**
 * Checks if a coordinate is within Greater Bengaluru
 */
export function isCoordinateInBengaluru(lat: number, lng: number): boolean {
  return (
    lat >= BENGALURU_BOUNDS.minLat &&
    lat <= BENGALURU_BOUNDS.maxLat &&
    lng >= BENGALURU_BOUNDS.minLng &&
    lng <= BENGALURU_BOUNDS.maxLng
  );
}

/**
 * Finds the nearest BMTC bus stop to any given GPS coordinate
 */
export function findNearestBmtcStop(lat: number, lng: number): NearestStopMatch {
  const allStops = getAllActiveStops();
  let closestStop = allStops[0];
  let minDistance = calculateHaversineDistance(lat, lng, closestStop.lat, closestStop.lng);

  for (let i = 1; i < allStops.length; i++) {
    const s = allStops[i];
    const dist = calculateHaversineDistance(lat, lng, s.lat, s.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestStop = s;
    }
  }

  const distanceMeters = Math.round(minDistance * 1000);
  // Average urban walking speed: 4.8 km/h (~80 meters/minute)
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 80));

  return {
    stop: closestStop,
    distanceKm: Math.round(minDistance * 10) / 10,
    distanceMeters,
    walkingMinutes,
  };
}

/**
 * Pre-calibrated Bengaluru GPS Presets
 * Allows hackathon evaluators and indoor desktop computers without a GPS chip
 * to test real-world GPS behavior seamlessly.
 */
export const BENGALURU_GPS_PRESETS: {
  name: string;
  label: string;
  lat: number;
  lng: number;
  description: string;
}[] = [
  {
    name: 'hebbal_flyover',
    label: 'Hebbal Flyover (North Hub)',
    lat: 13.0362,
    lng: 77.5975,
    description: '140m from Hebbal BMTC Bus Station',
  },
  {
    name: 'mg_road_metro',
    label: 'MG Road / Brigade Road',
    lat: 12.9751,
    lng: 77.6074,
    description: '90m from MG Road Metro Stop',
  },
  {
    name: 'majestic_station',
    label: 'KSR Majestic Railway Station',
    lat: 12.9781,
    lng: 77.5695,
    description: '210m from Kempegowda Bus Station',
  },
  {
    name: 'silk_board_junction',
    label: 'Central Silk Board Flyover',
    lat: 12.9172,
    lng: 77.6231,
    description: '80m from Central Silk Board Bus Bay',
  },
  {
    name: 'itpl_whitefield',
    label: 'ITPL Tech Park Gate 1',
    lat: 12.9862,
    lng: 77.7374,
    description: '110m from ITPL Whitefield Bus Terminal',
  },
  {
    name: 'manyata_tech_park',
    label: 'Manyata Embassy Business Park',
    lat: 13.0455,
    lng: 77.622,
    description: '350m from Nagavara Junction Stop',
  },
];
