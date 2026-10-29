/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name?: string;
}

export interface WalkingRouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet polyline
  distanceMeters: number;
  distanceKm: number;
  durationMinutes: number;
  steps: RouteStep[];
  attribution: string;
}

export interface GeocodedPlace {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  isBmtcStop?: boolean;
}

/**
 * Fetches real pedestrian walking directions from the public OSRM service
 */
export async function fetchWalkingRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ success: boolean; data?: WalkingRouteResult; error?: string }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Public routing service returned status ${response.status}.`,
      };
    }

    const json = await response.json();

    if (!json.routes || json.routes.length === 0) {
      return {
        success: false,
        error: 'No pedestrian route could be calculated for these coordinates.',
      };
    }

    const route = json.routes[0];
    const geoJsonCoords = route.geometry.coordinates; // [[lng, lat], ...]
    const leafletCoords: [number, number][] = geoJsonCoords.map(
      (c: [number, number]) => [c[1], c[0]] // convert [lng, lat] to [lat, lng]
    );

    const steps: RouteStep[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      for (const step of route.legs[0].steps) {
        let instruction = step.maneuver ? formatManeuver(step.maneuver, step.name) : 'Continue';
        steps.push({
          instruction,
          distanceMeters: Math.round(step.distance),
          durationSeconds: Math.round(step.duration),
          name: step.name || undefined,
        });
      }
    }

    const distanceMeters = Math.round(route.distance);
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));

    return {
      success: true,
      data: {
        coordinates: leafletCoords,
        distanceMeters,
        distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        durationMinutes,
        steps,
        attribution: 'Route provided by OpenStreetMap & OSRM Project',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        err.message ||
        'Walking routing service unavailable. Please check network connection.',
    };
  }
}

function formatManeuver(maneuver: any, streetName?: string): string {
  const type = maneuver.type || '';
  const modifier = maneuver.modifier || '';
  const street = streetName && streetName.trim() ? `onto ${streetName}` : '';

  if (type === 'depart') return `Start heading ${modifier || 'forward'} ${street}`.trim();
  if (type === 'arrive') return 'Arrive at destination';
  if (type === 'turn') return `Turn ${modifier || 'left/right'} ${street}`.trim();
  if (type === 'continue') return `Continue straight ${street}`.trim();
  if (type === 'new name') return `Continue ${street}`.trim();
  if (type === 'roundabout') return `Take the roundabout exit ${street}`.trim();
  return `${type} ${modifier} ${street}`.trim();
}

/**
 * Searches places/addresses in Bengaluru using OpenStreetMap Nominatim
 */
export async function searchPlaces(
  query: string
): Promise<{ success: boolean; results: GeocodedPlace[]; error?: string }> {
  if (!query || query.trim().length < 2) {
    return { success: true, results: [] };
  }

  try {
    // Restrict bounding box to Greater Bengaluru area (viewbox=left,top,right,bottom)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query + ', Bengaluru'
    )}&viewbox=77.35,13.35,77.85,12.75&bounded=1&limit=5`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return { success: false, results: [], error: 'Geocoding service unavailable' };
    }

    const data = await res.json();
    const results: GeocodedPlace[] = data.map((item: any) => ({
      id: `osm_${item.place_id}`,
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || 'place',
    }));

    return { success: true, results };
  } catch (err: any) {
    return { success: false, results: [], error: err.message };
  }
}
