/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BENGALURU_LOCALITIES } from '../data/bengaluruLocalities';
import {
  LocalityInfo,
  NearbyStopMatch,
  SearchSuggestion,
  Stop,
} from '../types';
import { getAllActiveRoutes, getAllActiveStops } from './gtfsEngine';
import { searchPlaces } from './routingService';

/**
 * Normalizes text for matching: lowercases, trims extra spaces, removes punctuation
 */
export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

const GENERIC_SUFFIXES = new Set([
  'stop',
  'bus',
  'station',
  'city',
  'road',
  'cross',
  'circle',
  'gate',
  'layout',
  'nagar',
  'market',
  'main',
  'town',
  'junction',
  'flyover',
  'terminal',
]);

/**
 * Checks fuzzy similarity between query and candidate string
 */
export function isFuzzyMatch(query: string, candidate: string): boolean {
  const q = normalizeQuery(query);
  const c = normalizeQuery(candidate);

  if (c.includes(q) || q.includes(c)) return true;

  // Words breakdown
  const qWords = q.split(' ').filter((w) => w.length > 0);
  const cWords = c.split(' ').filter((w) => w.length > 0);

  // If query is multiple words, check if key distinctive words match
  const distinctiveQWords = qWords.filter((w) => !GENERIC_SUFFIXES.has(w) && w.length >= 3);

  if (distinctiveQWords.length > 0) {
    let matchedDistinctive = false;
    for (const qw of distinctiveQWords) {
      for (const cw of cWords) {
        if (cw === qw) {
          matchedDistinctive = true;
          break;
        }
        if (cw.length >= 4 && qw.length >= 4 && (cw.startsWith(qw) || qw.startsWith(cw))) {
          matchedDistinctive = true;
          break;
        }
        if (cw.length >= 4 && qw.length >= 4) {
          const dist = levenshteinDistance(qw, cw);
          if (dist <= 2) {
            matchedDistinctive = true;
            break;
          }
        }
      }
      if (matchedDistinctive) break;
    }
    if (matchedDistinctive) return true;
  } else {
    // If only stopwords or single short word in query, match directly
    for (const qw of qWords) {
      if (qw.length < 3) continue;
      for (const cw of cWords) {
        if (cw === qw) return true;
      }
    }
  }

  // Full string edit distance
  if (q.length >= 4 && c.length >= 4) {
    const dist = levenshteinDistance(q, c);
    const maxLen = Math.max(q.length, c.length);
    if (dist <= 2 || dist / maxLen <= 0.22) {
      return true;
    }
  }

  return false;
}

/**
 * Finds all routes serving a specific stop ID
 */
export function getRoutesServingStop(stopId: string): string[] {
  const routes = getAllActiveRoutes();
  const matchedRouteNumbers: string[] = [];
  for (const r of routes) {
    if (r.stops.some((s) => s.stopId === stopId)) {
      matchedRouteNumbers.push(r.routeNumber);
    }
  }
  return Array.from(new Set(matchedRouteNumbers));
}

/**
 * Calculates Haversine distance in kilometers
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Resolves a locality to nearby verified BMTC stops
 */
export function resolveLocalityNearbyStops(
  locality: LocalityInfo,
  maxRadiusKm = 3.2
): NearbyStopMatch[] {
  const allStops = getAllActiveStops();
  const matches: NearbyStopMatch[] = [];

  for (const s of allStops) {
    const dist = calculateHaversineKm(locality.lat, locality.lng, s.lat, s.lng);
    const isExplicitlyLinked = locality.nearbyStopIds.includes(s.id);

    if (dist <= maxRadiusKm || isExplicitlyLinked) {
      const routes = getRoutesServingStop(s.id);
      // Walking time at ~4.8 km/h = ~12.5 mins per km
      const walkingMinutes = Math.max(1, Math.round(dist * 12.5));
      matches.push({
        stop: s,
        distanceKm: dist,
        walkingMinutes,
        routesServing: routes,
      });
    }
  }

  // Sort by proximity
  matches.sort((a, b) => a.distanceKm - b.distanceKm);
  return matches;
}

/**
 * Provides comprehensive autocomplete suggestions as user types
 */
