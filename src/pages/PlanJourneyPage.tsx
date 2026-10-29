/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  JourneyPlan,
  LocalityInfo,
  NearbyStopMatch,
  SearchSuggestion,
  Stop,
} from '../types';
import {
  findJourneys,
  getBmtcFareAndPassGuidelines,
  getStopSuggestions,
} from '../services/journeyEngine';
import {
  resolveLocationQuery,
  resolveLocalityNearbyStops,
} from '../services/bengaluruSearchEngine';
import { getActiveDatasetInfo, getAllActiveStops } from '../services/gtfsEngine';
import { LeafletMap } from '../components/LeafletMap';
import { TravelCostComparison } from '../components/TravelCostComparison';
import { useRealGps } from '../context/GpsContext';
import { fetchWalkingRoute, WalkingRouteResult, searchPlaces, GeocodedPlace } from '../services/routingService';
import {
  ArrowRight,
  ArrowRightLeft,
  Bus,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  MapPin,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Footprints,
  Layers,
  Sparkles,
  Info,
  LocateFixed,
  Radio,
  Map as MapIcon,
  List,
  RotateCcw,
  CheckCircle,
  CornerDownRight,
  HelpCircle,
  Ticket,
  ExternalLink,
  Building,
} from 'lucide-react';

interface PlanJourneyPageProps {
  initialStart?: string;
  initialDest?: string;
  onOpenFeedback: (stopOrRoute?: string) => void;
  onNavigateToDataSources?: () => void;
}

