/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { BUS_ROUTES, DATASET_METADATA, STOPS } from '../data/bmtcData';
import {
  BusRoute,
  GtfsDataset,
  GtfsRoute,
  GtfsStop,
  GtfsStopTime,
  GtfsTrip,
  JourneyLeg,
  JourneyPlan,
  RouteStop,
  Stop,
} from '../types';

const GTFS_STORAGE_KEY = 'sahaya_bmtc_imported_gtfs_v1';

/**
 * Parses simple CSV content handling quoted fields and CRLF/LF line endings
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCsvLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      for (let h = 0; h < headers.length; h++) {
        row[headers[h].trim()] = values[h].trim();
      }
      records.push(row);
    }
  }
  return records;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Generates synthetic GTFS specification compliant records from built-in data
 */
function createBuiltinGtfsDataset(): GtfsDataset {
  const gtfsStops: GtfsStop[] = STOPS.map((s) => ({
    stop_id: s.id,
    stop_code: s.code,
    stop_name: s.name,
    stop_lat: s.lat,
    stop_lon: s.lng,
    zone_id: s.zone,
    stop_desc: s.landmarks.join(', '),
  }));

  const gtfsRoutes: GtfsRoute[] = BUS_ROUTES.map((r) => ({
    route_id: r.id,
    route_short_name: r.routeNumber,
    route_long_name: r.routeName,
    route_type: 3, // Bus
    route_color: r.serviceType.includes('Airport')
      ? '008080'
      : r.serviceType.includes('Vajra')
      ? '1E3A8A'
      : '0284C7',
  }));

  const gtfsTrips: GtfsTrip[] = [];
  const gtfsStopTimes: GtfsStopTime[] = [];

  BUS_ROUTES.forEach((r, idx) => {
    const tripId = `trip_${r.id}_01`;
    gtfsTrips.push({
      trip_id: tripId,
      route_id: r.id,
      trip_headsign: r.destinationStopName,
      direction_id: idx % 2 === 0 ? 0 : 1,
    });

    r.stops.forEach((st) => {
      const minutes = st.scheduledMinutesFromStart;
      const hours = Math.floor(minutes / 60) + 6;
      const mins = minutes % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

      gtfsStopTimes.push({
        trip_id: tripId,
        stop_id: st.stopId,
        stop_sequence: st.sequence,
        arrival_time: timeStr,
        departure_time: timeStr,
      });
    });
  });

  return {
    metadata: {
      title: DATASET_METADATA.title,
      source: DATASET_METADATA.source,
      isVerified: DATASET_METADATA.isVerified,
      badge: DATASET_METADATA.badge,
      totalRoutes: gtfsRoutes.length,
      totalStops: gtfsStops.length,
      totalTrips: gtfsTrips.length,
      totalStopTimes: gtfsStopTimes.length,
      hasShapes: false,
    },
    routes: gtfsRoutes,
    stops: gtfsStops,
    trips: gtfsTrips,
    stopTimes: gtfsStopTimes,
  };
}

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

// In-Memory active dataset
let activeGtfsDataset: GtfsDataset = loadInitialGtfsDataset();

// Graph indexes
let stopsById = new Map<string, GtfsStop>();
let routesById = new Map<string, GtfsRoute>();
let tripsById = new Map<string, GtfsTrip>();
let tripStopTimes = new Map<string, GtfsStopTime[]>();
let stopToTrips = new Map<string, Set<string>>();

rebuildGtfsGraphIndexes();

function loadInitialGtfsDataset(): GtfsDataset {
  try {
    const saved = safeGetStorage(GTFS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.routes && parsed.stops && parsed.trips && parsed.stopTimes) {
        return parsed;
      }
    }
  } catch (e) {
    // LocalStorage read error fallback
  }
  return createBuiltinGtfsDataset();
}

