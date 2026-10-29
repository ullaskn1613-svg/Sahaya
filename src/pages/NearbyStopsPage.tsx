/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Stop, BusRoute } from '../types';
import { getAllActiveRoutes, getAllActiveStops } from '../services/gtfsEngine';
import { calculateHaversineKm } from '../services/bengaluruSearchEngine';
import { useRealGps } from '../context/GpsContext';
import { LeafletMap } from '../components/LeafletMap';
import {
  Compass,
  MapPin,
  Search,
  Navigation,
  Bus,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  LocateFixed,
  Route,
  ArrowRight,
  ShieldCheck,
  Building,
  Radio,
  Footprints,
  RotateCcw,
  Sparkles,
  Map as MapIcon,
  List,
  Sliders,
  RefreshCw,
} from 'lucide-react';

interface NearbyStopsPageProps {
  onPlanTripWithStop: (stopName: string, type: 'start' | 'dest') => void;
  onOpenFeedback: (stopName?: string) => void;
}

export const NearbyStopsPage: React.FC<NearbyStopsPageProps> = ({
  onPlanTripWithStop,
  onOpenFeedback,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number | 'all'>('all');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');

  const {
    position,
    nearestStop,
    status: gpsStatus,
    isTracking,
    isInsideBengaluru,
    errorMessage: gpsError,
    requestRealGps,
    stopTracking,
    toggleLiveTracking,
    clearGps,
  } = useRealGps();

  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  const allStops = useMemo(() => getAllActiveStops(), []);
  const allRoutes = useMemo(() => getAllActiveRoutes(), []);

  // Map each stop to the BMTC routes that serve it
  const stopRoutesMap = useMemo(() => {
    const map = new Map<string, BusRoute[]>();
    for (const stop of allStops) {
      const routes = allRoutes.filter((r) => r.stops.some((rs) => rs.stopId === stop.id));
      map.set(stop.id, routes);
    }
    return map;
  }, [allStops, allRoutes]);

  // Filter and sort stops based on live real GPS
  const filteredStops = useMemo(() => {
    let list = allStops.map((stop) => {
      let distanceKm: number | null = null;
      let distanceMeters: number | null = null;
      let walkingMinutes: number | null = null;

      if (position) {
        distanceKm = calculateHaversineKm(
          position.lat,
          position.lng,
          stop.lat,
          stop.lng
        );
        distanceMeters = Math.round(distanceKm * 1000);
        walkingMinutes = Math.max(1, Math.round(distanceMeters / 80));
      }

      return {
        ...stop,
        distanceKm,
        distanceMeters,
        walkingMinutes,
        servingRoutes: stopRoutesMap.get(stop.id) || [],
      };
    });

    // Adjustable radius filter (only applied when coordinates exist)
    if (position && selectedRadiusKm !== 'all') {
      list = list.filter((s) => s.distanceKm !== null && s.distanceKm <= selectedRadiusKm);
    }

    // Zone filter
    if (selectedZone !== 'All') {
      list = list.filter((s) => s.zone === selectedZone);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.kannadaName.includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.landmarks.some((lm) => lm.toLowerCase().includes(q)) ||
          s.servingRoutes.some((r) => r.routeNumber.toLowerCase().includes(q))
      );
    }

    // Sort by real GPS distance if available
    if (position) {
      list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else {
      list.sort((a, b) => {
        if (a.isInterchangeHub && !b.isInterchangeHub) return -1;
        if (!a.isInterchangeHub && b.isInterchangeHub) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [searchQuery, selectedZone, selectedRadiusKm, position, stopRoutesMap]);

  const handleRefreshLocation = async () => {
    setIsRefreshingGps(true);
    await requestRealGps();
    setIsRefreshingGps(false);
  };

  const handleSelectStopCard = (stop: Stop) => {
    setSelectedStop(stop);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Bengaluru Infrastructure Directory</span>
            <span aria-hidden="true">·</span>
            <span>GPS Proximity & Interactive Map</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nearby Stops Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Explore 48 BMTC transit stops mapped with real GPS coordinates, distance calculations, and interactive map markers.
          </p>
        </div>

        {/* GPS Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {position ? (
            <>
              <button
                type="button"
                onClick={handleRefreshLocation}
                disabled={isRefreshingGps}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Refresh current GPS position"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshingGps ? 'animate-spin' : ''}`} />
                <span>Refresh GPS</span>
              </button>

              <button
                type="button"
                onClick={toggleLiveTracking}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                  isTracking
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="Watch position continuously"
              >
                <Radio className={`w-3 h-3 ${isTracking ? 'animate-pulse text-emerald-200' : 'text-slate-500'}`} />
                <span>{isTracking ? 'Live Tracking On' : 'Live Tracking'}</span>
              </button>

              <button
                type="button"
                onClick={stopTracking}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              >
                Stop
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRefreshLocation}
              disabled={isRefreshingGps}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs flex items-center gap-2 transition-colors"
            >
              <LocateFixed className={`w-4 h-4 text-teal-400 ${isRefreshingGps ? 'animate-spin' : ''}`} />
              <span>{isRefreshingGps ? 'Acquiring GPS...' : 'Enable Real GPS'}</span>
            </button>
          )}

          {/* View toggle (desktop/mobile) */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors hidden lg:block ${
                viewMode === 'both' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* GPS Notice / Telemetry banner */}
      {position && (
        <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />
            <div>
              <span className="font-bold">Live GPS Telemetry:</span>{' '}
              <span className="font-mono tabular-nums">
                {position.lat.toFixed(5)}°N, {position.lng.toFixed(5)}°E
              </span>{' '}
              <span className="text-sky-700">(Accuracy: ±{position.accuracyMeters}m)</span>
            </div>
          </div>

          {nearestStop && (
            <div className="flex items-center gap-2">
              <span className="text-sky-800">
                Nearest stop: <strong>{nearestStop.stop.name}</strong> ({nearestStop.distanceMeters}m · {nearestStop.walkingMinutes} min walk)
              </span>
              <button
                type="button"
                onClick={() => onPlanTripWithStop(nearestStop.stop.name, 'start')}
                className="px-2.5 py-1 text-[11px] font-bold text-sky-900 bg-sky-100 hover:bg-sky-200 rounded border border-sky-300"
              >
                Plan from Here
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search, Zone & Radius Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stop name, Kannada title, landmark, or route..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Zone filter */}
          <div className="md:col-span-3 flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {['All', 'North', 'Central', 'East', 'South'].map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setSelectedZone(zone)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  selectedZone === zone
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          {/* Adjustable Search Radius (only applicable when coordinates exist) */}
          <div className="md:col-span-3 flex items-center gap-1.5 text-xs text-slate-600">
            <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700 whitespace-nowrap">Radius:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
              {([1, 2, 5, 'all'] as (number | 'all')[]).map((rad) => (
                <button
                  key={rad.toString()}
                  type="button"
                  onClick={() => setSelectedRadiusKm(rad)}
                  disabled={!position && rad !== 'all'}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    selectedRadiusKm === rad
                      ? 'bg-teal-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  } ${!position && rad !== 'all' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {rad === 'all' ? 'All' : `${rad}km`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Found <strong className="text-slate-800">{filteredStops.length}</strong> matching stops{' '}
            {position && (
              <span className="text-emerald-700 font-semibold">(ordered by real GPS distance)</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onOpenFeedback()}
            className="text-teal-700 hover:underline"
          >
            Report Missing Stop
          </button>
        </div>
      </div>

      {/* Main Content View (Map + List Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Panel */}
        {(viewMode === 'both' || viewMode === 'map') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-2`}>
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <LeafletMap
                userLocation={position}
                activeStop={selectedStop}
                destinationLocation={
                  selectedStop
                    ? { lat: selectedStop.lat, lng: selectedStop.lng, label: selectedStop.name }
                    : null
                }
                onSelectStop={(stop, type) => onPlanTripWithStop(stop.name, type)}
                className="h-[460px] sm:h-[580px]"
              />
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span>Click any bus stop icon (🚏) to view details, landmarks, or route directions.</span>
              <span className="font-mono text-slate-400">OpenStreetMap Tiles</span>
            </div>
          </div>
        )}

        {/* Stops List Panel */}
        {(viewMode === 'both' || viewMode === 'list') && (
          <div
            className={`${
              viewMode === 'both' ? 'lg:col-span-5' : 'lg:col-span-12'
            } space-y-3 max-h-[620px] overflow-y-auto pr-1`}
          >
            {filteredStops.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
                <MapPin className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-800">No stops in this radius or zone</div>
                <p>Try widening the search radius or resetting the zone filter.</p>
              </div>
            ) : (
              filteredStops.map((stop) => {
                const isSelected = selectedStop?.id === stop.id;
                return (
                  <div
                    key={stop.id}
                    onClick={() => handleSelectStopCard(stop)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{stop.name}</span>
                        </h3>
                        <div className="text-[11px] text-slate-500">{stop.kannadaName}</div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {stop.code}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{stop.zone} Zone</div>
                      </div>
                    </div>

                    {/* Proximity badge */}
                    {stop.distanceKm !== null && (
                      <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        <span className="font-semibold font-mono">
                          {stop.distanceMeters && stop.distanceMeters < 1000
                            ? `${stop.distanceMeters}m away`
                            : `${stop.distanceKm} km away`}
                        </span>
                        {stop.walkingMinutes !== null && stop.distanceKm <= 3 && (
                          <span className="font-mono text-emerald-700">
                            ~{stop.walkingMinutes} min walk
                          </span>
                        )}
                      </div>
                    )}

                    {stop.landmarks.length > 0 && (
                      <div className="text-[11px] text-slate-600">
                        <span className="text-slate-400">Near:</span> {stop.landmarks.slice(0, 2).join(' · ')}
                      </div>
                    )}

                    {/* Serving BMTC Routes */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {stop.servingRoutes.map((r) => (
                        <span
                          key={r.id}
                          className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          {r.routeNumber}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanTripWithStop(stop.name, 'start');
                        }}
                        className="w-1/2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                      >
                        Start Here
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanTripWithStop(stop.name, 'dest');
                        }}
                        className="w-1/2 py-1 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                      >
                        Navigate Here
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