export const PlanJourneyPage: React.FC<PlanJourneyPageProps> = ({
  initialStart = 'Hebbal',
  initialDest = 'Majestic',
  onOpenFeedback,
  onNavigateToDataSources,
}) => {
  // Navigation mode: BMTC Bus Transit vs Pedestrian Walking
  const [navMode, setNavMode] = useState<'transit' | 'walking'>('transit');

  // Origin & Destination state
  const [isOriginCurrentLocation, setIsOriginCurrentLocation] = useState(false);
  const [startQuery, setStartQuery] = useState(initialStart);
  const [destQuery, setDestQuery] = useState(initialDest);

  // Resolved entities
  const [selectedDestinationStop, setSelectedDestinationStop] = useState<Stop | null>(null);
  const [selectedDestinationLocality, setSelectedDestinationLocality] = useState<LocalityInfo | null>(null);
  const [destinationNearbyStops, setDestinationNearbyStops] = useState<NearbyStopMatch[]>([]);
  const [selectedStartStop, setSelectedStartStop] = useState<Stop | null>(null);

  // Suggestions & Autocomplete
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [externalPlaces, setExternalPlaces] = useState<GeocodedPlace[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  // View state: split map vs list on mobile
  const [mobileTab, setMobileTab] = useState<'map' | 'details'>('map');

  // Search Results
  const [isLoading, setIsLoading] = useState(false);
  const [journeyResults, setJourneyResults] = useState<JourneyPlan[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<JourneyPlan | null>(null);
  const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Real OSRM Walking directions state
  const [walkingRoute, setWalkingRoute] = useState<WalkingRouteResult | null>(null);
  const [walkingError, setWalkingError] = useState<string | null>(null);
  const [isCalculatingWalking, setIsCalculatingWalking] = useState(false);

  // GPS hook
  const {
    position,
    nearestStop,
    status: gpsStatus,
    isTracking,
    isInsideBengaluru,
    errorMessage: gpsError,
    requestRealGps,
    startLiveTracking,
    stopTracking,
    toggleLiveTracking,
  } = useRealGps();

  const [isAcquiringGps, setIsAcquiringGps] = useState(false);

  // Judge Demo Comparison Mode state
  const [isCostDemoMode, setIsCostDemoMode] = useState(false);

  const handleShowJudgeDemo = () => {
    setIsCostDemoMode(true);
    setTimeout(() => {
      const el = document.getElementById('travel-cost-comparison');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Autocomplete suggestions powered by Bengaluru Search Engine
  const startSuggestions = useMemo(() => getStopSuggestions(startQuery, 6), [startQuery]);
  const destSuggestions = useMemo(() => getStopSuggestions(destQuery, 8), [destQuery]);

  const datasetInfo = getActiveDatasetInfo();
  const bmtcPassGuidelines = getBmtcFareAndPassGuidelines();

  // Initial load
  useEffect(() => {
    executeSearch(initialStart, initialDest, undefined, false);
  }, []);

  // When external destination or stop changes
  useEffect(() => {
    const res = resolveLocationQuery(destQuery);
    if (res.type === 'stop' && res.stop) {
      setSelectedDestinationStop(res.stop);
      setSelectedDestinationLocality(null);
      setDestinationNearbyStops([]);
    } else if (res.type === 'locality' && res.locality) {
      setSelectedDestinationLocality(res.locality);
      if (res.nearbyStops && res.nearbyStops.length > 0) {
        setDestinationNearbyStops(res.nearbyStops);
        if (!selectedDestinationStop || !res.nearbyStops.some((m) => m.stop.id === selectedDestinationStop.id)) {
          setSelectedDestinationStop(res.nearbyStops[0].stop);
        }
      }
    }
  }, [destQuery]);

  // Debounced search for Nominatim addresses if user types something not in local database
  useEffect(() => {
    if (!destQuery || destQuery.length < 3) {
      setExternalPlaces([]);
      return;
    }

    const localRes = resolveLocationQuery(destQuery);
    if (localRes.type !== 'unknown') {
      setExternalPlaces([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      const res = await searchPlaces(destQuery);
      if (res.success) {
        setExternalPlaces(res.results);
      }
      setIsSearchingPlaces(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [destQuery]);

  // Recalculate walking route if in walking mode and locations change
  useEffect(() => {
    if (navMode === 'walking') {
      calculateWalkingDirections();
    }
  }, [navMode, isOriginCurrentLocation, position, selectedDestinationStop, selectedDestinationLocality, startQuery]);

  const calculateWalkingDirections = async () => {
    let startLat: number | null = null;
    let startLng: number | null = null;

    if (isOriginCurrentLocation && position) {
      startLat = position.lat;
      startLng = position.lng;
    } else {
      const s = resolveLocationQuery(startQuery).stop;
      if (s) {
        startLat = s.lat;
        startLng = s.lng;
      }
    }

    let endLat: number | null = null;
    let endLng: number | null = null;

    if (selectedDestinationStop) {
      endLat = selectedDestinationStop.lat;
      endLng = selectedDestinationStop.lng;
    } else if (selectedDestinationLocality) {
      endLat = selectedDestinationLocality.lat;
      endLng = selectedDestinationLocality.lng;
    }

    if (startLat === null || startLng === null || endLat === null || endLng === null) {
      setWalkingRoute(null);
      return;
    }

    setIsCalculatingWalking(true);
    setWalkingError(null);

    const result = await fetchWalkingRoute(startLat, startLng, endLat, endLng);
    setIsCalculatingWalking(false);

    if (result.success && result.data) {
      setWalkingRoute(result.data);
      setWalkingError(null);
    } else {
      setWalkingRoute(null);
      setWalkingError(result.error || 'Pedestrian routing unavailable.');
    }
  };

  const handleUseMyCurrentLocation = async () => {
    setIsAcquiringGps(true);
    const pos = await requestRealGps();
    setIsAcquiringGps(false);

    if (pos) {
      setIsOriginCurrentLocation(true);
      startLiveTracking();
      setShowStartSuggestions(false);

      const match = nearestStop;
      const effectiveStart = match ? match.stop.name : 'Hebbal';
      executeSearch(effectiveStart, destQuery, undefined, true);
    }
  };

  const executeSearch = (
    start: string,
    dest: string,
    explicitDestStopId?: string,
    fromGps = isOriginCurrentLocation
  ) => {
    setSearchError(null);

    let effectiveStart = start;
    if (fromGps && position) {
      const match = nearestStop;
      if (match) {
        effectiveStart = match.stop.name;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = findJourneys(effectiveStart, dest, explicitDestStopId);

      setSelectedStartStop(result.resolvedStartStop || null);
      if (result.resolvedDestStop) {
        setSelectedDestinationStop(result.resolvedDestStop);
      }
      setSelectedDestinationLocality(result.resolvedDestLocality || null);
      if (result.localityNearbyStops) {
        setDestinationNearbyStops(result.localityNearbyStops);
      }

      setJourneyResults(result.plans);

      if (result.plans.length > 0) {
        setSelectedJourney(result.plans[0]);
        setExpandedJourneyId(result.plans[0].id);
      } else {
        setSelectedJourney(null);
        setExpandedJourneyId(null);
        if (result.warningMessage) {
          setSearchError(result.warningMessage);
        } else {
          setSearchError(
            `No direct or transfer BMTC bus routes found connecting "${effectiveStart}" and "${dest}". Try selecting an alternate nearby boarding or drop-off stop.`
          );
        }
      }

      setIsLoading(false);
    }, 180);

    if (navMode === 'walking') {
      calculateWalkingDirections();
    }
  };

  const handleSwap = () => {
    const temp = startQuery;
    setStartQuery(destQuery);
    setDestQuery(temp);
    setIsOriginCurrentLocation(false);
    executeSearch(destQuery, temp, undefined, false);
  };

  const handlePickLocalityStop = (stop: Stop) => {
    setSelectedDestinationStop(stop);
    executeSearch(startQuery, destQuery, stop.id, isOriginCurrentLocation);
  };

  // Derive polyline coordinates for map
  const activeRoutePolyline = useMemo(() => {
    if (navMode === 'walking' && walkingRoute) {
      return walkingRoute.coordinates;
    }

    if (selectedJourney && selectedJourney.legs.length > 0) {
      const coords: [number, number][] = [];
      const allStops = getAllActiveStops();
      const stopMap = new Map(allStops.map((s) => [s.id, s]));

      for (const leg of selectedJourney.legs) {
        if (leg.fromStop) coords.push([leg.fromStop.lat, leg.fromStop.lng]);
        for (const st of leg.intermediateStops) {
          const sObj = stopMap.get(st.stopId);
          if (sObj) coords.push([sObj.lat, sObj.lng]);
        }
        if (leg.toStop) coords.push([leg.toStop.lat, leg.toStop.lng]);
      }
      return coords;
    }

    return undefined;
  }, [navMode, walkingRoute, selectedJourney]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Real Location & BMTC Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Bengaluru BMTC Smart Navigation</span>
            <span aria-hidden="true">·</span>
            <span>GTFS Trip Search Engine</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              {datasetInfo.badge}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Journey Navigation</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-full">
              BMTC Buses Only
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Search any Bengaluru bus stop, locality (e.g. Amruthahalli, Manyata, Electronic City), or use live GPS to find supported BMTC routes.
          </p>
        </div>

        {/* Live GPS Telemetry Indicator */}
        <div className="flex items-center gap-2">
          {position ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <div className="font-bold">GPS Active: ±{position.accuracyMeters}m</div>
                <div className="text-[10px] text-emerald-700 truncate max-w-[200px]">
                  {nearestStop ? `Nearest: ${nearestStop.stop.name} (${Math.round(nearestStop.distanceKm * 1000)}m)` : 'Tracking coordinates'}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUseMyCurrentLocation}
              disabled={isAcquiringGps}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <LocateFixed className="w-4 h-4 text-sky-600" />
              <span>{isAcquiringGps ? 'Locating...' : 'Enable Real GPS'}</span>
            </button>
          )}

          {/* Show Judge Demo Button */}
          <button
            type="button"
            onClick={handleShowJudgeDemo}
            title="Sahaya compares public transport with alternative travel modes. Live fares require supported provider data; demo values are illustrative and are not real quotes."
            className="px-3 py-2 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Show Judge Demo</span>
          </button>

          {/* Mobile Map / List toggle */}
          <div className="flex md:hidden bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMobileTab('map')}
              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 ${
                mobileTab === 'map' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('details')}
              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 ${
                mobileTab === 'details' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Routes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls & Details | Right Interactive Leaflet Map */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form, Locality Resolution Panel, Route Results */}
        <div
          className={`md:col-span-5 space-y-4 ${
            mobileTab === 'details' ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Journey Search Form */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-teal-600" />
                <span>Plan BMTC Route</span>
              </h2>

              {/* Mode Toggle: Transit vs Walking */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200">
                <button
                  type="button"
                  onClick={() => setNavMode('transit')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    navMode === 'transit'
                      ? 'bg-white shadow-xs text-teal-800 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  BMTC Bus
                </button>
                <button
                  type="button"
                  onClick={() => setNavMode('walking')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    navMode === 'walking'
                      ? 'bg-white shadow-xs text-sky-800 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Footprints className="w-3 h-3" />
                  <span>Walk</span>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowStartSuggestions(false);
                setShowDestSuggestions(false);
                executeSearch(startQuery, destQuery);
              }}
              className="space-y-3.5"
            >
              {/* Origin Field */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Origin (Start)
                  </label>
                  <button
                    type="button"
                    onClick={handleUseMyCurrentLocation}
                    className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
                  >
                    <LocateFixed className="w-3 h-3" />
                    <span>My Current Location</span>
                  </button>
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={
                      isOriginCurrentLocation && position
                        ? `My Location (near ${nearestStop ? nearestStop.stop.name : 'Bengaluru'})`
                        : startQuery
                    }
                    onChange={(e) => {
                      setIsOriginCurrentLocation(false);
                      setStartQuery(e.target.value);
                      setShowStartSuggestions(true);
                    }}
                    onFocus={() => setShowStartSuggestions(true)}
                    placeholder="Search start stop or locality..."
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                {/* Origin Autocomplete Suggestions */}
                {showStartSuggestions && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={handleUseMyCurrentLocation}
                      className="w-full text-left px-3 py-2 text-xs bg-teal-50/70 hover:bg-teal-100/70 text-teal-900 font-semibold flex items-center gap-2 border-b border-teal-100"
                    >
                      <LocateFixed className="w-3.5 h-3.5 text-teal-600" />
                      <span>Use My Real GPS Location</span>
                    </button>

                    {startSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => {
                          setStartQuery(sug.title);
                          setIsOriginCurrentLocation(false);
                          setShowStartSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-b-0"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{sug.title}</div>
                          <div className="text-[10px] text-slate-500">{sug.subtitle}</div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-600">
                          {sug.badgeLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap Origin and Destination"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Destination Field with Typo and Locality Intelligence */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Destination (Stop or Locality)
                  </label>
                  <span className="text-[10px] text-slate-400">e.g. Amruthahalli, Majestic</span>
                </div>

                <div className="relative">
                  <Navigation className="w-4 h-4 text-rose-600 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setShowDestSuggestions(true);
                    }}
                    onFocus={() => setShowDestSuggestions(true)}
                    placeholder="Type destination (e.g. Amruthalli, Hebbal, ECil)..."
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                {/* Destination Autocomplete Suggestions */}
                {showDestSuggestions && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-wider">
                      BMTC Corridors & Bengaluru Places
                    </div>

                    {destSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => {
                          setDestQuery(sug.title);
                          setShowDestSuggestions(false);
                          if (sug.type === 'bmtc_stop' && sug.stop) {
                            setSelectedDestinationStop(sug.stop);
                            setSelectedDestinationLocality(null);
                            setDestinationNearbyStops([]);
                            executeSearch(startQuery, sug.title, sug.stop.id);
                          } else if (sug.type === 'locality' && sug.locality) {
                            setSelectedDestinationLocality(sug.locality);
                            const nearby = resolveLocalityNearbyStops(sug.locality);
                            setDestinationNearbyStops(nearby);
                            if (nearby.length > 0) {
                              setSelectedDestinationStop(nearby[0].stop);
                              executeSearch(startQuery, sug.title, nearby[0].stop.id);
                            }
                          } else {
                            executeSearch(startQuery, sug.title);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-b-0"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{sug.title}</span>
                          <div className="text-[11px] text-slate-500">{sug.subtitle}</div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            sug.type === 'locality'
                              ? 'bg-purple-100 text-purple-800'
                              : sug.type === 'imported_gtfs_stop'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sug.badgeLabel}
                        </span>
                      </button>
                    ))}

                    {/* Nominatim Bengaluru Addresses */}
                    {externalPlaces.length > 0 && (
                      <>
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-wider border-t border-slate-100">
                          OpenStreetMap Bengaluru Addresses
                        </div>
                        {externalPlaces.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => {
                              setDestQuery(place.name);
                              setShowDestSuggestions(false);
                              executeSearch(startQuery, place.name);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="font-semibold text-slate-800">{place.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {place.displayName}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStartQuery('Hebbal');
                    setDestQuery('Majestic');
                    setIsOriginCurrentLocation(false);
                    setSelectedDestinationLocality(null);
                    setDestinationNearbyStops([]);
                    executeSearch('Hebbal', 'Majestic', undefined, false);
                  }}
                  className="text-xs text-slate-500 hover:text-teal-700 underline"
                >
                  Reset Defaults
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Plan BMTC Journey</span>
                </button>
              </div>
            </form>
          </div>

          {/* LOCALITY RESOLVER PANEL (Requirement 1 & 4) */}
          {selectedDestinationLocality && destinationNearbyStops.length > 0 && (
            <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Building className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Locality Resolved: {selectedDestinationLocality.name}</span>
                  </div>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    {selectedDestinationLocality.description}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {destinationNearbyStops.length} BMTC Stops Nearby
                </span>
              </div>

              <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-purple-100">
                Finding a locality does not automatically mean a BMTC bus stop exists at that exact coordinate. Select your intended destination bus stop below:
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {destinationNearbyStops.map((match) => {
                  const isChosen = selectedDestinationStop?.id === match.stop.id;
                  return (
                    <button
                      key={match.stop.id}
                      type="button"
                      onClick={() => handlePickLocalityStop(match.stop)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between border ${
                        isChosen
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-white hover:bg-purple-100/50 text-slate-800 border-purple-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1">
                          <span>{match.stop.name}</span>
                          {isChosen && <CheckCircle className="w-3 h-3 text-purple-200" />}
                        </div>
                        <div
                          className={`text-[10px] ${
                            isChosen ? 'text-purple-100' : 'text-slate-500'
                          }`}
                        >
                          {match.stop.kannadaName} · {match.distanceKm} km ({match.walkingMinutes} min walk)
                        </div>
                        {match.routesServing.length > 0 && (
                          <div
                            className={`text-[9px] font-mono mt-0.5 ${
                              isChosen ? 'text-purple-200' : 'text-teal-700'
                            }`}
                          >
                            Routes: {match.routesServing.slice(0, 4).join(', ')}
                            {match.routesServing.length > 4 ? '...' : ''}
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isChosen
                            ? 'bg-purple-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {match.stop.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Error Notice */}
          {searchError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>BMTC Route Notice:</strong> {searchError}
                <div className="mt-1 text-[11px] text-rose-700">
                  Tip: Search for verified stops like &quot;Amruthahalli Bus Stop&quot;, &quot;Amruthahalli Cross&quot;, &quot;Hebbal&quot;, or &quot;Majestic&quot;.
                </div>
              </div>
            </div>
          )}

          {/* Pedestrian Walking Navigation Result (Real OSRM) */}
          {navMode === 'walking' && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pedestrian Walking Navigation
                  </h3>
                </div>
                {walkingRoute && (
                  <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                    {walkingRoute.distanceKm} km · {walkingRoute.durationMinutes} min
                  </span>
                )}
              </div>

              {isCalculatingWalking && (
                <div className="py-6 text-center text-xs text-slate-500">
                  Calculating real pedestrian path via OpenStreetMap OSRM...
                </div>
              )}

              {walkingError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  {walkingError}
                </div>
              )}

              {walkingRoute && (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-500">
                    Calculated via OpenStreetMap Pedestrian Router. Turn-by-turn maneuvers:
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {walkingRoute.steps.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between"
                      >
                        <div className="flex items-start gap-2">
                          <CornerDownRight className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                          <span className="text-slate-800 font-medium">{st.instruction}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                          {st.distanceMeters}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BMTC JOURNEY RESULTS (BMTC-Only Strict Output) */}
          {navMode === 'transit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Supported BMTC Bus Journeys ({journeyResults.length})
                </h3>
                <span className="text-[10px] text-slate-400">
                  Direct routes prioritized
                </span>
              </div>

              {isLoading && (
                <div className="py-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  Searching GTFS trip sequences...
                </div>
              )}

              {!isLoading && journeyResults.length === 0 && !searchError && (
                <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                  Select starting point and destination to find BMTC bus connections.
                </div>
              )}

              {!isLoading &&
                journeyResults.map((plan, pIdx) => {
                  const isSelected = selectedJourney?.id === plan.id;
                  const isExpanded = expandedJourneyId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-white shadow-md ring-1 ring-teal-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Plan Summary Header */}
                      <div
                        onClick={() => {
                          setSelectedJourney(plan);
                          setExpandedJourneyId(isExpanded ? null : plan.id);
                        }}
                        className="p-3.5 cursor-pointer flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                              {plan.routesUsed.join(' ➔ ')}
                            </span>
                            {plan.transfersCount === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                Direct BMTC Bus
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                                1 Transfer Connection
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-700 font-medium">
                            {plan.legs[0]?.fromStop.name} ➔ {plan.legs[plan.legs.length - 1]?.toStop.name}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span className="flex items-center gap-1 font-semibold text-slate-900">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {plan.totalMinutes} min
                            </span>
                            <span>{plan.totalDistanceKm} km</span>
                            <span className="font-bold text-teal-700">₹{plan.totalFareInr}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Detailed Stop-by-Stop Itinerary */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                          {/* Data Source & Duration Calculation Disclosure */}
                          <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200 text-[11px] text-teal-950 space-y-1">
                            <div className="font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                              <span>{plan.dataSourceLabel}</span>
                            </div>
                            <div className="text-teal-800 text-[10px]">
                              Travel duration computed using Bengaluru arterial corridor velocity (18-22 km/h) plus 45s dwell time per stop.
                            </div>
                          </div>

                          {/* Legs Details */}
                          {plan.legs.map((leg, lIdx) => (
                            <div key={lIdx} className="space-y-2">
                              {lIdx > 0 && leg.transferInstructions && (
                                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                                  <CornerDownRight className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                  <div>
                                    <strong>Transfer Instruction:</strong> {leg.transferInstructions}
                                  </div>
                                </div>
                              )}

                              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Bus className="w-4 h-4 text-teal-600" />
                                    <div>
                                      <span className="font-bold text-xs text-slate-900">
                                        Route {leg.route?.routeNumber}
                                      </span>
                                      <span className="text-[11px] text-slate-500 ml-1.5">
                                        ({leg.route?.serviceType})
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-teal-700">
                                    ₹{leg.fareInr}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600">
                                  <strong>Direction:</strong> {leg.route?.routeName}
                                </div>

                                <div className="text-[11px] text-slate-600">
                                  <strong>Boarding Stop:</strong> {leg.fromStop.name} ({leg.fromStop.kannadaName})
                                </div>

                                <div className="text-[11px] text-slate-600">
                                  <strong>Drop-off Stop:</strong> {leg.toStop.name} ({leg.toStop.kannadaName})
                                </div>

                                {/* Intermediate Stops List */}
                                <div className="pt-2">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Ordered Intermediate Stops ({leg.intermediateStops.length}):
                                  </div>

                                  <div className="relative pl-5 space-y-2 border-l-2 border-teal-500/40 ml-2 py-1 max-h-48 overflow-y-auto">
                                    {leg.intermediateStops.map((st, stIdx) => (
                                      <div key={stIdx} className="relative text-xs">
                                        <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border border-white" />
                                        <div className="flex items-center justify-between text-slate-700">
                                          <span className="font-medium">{st.stopName}</span>
                                          <span className="font-mono text-[10px] text-slate-400">
                                            Stage {st.stageNumber}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* BMTC OFFICIAL FARE & PASS GUIDELINES (Replaces invented ride-hail comparison) */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-teal-600" />
                <span>Official BMTC Pass & Fare Rules</span>
              </h4>
              <span className="text-[10px] text-slate-400">Verified Fare Stages</span>
            </div>

            <div className="space-y-2">
              {bmtcPassGuidelines.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.category}</span>
                    <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {item.priceDisplay}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">{item.notes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Google Maps Style Interactive Leaflet Screen */}
        <div
          className={`md:col-span-7 space-y-3 ${
            mobileTab === 'map' ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Map Container */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <LeafletMap
              userLocation={position}
              originLocation={
                isOriginCurrentLocation && position
                  ? { lat: position.lat, lng: position.lng, label: 'My Real GPS Location' }
                  : selectedStartStop
                  ? { lat: selectedStartStop.lat, lng: selectedStartStop.lng, label: selectedStartStop.name }
                  : null
              }
              destinationLocation={
                selectedDestinationStop
                  ? {
                      lat: selectedDestinationStop.lat,
                      lng: selectedDestinationStop.lng,
                      label: selectedDestinationStop.name,
                    }
                  : null
              }
              localityLocation={
                selectedDestinationLocality
                  ? {
                      lat: selectedDestinationLocality.lat,
                      lng: selectedDestinationLocality.lng,
                      label: selectedDestinationLocality.name,
                    }
                  : null
              }
              highlightedStopIds={destinationNearbyStops.map((m) => m.stop.id)}
              routeCoordinates={activeRoutePolyline}
              routeType={navMode}
              activeStop={selectedDestinationStop}
              onSelectStop={(stop, type) => {
                if (type === 'start') {
                  setStartQuery(stop.name);
                  setIsOriginCurrentLocation(false);
                } else {
                  setDestQuery(stop.name);
                  setSelectedDestinationStop(stop);
                  setSelectedDestinationLocality(null);
                  setDestinationNearbyStops([]);
                  executeSearch(startQuery, stop.name, stop.id);
                }
              }}
              className="h-[520px] sm:h-[620px]"
            />
          </div>

          {/* Quick Route Status Bar beneath Map */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">
                Active Corridor: <strong>{selectedJourney ? selectedJourney.routesUsed.join(', ') : 'Select Origin & Destination'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
              {selectedJourney && (
                <>
                  <span>{selectedJourney.totalDistanceKm} km</span>
                  <span>·</span>
                  <span>{selectedJourney.totalMinutes} min</span>
                  <span>·</span>
                  <span className="font-bold text-teal-700">₹{selectedJourney.totalFareInr}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Travel Cost Comparison Section (HACKNOVA-26 Smart Infrastructure Feature) */}
      <TravelCostComparison
        originName={isOriginCurrentLocation ? 'My Current GPS Location' : startQuery}
        destName={destQuery}
        originCoord={
          isOriginCurrentLocation && position
            ? { lat: position.lat, lng: position.lng }
            : selectedStartStop
            ? { lat: selectedStartStop.lat, lng: selectedStartStop.lng }
            : null
        }
        destCoord={
          selectedDestinationStop
            ? { lat: selectedDestinationStop.lat, lng: selectedDestinationStop.lng }
            : selectedDestinationLocality
            ? { lat: selectedDestinationLocality.lat, lng: selectedDestinationLocality.lng }
            : null
        }
        transitDistanceKm={selectedJourney ? selectedJourney.totalDistanceKm : null}
        transitDurationMinutes={selectedJourney ? selectedJourney.totalMinutes : null}
        transitFareInr={selectedJourney ? selectedJourney.totalFareInr : null}
        onNavigateToSources={onNavigateToDataSources}
        isDemoModeProp={isCostDemoMode}
        onToggleDemoMode={(val) => setIsCostDemoMode(val)}
      />
    </div>
  );
};