export function rebuildGtfsGraphIndexes(): void {
  stopsById.clear();
  routesById.clear();
  tripsById.clear();
  tripStopTimes.clear();
  stopToTrips.clear();

  activeGtfsDataset.stops.forEach((s) => stopsById.set(s.stop_id, s));
  activeGtfsDataset.routes.forEach((r) => routesById.set(r.route_id, r));
  activeGtfsDataset.trips.forEach((t) => tripsById.set(t.trip_id, t));

  activeGtfsDataset.stopTimes.forEach((st) => {
    // By trip
    if (!tripStopTimes.has(st.trip_id)) {
      tripStopTimes.set(st.trip_id, []);
    }
    tripStopTimes.get(st.trip_id)!.push(st);

    // By stop
    if (!stopToTrips.has(st.stop_id)) {
      stopToTrips.set(st.stop_id, new Set<string>());
    }
    stopToTrips.get(st.stop_id)!.add(st.trip_id);
  });

  // Sort each trip's stop times by sequence
  tripStopTimes.forEach((times) => {
    times.sort((a, b) => a.stop_sequence - b.stop_sequence);
  });
}

/**
 * Returns current active dataset status
 */
export function getActiveDatasetInfo() {
  const isCustom = safeGetStorage(GTFS_STORAGE_KEY) !== null;
  return {
    ...activeGtfsDataset.metadata,
    isCustomImport: isCustom,
    activeRoutesCount: activeGtfsDataset.routes.length,
    activeStopsCount: activeGtfsDataset.stops.length,
    activeTripsCount: activeGtfsDataset.trips.length,
    activeStopTimesCount: activeGtfsDataset.stopTimes.length,
  };
}

/**
 * Returns all active stops formatted as standard Stop objects
 */
export function getAllActiveStops(): Stop[] {
  return activeGtfsDataset.stops.map((s) => {
    const original = STOPS.find((orig) => orig.id === s.stop_id);
    return {
      id: s.stop_id,
      name: s.stop_name,
      kannadaName: original ? original.kannadaName : s.stop_name,
      code: s.stop_code || s.stop_id.slice(-6).toUpperCase(),
      zone: (s.zone_id as any) || (original ? original.zone : 'Central'),
      lat: s.stop_lat,
      lng: s.stop_lon,
      landmarks: original ? original.landmarks : s.stop_desc ? [s.stop_desc] : [],
      isInterchangeHub: original?.isInterchangeHub || stopToTrips.get(s.stop_id)?.size! > 4,
      shelterAvailable: original?.shelterAvailable ?? true,
      isImported: !original,
    };
  });
}

/**
 * Returns all active routes formatted as standard BusRoute objects
 */
export function getAllActiveRoutes(): BusRoute[] {
  const result: BusRoute[] = [];

  for (const r of activeGtfsDataset.routes) {
    // Find representative trip
    const tripsForRoute = activeGtfsDataset.trips.filter((t) => t.route_id === r.route_id);
    if (tripsForRoute.length === 0) continue;

    const repTrip = tripsForRoute[0];
    const times = tripStopTimes.get(repTrip.trip_id) || [];
    if (times.length < 2) continue;

    const originStopId = times[0].stop_id;
    const destStopId = times[times.length - 1].stop_id;
    const originStop = stopsById.get(originStopId);
    const destStop = stopsById.get(destStopId);

    const originalRoute = BUS_ROUTES.find(
      (b) => b.id === r.route_id || b.routeNumber === r.route_short_name
    );

    const stops: RouteStop[] = times.map((t, idx) => {
      const stop = stopsById.get(t.stop_id);
      return {
        stopId: t.stop_id,
        stopName: stop ? stop.stop_name : t.stop_id,
        sequence: t.stop_sequence,
        stageNumber: idx + 1,
        scheduledMinutesFromStart: idx * 4,
      };
    });

    result.push({
      id: r.route_id,
      routeNumber: r.route_short_name || r.route_id,
      routeName: r.route_long_name || `${originStop?.stop_name} to ${destStop?.stop_name}`,
      serviceType: originalRoute
        ? originalRoute.serviceType
        : r.route_short_name.startsWith('KIA')
        ? 'Vayu Vajra (Airport AC)'
        : r.route_short_name.endsWith('E') || r.route_short_name.startsWith('V-')
        ? 'Vajra (Volvo AC)'
        : 'Ordinary (Suvarna / E-Bus)',
      originStopId,
      destinationStopId: destStopId,
      originStopName: originStop ? originStop.stop_name : 'Origin',
      destinationStopName: destStop ? destStop.stop_name : 'Destination',
      frequencyMinutes: originalRoute ? originalRoute.frequencyMinutes : 15,
      firstBus: originalRoute ? originalRoute.firstBus : '05:30',
      lastBus: originalRoute ? originalRoute.lastBus : '22:30',
      totalDistanceKm: originalRoute
        ? originalRoute.totalDistanceKm
        : Math.round(times.length * 1.8 * 10) / 10,
      averageTravelMinutes: originalRoute ? originalRoute.averageTravelMinutes : times.length * 4,
      baseFareInr: originalRoute ? originalRoute.baseFareInr : 25,
      stops,
      isImported: !originalRoute,
    });
  }

  return result;
}