export function getSmartDestinationSuggestions(query: string, limit = 8): SearchSuggestion[] {
  if (!query || query.trim().length === 0) {
    // Default: major transit interchange hubs
    const allStops = getAllActiveStops();
    return allStops
      .filter((s) => s.isInterchangeHub)
      .slice(0, limit)
      .map((s) => ({
        id: `stop_${s.id}`,
        title: s.name,
        subtitle: `${s.kannadaName} · Major Transit Hub`,
        type: s.isImported ? 'imported_gtfs_stop' : 'bmtc_stop',
        badgeLabel: s.isImported ? 'Imported GTFS Stop' : 'BMTC Bus Stop',
        lat: s.lat,
        lng: s.lng,
        stop: s,
        code: s.code,
      }));
  }

  const q = normalizeQuery(query);
  const results: SearchSuggestion[] = [];
  const seenIds = new Set<string>();

  // 1. Check Localities & Neighborhoods (including aliases: e.g. "amruthalli" -> Amruthahalli)
  for (const loc of BENGALURU_LOCALITIES) {
    const nameMatch = isFuzzyMatch(q, loc.name) || normalizeQuery(loc.name).includes(q);
    const aliasMatch = loc.aliases.some((alias) => isFuzzyMatch(q, alias) || alias.includes(q));

    if (nameMatch || aliasMatch) {
      const id = `loc_${loc.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          title: loc.name,
          subtitle: `${loc.kannadaName} · ${loc.zone} Bengaluru Area`,
          type: 'locality',
          badgeLabel: 'Locality / Area',
          lat: loc.lat,
          lng: loc.lng,
          locality: loc,
        });
      }
    }
  }

  // 2. Check BMTC Stops (by name, kannadaName, stop code, or landmarks)
  const allStops = getAllActiveStops();
  for (const s of allStops) {
    const sNameNorm = normalizeQuery(s.name);
    const codeMatch = s.code.toLowerCase().includes(q);
    const nameMatch = isFuzzyMatch(q, s.name) || sNameNorm.includes(q);
    const kannadaMatch = s.kannadaName.includes(query.trim());
    const landmarkMatch = s.landmarks.some(
      (lm) => isFuzzyMatch(q, lm) || normalizeQuery(lm).includes(q)
    );

    if (nameMatch || codeMatch || kannadaMatch || landmarkMatch) {
      const id = `stop_${s.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          title: s.name,
          subtitle: `${s.kannadaName} · Code: ${s.code}`,
          type: s.isImported ? 'imported_gtfs_stop' : 'bmtc_stop',
          badgeLabel: s.isImported ? 'Imported GTFS Stop' : 'BMTC Bus Stop',
          lat: s.lat,
          lng: s.lng,
          stop: s,
          code: s.code,
        });
      }
    }
  }

  // Score and sort results by relevance
  results.sort((a, b) => {
    const aNorm = normalizeQuery(a.title);
    const bNorm = normalizeQuery(b.title);

    const aExact = aNorm === q;
    const bExact = bNorm === q;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStarts = aNorm.startsWith(q);
    const bStarts = bNorm.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    const aContains = aNorm.includes(q);
    const bContains = bNorm.includes(q);
    if (aContains && !bContains) return -1;
    if (!aContains && bContains) return 1;

    return 0;
  });

  // Return best matches up to limit
  return results.slice(0, limit);
}

/**
 * Resolves any query string (stop name, locality name, or typo) to a concrete Stop or Locality
 */
export function resolveLocationQuery(query: string): {
  type: 'stop' | 'locality' | 'unknown';
  stop?: Stop;
  locality?: LocalityInfo;
  nearbyStops?: NearbyStopMatch[];
} {
  if (!query || !query.trim()) return { type: 'unknown' };
  const q = normalizeQuery(query);

  const allStops = getAllActiveStops();

  // 1. Direct Stop exact match
  const exactStop = allStops.find(
    (s) =>
      s.id.toLowerCase() === q ||
      s.code.toLowerCase() === q ||
      normalizeQuery(s.name) === q
  );
  if (exactStop) {
    return { type: 'stop', stop: exactStop };
  }

  // 2. Exact Locality match or alias match (e.g. "amruthalli" -> locality_amruthahalli)
  const matchedLocality = BENGALURU_LOCALITIES.find(
    (l) =>
      normalizeQuery(l.name) === q ||
      l.aliases.some((alias) => normalizeQuery(alias) === q) ||
      isFuzzyMatch(q, l.name)
  );

  if (matchedLocality) {
    const nearby = resolveLocalityNearbyStops(matchedLocality);
    return {
      type: 'locality',
      locality: matchedLocality,
      nearbyStops: nearby,
      stop: nearby[0]?.stop, // Default to closest BMTC stop
    };
  }

  // 3. Partial stop match
  const partialStop = allStops.find(
    (s) =>
      normalizeQuery(s.name).includes(q) ||
      isFuzzyMatch(q, s.name) ||
      s.landmarks.some((lm) => isFuzzyMatch(q, lm))
  );

  if (partialStop) {
    return { type: 'stop', stop: partialStop };
  }

  return { type: 'unknown' };
}
