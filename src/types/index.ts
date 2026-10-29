/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Stop {
  id: string;
  name: string;
  kannadaName: string;
  code: string;
  zone: 'North' | 'South' | 'East' | 'West' | 'Central';
  lat: number;
  lng: number;
  landmarks: string[];
  isInterchangeHub?: boolean;
  shelterAvailable: boolean;
  isImported?: boolean;
}

export interface RouteStop {
  stopId: string;
  stopName: string;
  sequence: number;
  stageNumber: number;
  scheduledMinutesFromStart: number;
  landmarks?: string[];
}

export type BusServiceType =
  | 'Ordinary (Suvarna / E-Bus)'
  | 'Vajra (Volvo AC)'
  | 'Vayu Vajra (Airport AC)'
  | 'Metro Feeder'
  | 'General BMTC Transit';

export interface BusRoute {
  id: string;
  routeNumber: string; // Public route code (e.g. "280", "500-D", "KIA-9")
  routeName: string;
  serviceType: BusServiceType;
  originStopId: string;
  destinationStopId: string;
  originStopName: string;
  destinationStopName: string;
  frequencyMinutes: number;
  firstBus: string;
  lastBus: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  averageTravelMinutes: number;
  baseFareInr: number;
  geometryCoords?: [number, number][]; // [lat, lng] path
  isImported?: boolean;
}

export interface JourneyLeg {
  type: 'transit' | 'transfer_walk';
  route?: BusRoute;
  fromStop: Stop;
  toStop: Stop;
  intermediateStops: RouteStop[];
  durationMinutes: number;
  distanceKm: number;
  fareInr?: number;
  transferWalkMinutes?: number;
  transferInstructions?: string;
}

export interface JourneyPlan {
  id: string;
  legs: JourneyLeg[];
  totalMinutes: number;
  totalDistanceKm: number;
  totalFareInr: number;
  transfersCount: number;
  co2SavedKg: number;
  carbonEmittedKg: number;
  routesUsed: string[];
  primaryServiceType: BusServiceType;
  walkingAccessKm?: number;
  walkingAccessMinutes?: number;
  isImportedGtfs?: boolean;
  dataSourceLabel: string;
}

export interface LocalityInfo {
  id: string;
  name: string;
  kannadaName: string;
  aliases: string[];
  zone: 'North' | 'South' | 'East' | 'West' | 'Central';
  lat: number;
  lng: number;
  description: string;
  nearbyStopIds: string[];
}

export type SuggestionType =
  | 'bmtc_stop'
  | 'locality'
  | 'landmark'
  | 'osm_place'
  | 'imported_gtfs_stop';

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  type: SuggestionType;
  badgeLabel: string;
  lat: number;
  lng: number;
  stop?: Stop;
  locality?: LocalityInfo;
  code?: string;
  distanceMeters?: number;
}

export interface NearbyStopMatch {
  stop: Stop;
  distanceKm: number;
  walkingMinutes: number;
  routesServing: string[];
}

/* GTFS Specification Standard Entities */
export interface GtfsRoute {
  route_id: string;
  route_short_name: string; // Public route number (e.g. "280", "500-D")
  route_long_name: string;  // Destination direction or description
  route_type: number;       // 3 = Bus
  route_color?: string;
}

export interface GtfsStop {
  stop_id: string;
  stop_code?: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  zone_id?: string;
  stop_desc?: string;
}

export interface GtfsTrip {
  trip_id: string;
  route_id: string;
  service_id?: string;
  trip_headsign?: string;
  direction_id?: number;
  shape_id?: string;
}

export interface GtfsStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

export interface GtfsDataset {
  metadata: {
    title: string;
    source: string;
    isVerified: boolean;
    badge: string;
    importedAt?: string;
    totalRoutes: number;
    totalStops: number;
    totalTrips: number;
    totalStopTimes: number;
    hasShapes: boolean;
  };
  routes: GtfsRoute[];
  stops: GtfsStop[];
  trips: GtfsTrip[];
  stopTimes: GtfsStopTime[];
  shapes?: Record<string, [number, number][]>;
}

export interface FeedbackSubmission {
  id: string;
  category: 'Incorrect stop' | 'Missing route' | 'Outdated information' | 'General suggestion';
  stopOrRoute?: string;
  message: string;
  contactEmail?: string;
  timestamp: string;
  isDemoLocal: boolean;
}

export type ActivePage = 'home' | 'planner' | 'stops' | 'about' | 'sources';