/**
 * Searches journeys directly from GTFS trips and stop times
 */
export function searchGtfsJourneys(
  originStopId: string,
  destStopId: string
): JourneyPlan[] {
  if (originStopId === destStopId) return [];

  const originStop = stopsById.get(originStopId);
  const destStop = stopsById.get(destStopId);
  if (!originStop || !destStop) return [];

  const allStops = getAllActiveStops();
  const stopMap = new Map(allStops.map((s) => [s.id, s]));

  const plans: JourneyPlan[] = [];
  const originTrips = stopToTrips.get(originStopId) || new Set<string>();
  const destTrips = stopToTrips.get(destStopId) || new Set<string>();

  // 1. Direct GTFS Journeys
  const directTrips = Array.from(originTrips).filter((tid) => destTrips.has(tid));

  const seenRoutes = new Set<string>();

  for (const tripId of directTrips) {
    const trip = tripsById.get(tripId);
    if (!trip) continue;
    const route = routesById.get(trip.route_id);
    if (!route) continue;

    // Avoid duplicate route numbers in direct results
    if (seenRoutes.has(route.route_short_name)) continue;

    const times = tripStopTimes.get(tripId) || [];
    const originIdx = times.findIndex((t) => t.stop_id === originStopId);
    const destIdx = times.findIndex((t) => t.stop_id === destStopId);

    // Ensure direction: Origin visited before Destination
    if (originIdx !== -1 && destIdx !== -1 && originIdx < destIdx) {
      seenRoutes.add(route.route_short_name);

      const segmentTimes = times.slice(originIdx, destIdx + 1);
      const intermediateStops: RouteStop[] = segmentTimes.map((t, idx) => {
        const s = stopsById.get(t.stop_id);
        return {
          stopId: t.stop_id,
          stopName: s ? s.stop_name : t.stop_id,
          sequence: t.stop_sequence,
          stageNumber: idx + 1,
          scheduledMinutesFromStart: idx * 4,
        };
      });

      const distKm = Math.max(
        1.5,
        Math.round(calculateHaversine(originStop.stop_lat, originStop.stop_lon, destStop.stop_lat, destStop.stop_lon) * 1.25 * 10) / 10
      );

      const durationMinutes = Math.max(12, (destIdx - originIdx) * 4);
      const isAirport = route.route_short_name.startsWith('KIA');
      const isAc = route.route_short_name.endsWith('E') || route.route_short_name.startsWith('V-');
      const fare = isAirport ? 260 : isAc ? 65 : calculateOrdinaryFare(distKm);

      const leg: JourneyLeg = {
        type: 'transit',
        route: {
          id: route.route_id,
          routeNumber: route.route_short_name || route.route_id,
          routeName: route.route_long_name || `${originStop.stop_name} to ${destStop.stop_name}`,
          serviceType: isAirport
            ? 'Vayu Vajra (Airport AC)'
            : isAc
            ? 'Vajra (Volvo AC)'
            : 'Ordinary (Suvarna / E-Bus)',
          originStopId,
          destinationStopId: destStopId,
          originStopName: originStop.stop_name,
          destinationStopName: destStop.stop_name,
          frequencyMinutes: 12,
          firstBus: '05:30',
          lastBus: '22:30',
          totalDistanceKm: distKm,
          averageTravelMinutes: durationMinutes,
          baseFareInr: fare,
          stops: intermediateStops,
        },
        fromStop: stopMap.get(originStopId)!,
        toStop: stopMap.get(destStopId)!,
        intermediateStops,
        durationMinutes,
        distanceKm: distKm,
        fareInr: fare,
      };

      plans.push({
        id: `gtfs_direct_${route.route_short_name}_${originStopId}_${destStopId}`,
        legs: [leg],
        totalMinutes: durationMinutes,
        totalDistanceKm: distKm,
        totalFareInr: fare,
        transfersCount: 0,
        co2SavedKg: Math.round(distKm * 0.12 * 10) / 10,
        carbonEmittedKg: Math.round(distKm * 0.03 * 10) / 10,
        routesUsed: [route.route_short_name],
        primaryServiceType: leg.route!.serviceType,
        dataSourceLabel: activeGtfsDataset.metadata.badge,
        isImportedGtfs: safeGetStorage(GTFS_STORAGE_KEY) !== null,
      });
    }
  }

  // 2. 1-Transfer GTFS Journeys (if direct is empty or to offer alternatives)
  if (plans.length < 3) {
    const transferPlans = findOneTransferJourneys(
      originStopId,
      destStopId,
      originTrips,
      destTrips,
      stopMap
    );
    plans.push(...transferPlans.slice(0, 3 - plans.length));
  }

  return plans;
}

