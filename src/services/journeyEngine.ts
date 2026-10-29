/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BusRoute,
  JourneyLeg,
  JourneyPlan,
  LocalityInfo,
  NearbyStopMatch,
  RouteStop,
  Stop,
} from '../types';
import {
  calculateHaversineKm,
  getSmartDestinationSuggestions,
  resolveLocationQuery,
  resolveLocalityNearbyStops,
} from './bengaluruSearchEngine';
import {
  getAllActiveRoutes,
  getAllActiveStops,
  searchGtfsJourneys,
} from './gtfsEngine';

export { calculateHaversineKm };
export const calculateHaversineDistance = calculateHaversineKm;

/**
 * Legacy stop finder for backwards compatibility, wired to the smart resolution engine
 */
export function findStop(query: string): Stop | undefined {
  const res = resolveLocationQuery(query);
  return res.stop;
}

/**
 * Autocomplete suggestions for stops and localities
 */
export function getStopSuggestions(query: string, limit = 8) {
  return getSmartDestinationSuggestions(query, limit);
}

/**
 * Calculates estimated BMTC fare based on travel distance and service type
 */
export function calculateBmtcFare(distanceKm: number, serviceType: string): number {
  if (serviceType.includes('Airport') || serviceType.includes('Vayu Vajra')) {
    if (distanceKm > 25) return 260;
    if (distanceKm > 15) return 210;
    return 160;
  }
  if (serviceType.includes('Vajra') || serviceType.includes('Volvo')) {
    if (distanceKm <= 4) return 20;
    if (distanceKm <= 8) return 35;
    if (distanceKm <= 15) return 50;
    if (distanceKm <= 22) return 65;
    return 75;
  }
  if (serviceType.includes('Feeder')) {
    return Math.min(15, Math.max(10, Math.round(distanceKm * 2.5)));
  }
  // Standard Ordinary / Suvarna bus stages
  if (distanceKm <= 2) return 6;
  if (distanceKm <= 5) return 12;
  if (distanceKm <= 10) return 18;
  if (distanceKm <= 16) return 22;
  if (distanceKm <= 22) return 25;
  if (distanceKm <= 30) return 30;
  return 35;
}

/**
 * Core journey routing engine using GTFS relationships
 */
export function findJourneys(
  startNameOrId: string,
  destNameOrId: string,
  explicitDestStopId?: string
): {
  plans: JourneyPlan[];
  resolvedStartStop?: Stop;
  resolvedDestStop?: Stop;
  resolvedStartLocality?: LocalityInfo;
  resolvedDestLocality?: LocalityInfo;
  localityNearbyStops?: NearbyStopMatch[];
  warningMessage?: string;
} {
  const startRes = resolveLocationQuery(startNameOrId);
  const destRes = resolveLocationQuery(destNameOrId);

  const startStop = startRes.stop;
  let destStop = destRes.stop;

  // If user selected an explicit stop from the locality stops list
  if (explicitDestStopId) {
    const allStops = getAllActiveStops();
    const explicit = allStops.find((s) => s.id === explicitDestStopId);
    if (explicit) {
      destStop = explicit;
    }
  }

  if (!startStop || !destStop) {
    return {
      plans: [],
      resolvedStartStop: startStop,
      resolvedDestStop: destStop,
      resolvedStartLocality: startRes.locality,
      resolvedDestLocality: destRes.locality,
      localityNearbyStops: destRes.nearbyStops,
      warningMessage: !destStop
        ? `Destination "${destNameOrId}" could not be resolved to a BMTC stop or known locality. Try typing "Amruthahalli", "Hebbal", or "Majestic".`
        : `Starting point "${startNameOrId}" could not be resolved to a BMTC stop.`,
    };
  }

  if (startStop.id === destStop.id) {
    return {
      plans: [],
      resolvedStartStop: startStop,
      resolvedDestStop: destStop,
      resolvedStartLocality: startRes.locality,
      resolvedDestLocality: destRes.locality,
      localityNearbyStops: destRes.nearbyStops,
      warningMessage: 'Starting stop and destination stop are identical.',
    };
  }

  // Execute GTFS search
  let plans = searchGtfsJourneys(startStop.id, destStop.id);

  // If no direct or transfer journey between exact primary stops, but destination is a locality,
  // try finding connections via other nearby stops serving the locality (e.g. Amruthahalli Cross vs Amruthahalli Bus Stop)
  if (plans.length === 0 && destRes.locality && destRes.nearbyStops) {
    for (const altMatch of destRes.nearbyStops) {
      if (altMatch.stop.id !== destStop.id) {
        const altPlans = searchGtfsJourneys(startStop.id, altMatch.stop.id);
        if (altPlans.length > 0) {
          plans = altPlans;
          destStop = altMatch.stop;
          break;
        }
      }
    }
  }

  return {
    plans,
    resolvedStartStop: startStop,
    resolvedDestStop: destStop,
    resolvedStartLocality: startRes.locality,
    resolvedDestLocality: destRes.locality,
    localityNearbyStops: destRes.nearbyStops,
  };
}

/**
 * BMTC Official Transit Pass & Fare Details
 * Replaces invented ride-hail options with genuine BMTC fare categories
 */
export interface BmtcFarePassInfo {
  category: string;
  priceDisplay: string;
  eligibility: string;
  applicableServices: string;
  notes: string;
}

export function getBmtcFareAndPassGuidelines(): BmtcFarePassInfo[] {
  return [
    {
      category: 'Ordinary Bus Single Journey Ticket',
      priceDisplay: '₹6 – ₹35',
      eligibility: 'All General Commuters',
      applicableServices: 'Ordinary, Suvarna, E-Bus non-AC services',
      notes: 'Based on distance stages (Stage 1 ₹6 up to Stage 15+ ₹35). Digital UPI / Tummoc ticketing accepted.',
    },
    {
      category: 'Shakti Scheme (Women Free Travel)',
      priceDisplay: '₹0 (100% Free)',
      eligibility: 'Female residents of Karnataka',
      applicableServices: 'All Ordinary, Suvarna, and non-AC E-Buses',
      notes: 'Requires Karnataka state government photo ID proof (Aadhaar / Voter ID) upon boarding.',
    },
    {
      category: 'BMTC Daily Commuter Pass (Ordinary)',
      priceDisplay: '₹70 / day',
      eligibility: 'All Passengers',
      applicableServices: 'Unlimited travel on all Ordinary/Suvarna buses for 1 calendar day',
      notes: 'Available from conductors or Tummoc app with valid ID proof.',
    },
    {
      category: 'BMTC Vajra (Volvo AC) Single Ticket',
      priceDisplay: '₹20 – ₹75',
      eligibility: 'All Passengers',
      applicableServices: 'Vajra Volvo AC urban routes (e.g. 335-E, 500-D AC)',
      notes: 'Comfortable air-conditioned city travel with dynamic frequency.',
    },
    {
      category: 'BMTC Vajra (Volvo AC) Daily Pass',
      priceDisplay: '₹140 / day',
      eligibility: 'All Passengers',
      applicableServices: 'Unlimited rides on both Ordinary and Vajra Volvo AC services',
      notes: 'Not valid on Vayu Vajra Airport services.',
    },
    {
      category: 'Vayu Vajra (Airport AC) Ticket',
      priceDisplay: '₹160 – ₹260',
      eligibility: 'Airport Commuters',
      applicableServices: 'KIA series buses directly serving BLR Airport (e.g. KIA-9, KIA-4)',
      notes: 'Round-the-clock 24/7 dedicated luggage luggage bays and high-speed expressway travel.',
    },
  ];
}