function findOneTransferJourneys(
  originStopId: string,
  destStopId: string,
  originTrips: Set<string>,
  destTrips: Set<string>,
  stopMap: Map<string, Stop>
): JourneyPlan[] {
  const transferPlans: JourneyPlan[] = [];
  const candidateInterchanges = new Map<string, { tripA: string; tripB: string }>();

  // Find candidate stops reachable from originTrips
  for (const tidA of originTrips) {
    const timesA = tripStopTimes.get(tidA) || [];
    const origIdx = timesA.findIndex((t) => t.stop_id === originStopId);
    if (origIdx === -1) continue;

    // Look at stops after origin on Trip A
    for (let i = origIdx + 1; i < timesA.length; i++) {
      const interchangeId = timesA[i].stop_id;
      if (interchangeId === destStopId) continue;

      // Check if any trip passing through Dest passes through this interchange BEFORE dest
      for (const tidB of destTrips) {
        if (tidA === tidB) continue;
        const timesB = tripStopTimes.get(tidB) || [];
        const interIdxB = timesB.findIndex((t) => t.stop_id === interchangeId);
        const destIdxB = timesB.findIndex((t) => t.stop_id === destStopId);

        if (interIdxB !== -1 && destIdxB !== -1 && interIdxB < destIdxB) {
          if (!candidateInterchanges.has(interchangeId)) {
            candidateInterchanges.set(interchangeId, { tripA: tidA, tripB: tidB });
          }
        }
      }
    }
  }

  for (const [interchangeId, { tripA: tidA, tripB: tidB }] of candidateInterchanges) {
    const tripObjA = tripsById.get(tidA);
    const tripObjB = tripsById.get(tidB);
    if (!tripObjA || !tripObjB) continue;

    const routeA = routesById.get(tripObjA.route_id);
    const routeB = routesById.get(tripObjB.route_id);
    if (!routeA || !routeB) continue;

    const originStop = stopsById.get(originStopId)!;
    const interchangeStop = stopsById.get(interchangeId)!;
    const destStop = stopsById.get(destStopId)!;

    // Segment 1
    const timesA = tripStopTimes.get(tidA)!;
    const origIdx = timesA.findIndex((t) => t.stop_id === originStopId);
    const interIdxA = timesA.findIndex((t) => t.stop_id === interchangeId);
    const segStopsA: RouteStop[] = timesA.slice(origIdx, interIdxA + 1).map((t, idx) => ({
      stopId: t.stop_id,
      stopName: stopsById.get(t.stop_id)?.stop_name || t.stop_id,
      sequence: t.stop_sequence,
      stageNumber: idx + 1,
      scheduledMinutesFromStart: idx * 4,
    }));

    // Segment 2
    const timesB = tripStopTimes.get(tidB)!;
    const interIdxB = timesB.findIndex((t) => t.stop_id === interchangeId);
    const destIdxB = timesB.findIndex((t) => t.stop_id === destStopId);
    const segStopsB: RouteStop[] = timesB.slice(interIdxB, destIdxB + 1).map((t, idx) => ({
      stopId: t.stop_id,
      stopName: stopsById.get(t.stop_id)?.stop_name || t.stop_id,
      sequence: t.stop_sequence,
      stageNumber: idx + 1,
      scheduledMinutesFromStart: idx * 4,
    }));

    const distA = Math.max(
      1.5,
      Math.round(calculateHaversine(originStop.stop_lat, originStop.stop_lon, interchangeStop.stop_lat, interchangeStop.stop_lon) * 1.25 * 10) / 10
    );
    const distB = Math.max(
      1.5,
      Math.round(calculateHaversine(interchangeStop.stop_lat, interchangeStop.stop_lon, destStop.stop_lat, destStop.stop_lon) * 1.25 * 10) / 10
    );

    const durA = Math.max(12, (interIdxA - origIdx) * 4);
    const durB = Math.max(12, (destIdxB - interIdxB) * 4);
    const transferWaitMinutes = 7;

    const fareA = calculateOrdinaryFare(distA);
    const fareB = calculateOrdinaryFare(distB);

    const leg1: JourneyLeg = {
      type: 'transit',
      route: {
        id: routeA.route_id,
        routeNumber: routeA.route_short_name,
        routeName: routeA.route_long_name,
        serviceType: 'Ordinary (Suvarna / E-Bus)',
        originStopId,
        destinationStopId: interchangeId,
        originStopName: originStop.stop_name,
        destinationStopName: interchangeStop.stop_name,
        frequencyMinutes: 12,
        firstBus: '05:30',
        lastBus: '22:30',
        totalDistanceKm: distA,
        averageTravelMinutes: durA,
        baseFareInr: fareA,
        stops: segStopsA,
      },
      fromStop: stopMap.get(originStopId)!,
      toStop: stopMap.get(interchangeId)!,
      intermediateStops: segStopsA,
      durationMinutes: durA,
      distanceKm: distA,
      fareInr: fareA,
    };

    const leg2: JourneyLeg = {
      type: 'transit',
      route: {
        id: routeB.route_id,
        routeNumber: routeB.route_short_name,
        routeName: routeB.route_long_name,
        serviceType: 'Ordinary (Suvarna / E-Bus)',
        originStopId: interchangeId,
        destinationStopId: destStopId,
        originStopName: interchangeStop.stop_name,
        destinationStopName: destStop.stop_name,
        frequencyMinutes: 12,
        firstBus: '05:30',
        lastBus: '22:30',
        totalDistanceKm: distB,
        averageTravelMinutes: durB,
        baseFareInr: fareB,
        stops: segStopsB,
      },
      fromStop: stopMap.get(interchangeId)!,
      toStop: stopMap.get(destStopId)!,
      intermediateStops: segStopsB,
      durationMinutes: durB,
      distanceKm: distB,
      fareInr: fareB,
      transferInstructions: `Alight at ${interchangeStop.stop_name}. Change platform and board Route ${routeB.route_short_name} towards ${destStop.stop_name}.`,
    };

    transferPlans.push({
      id: `gtfs_transfer_${routeA.route_short_name}_${routeB.route_short_name}_via_${interchangeId}`,
      legs: [leg1, leg2],
      totalMinutes: durA + durB + transferWaitMinutes,
      totalDistanceKm: Math.round((distA + distB) * 10) / 10,
      totalFareInr: fareA + fareB,
      transfersCount: 1,
      co2SavedKg: Math.round((distA + distB) * 0.12 * 10) / 10,
      carbonEmittedKg: Math.round((distA + distB) * 0.03 * 10) / 10,
      routesUsed: [routeA.route_short_name, routeB.route_short_name],
      primaryServiceType: 'Ordinary (Suvarna / E-Bus)',
      dataSourceLabel: activeGtfsDataset.metadata.badge,
      isImportedGtfs: safeGetStorage(GTFS_STORAGE_KEY) !== null,
    });

    if (transferPlans.length >= 2) break;
  }

  return transferPlans;
}

function calculateOrdinaryFare(distanceKm: number): number {
  if (distanceKm <= 2) return 6;
  if (distanceKm <= 5) return 12;
  if (distanceKm <= 10) return 18;
  if (distanceKm <= 16) return 22;
  if (distanceKm <= 22) return 25;
  if (distanceKm <= 30) return 30;
  return 35;
}

function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

/**
 * Extracts and imports GTFS dataset from a zip file
 */
export async function importGtfsFromZip(
  zipFile: File,
  onProgress?: (step: string) => void
): Promise<{ success: boolean; message: string; stats?: GtfsDataset['metadata'] }> {
  try {
    onProgress?.('Reading GTFS ZIP archive...');
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);

    // Look for routes.txt, stops.txt, trips.txt, stop_times.txt
    let routesText = '';
    let stopsText = '';
    let tripsText = '';
    let stopTimesText = '';

    for (const [filename, fileObj] of Object.entries(contents.files)) {
      if (fileObj.dir) continue;
      const lower = filename.toLowerCase();
      if (lower.endsWith('routes.txt')) {
        routesText = await fileObj.async('string');
      } else if (lower.endsWith('stops.txt')) {
        stopsText = await fileObj.async('string');
      } else if (lower.endsWith('trips.txt')) {
        tripsText = await fileObj.async('string');
      } else if (lower.endsWith('stop_times.txt')) {
        stopTimesText = await fileObj.async('string');
      }
    }

    if (!routesText || !stopsText || !tripsText || !stopTimesText) {
      return {
        success: false,
        message:
          'ZIP archive is missing essential GTFS files. Required: routes.txt, stops.txt, trips.txt, stop_times.txt.',
      };
    }

    onProgress?.('Parsing GTFS tables...');
    return processGtfsStrings(routesText, stopsText, tripsText, stopTimesText, zipFile.name);
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to unpack ZIP archive: ${err.message || 'Corrupt or unsupported format'}`,
    };
  }
}

/**
 * Imports individual GTFS files
 */
export async function importGtfsFromFiles(
  files: FileList | File[],
  onProgress?: (step: string) => void
): Promise<{ success: boolean; message: string; stats?: GtfsDataset['metadata'] }> {
  let routesText = '';
  let stopsText = '';
  let tripsText = '';
  let stopTimesText = '';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.name.toLowerCase();
    if (name.includes('routes')) routesText = await file.text();
    else if (name.includes('stops')) stopsText = await file.text();
    else if (name.includes('trips')) tripsText = await file.text();
    else if (name.includes('stop_times')) stopTimesText = await file.text();
  }

  if (!routesText || !stopsText || !tripsText || !stopTimesText) {
    return {
      success: false,
      message:
        'Please provide all 4 mandatory files: routes.txt, stops.txt, trips.txt, and stop_times.txt.',
    };
  }

  return processGtfsStrings(routesText, stopsText, tripsText, stopTimesText, 'Manual File Upload');
}

function processGtfsStrings(
  routesText: string,
  stopsText: string,
  tripsText: string,
  stopTimesText: string,
  sourceLabel: string
): { success: boolean; message: string; stats?: GtfsDataset['metadata'] } {
  const routesCsv = parseCsv(routesText);
  const stopsCsv = parseCsv(stopsText);
  const tripsCsv = parseCsv(tripsText);
  const stopTimesCsv = parseCsv(stopTimesText);

  if (stopsCsv.length === 0 || routesCsv.length === 0) {
    return {
      success: false,
      message: 'Parsed files contained 0 valid stops or routes.',
    };
  }

  const gtfsRoutes: GtfsRoute[] = routesCsv.map((r) => ({
    route_id: r.route_id || r.route_short_name,
    route_short_name: r.route_short_name || r.route_id,
    route_long_name: r.route_long_name || '',
    route_type: parseInt(r.route_type || '3', 10),
    route_color: r.route_color,
  }));

  const gtfsStops: GtfsStop[] = stopsCsv.map((s) => ({
    stop_id: s.stop_id,
    stop_code: s.stop_code,
    stop_name: s.stop_name,
    stop_lat: parseFloat(s.stop_lat || '0'),
    stop_lon: parseFloat(s.stop_lon || '0'),
    zone_id: s.zone_id,
    stop_desc: s.stop_desc,
  }));

  const gtfsTrips: GtfsTrip[] = tripsCsv.map((t) => ({
    trip_id: t.trip_id,
    route_id: t.route_id,
    service_id: t.service_id,
    trip_headsign: t.trip_headsign,
    direction_id: t.direction_id ? parseInt(t.direction_id, 10) : undefined,
    shape_id: t.shape_id,
  }));

  const gtfsStopTimes: GtfsStopTime[] = stopTimesCsv.map((st) => ({
    trip_id: st.trip_id,
    arrival_time: st.arrival_time,
    departure_time: st.departure_time,
    stop_id: st.stop_id,
    stop_sequence: parseInt(st.stop_sequence || '0', 10),
  }));

  const metadata: GtfsDataset['metadata'] = {
    title: `Imported BMTC Feed (${sourceLabel})`,
    source: `User-imported GTFS package (${sourceLabel})`,
    isVerified: true,
    badge: 'USER-IMPORTED OFFICIAL GTFS DATA',
    importedAt: new Date().toISOString().split('T')[0],
    totalRoutes: gtfsRoutes.length,
    totalStops: gtfsStops.length,
    totalTrips: gtfsTrips.length,
    totalStopTimes: gtfsStopTimes.length,
    hasShapes: false,
  };

  const newDataset: GtfsDataset = {
    metadata,
    routes: gtfsRoutes,
    stops: gtfsStops,
    trips: gtfsTrips,
    stopTimes: gtfsStopTimes,
  };

  // Save to safe storage
  safeSetStorage(GTFS_STORAGE_KEY, JSON.stringify(newDataset));

  activeGtfsDataset = newDataset;
  rebuildGtfsGraphIndexes();

  return {
    success: true,
    message: `Successfully loaded ${gtfsRoutes.length} routes, ${gtfsStops.length} stops, and ${gtfsTrips.length} trips into active navigation engine.`,
    stats: metadata,
  };
}

/**
 * Resets active dataset back to built-in benchmark dataset
 */
export function resetToBuiltinGtfs(): void {
  safeRemoveStorage(GTFS_STORAGE_KEY);
  activeGtfsDataset = createBuiltinGtfsDataset();
  rebuildGtfsGraphIndexes();
}
