/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { STOPS } from '../data/bmtcData';
import { JourneyPlan, Stop } from '../types';
import { RealGpsPosition } from '../services/gpsService';
import { Bus, MapPin, ZoomIn, ZoomOut, RotateCcw, Info, Layers, LocateFixed, Navigation } from 'lucide-react';

interface InteractiveMapProps {
  selectedJourney?: JourneyPlan | null;
  activeStop?: Stop | null;
  onSelectStop?: (stop: Stop, type: 'start' | 'dest') => void;
  highlightStopId?: string;
  gpsPosition?: RealGpsPosition | null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  selectedJourney,
  activeStop,
  onSelectStop,
  highlightStopId,
  gpsPosition,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredStop, setHoveredStop] = useState<Stop | null>(null);
  const [showAllNodes, setShowAllNodes] = useState<boolean>(true);

  // Geographic bounds for Bengaluru Metropolitan Area
  // Min Lat: 12.82 (Electronic City) to Max Lat: 13.22 (Airport)
  // Min Lng: 77.50 (Peenya / Yeshwanthpur) to Max Lng: 77.76 (Whitefield / ITPL)
  const bounds = useMemo(() => {
    return {
      minLat: 12.82,
      maxLat: 13.22,
      minLng: 77.5,
      maxLng: 77.76,
    };
  }, []);

  const projectCoord = (lat: number, lng: number) => {
    const width = 800;
    const height = 560;
    const padding = 50;

    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - 2 * padding);
    // Invert Y because SVG coordinates increase downwards, whereas latitude increases upwards
    const y =
      height -
      padding -
      ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (height - 2 * padding);

    return { x, y };
  };

  // GPS projection (if inside bounds)
  const projectedGps = useMemo(() => {
    if (!gpsPosition) return null;
    return projectCoord(gpsPosition.lat, gpsPosition.lng);
  }, [gpsPosition]);

  // First stop of the selected journey (or active stop)
  const boardingStop = selectedJourney?.legs[0]?.fromStop || activeStop;
  const projectedBoarding = useMemo(() => {
    if (!boardingStop) return null;
    return projectCoord(boardingStop.lat, boardingStop.lng);
  }, [boardingStop]);

  // Collect ordered stop sequence if a journey is selected
  const activeRouteStops: Stop[] = useMemo(() => {
    if (!selectedJourney) return [];
    const result: Stop[] = [];
    selectedJourney.legs.forEach((leg) => {
      leg.intermediateStops.forEach((rStop) => {
        const found = STOPS.find((s) => s.id === rStop.stopId);
        if (found && !result.some((existing) => existing.id === found.id)) {
          result.push(found);
        }
      });
    });
    return result;
  }, [selectedJourney]);

  // Construct SVG path for the journey
  const journeyPathD = useMemo(() => {
    if (activeRouteStops.length < 2) return '';
    return activeRouteStops.reduce((acc, stop, idx) => {
      const { x, y } = projectCoord(stop.lat, stop.lng);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [activeRouteStops]);

  // Major corridor guidelines for reference
  const corridorGuides = useMemo(() => {
    const hebbal = projectCoord(13.0358, 77.597);
    const majestic = projectCoord(12.9772, 77.5713);
    const airport = projectCoord(13.1986, 77.7066);
    const silkBoard = projectCoord(12.9176, 77.6238);
    const itpl = projectCoord(12.9868, 77.7381);
    const elecCity = projectCoord(12.8452, 77.6602);
    const banashankari = projectCoord(12.9155, 77.5736);
    const tinFactory = projectCoord(13.0039, 77.6625);

    return [
      {
        name: 'Airport Corridor (Bellary Rd)',
        d: `M ${airport.x} ${airport.y} L ${hebbal.x} ${hebbal.y} L ${majestic.x} ${majestic.y}`,
      },
      {
        name: 'Outer Ring Road (ORR)',
        d: `M ${hebbal.x} ${hebbal.y} L ${tinFactory.x} ${tinFactory.y} L ${silkBoard.x} ${silkBoard.y} L ${banashankari.x} ${banashankari.y}`,
      },
      {
        name: 'Hosur Road Express',
        d: `M ${majestic.x} ${majestic.y} L ${silkBoard.x} ${silkBoard.y} L ${elecCity.x} ${elecCity.y}`,
      },
      {
        name: 'East-West Corridor',
        d: `M ${majestic.x} ${majestic.y} L ${tinFactory.x} ${tinFactory.y} L ${itpl.x} ${itpl.y}`,
      },
    ];
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Bus className="w-5 h-5 text-teal-400" />
          <h3 className="text-sm font-semibold tracking-tight">Bengaluru Geographic Transit Schematic</h3>
        </div>

        {/* Map Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllNodes(!showAllNodes)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              showAllNodes
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showAllNodes ? 'Showing 48 Stops' : 'Filtered Route'}</span>
          </button>

          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.2, 1.8))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.2, 0.8))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Reset View"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer Badge (Requirement 7) */}
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Illustrative Transit Schematic:</strong> Rendered with authentic GPS coordinates across Bengaluru urban corridors. Zero external paid map dependencies.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">12.82°N–13.22°N · 77.50°E–77.76°E</span>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full h-[380px] sm:h-[460px] bg-slate-950 overflow-hidden select-none">
        <svg
          viewBox="0 0 800 560"
          className="w-full h-full cursor-crosshair transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            </pattern>
            {/* Glow filter */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* GPS Pulse Glow filter */}
            <filter id="gpsGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="800" height="560" fill="url(#grid)" />

          {/* Background Arterial Corridors */}
          {corridorGuides.map((guide, idx) => (
            <path
              key={idx}
              d={guide.d}
              fill="none"
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          ))}

          {/* Active Journey Route Highlight */}
          {journeyPathD && (
            <path
              d={journeyPathD}
              fill="none"
              stroke="#0D9488"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#routeGlow)"
            />
          )}

          {/* Walking Path from Real GPS to Boarding Stop */}
          {projectedGps && projectedBoarding && (
            <g>
              <line
                x1={projectedGps.x}
                y1={projectedGps.y}
                x2={projectedBoarding.x}
                y2={projectedBoarding.y}
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                opacity="0.85"
              />
            </g>
          )}

          {/* Real GPS Live Marker */}
          {projectedGps && (
            <g className="cursor-pointer">
              {/* Outer Accuracy Radius */}
              <circle
                cx={projectedGps.x}
                cy={projectedGps.y}
                r="22"
                fill="#06B6D4"
                opacity="0.18"
              />
              <circle
                cx={projectedGps.x}
                cy={projectedGps.y}
                r="14"
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1.5"
                opacity="0.8"
                filter="url(#gpsGlow)"
              />
              {/* Core GPS Pin */}
              <circle
                cx={projectedGps.x}
                cy={projectedGps.y}
                r="6"
                fill="#06B6D4"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x={projectedGps.x + 10}
                y={projectedGps.y - 10}
                fill="#38BDF8"
                fontSize="11"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="700"
              >
                You Are Here (Real GPS)
              </text>
            </g>
          )}

          {/* Render All Stops */}
          {STOPS.map((stop) => {
            const { x, y } = projectCoord(stop.lat, stop.lng);
            const isOrigin = selectedJourney?.legs[0]?.fromStop.id === stop.id;
            const isDestination =
              selectedJourney?.legs[selectedJourney.legs.length - 1]?.toStop.id === stop.id;
            const isTransfer =
              selectedJourney &&
              selectedJourney.legs.length > 1 &&
              selectedJourney.legs[0]?.toStop.id === stop.id;
            const isPartOfActiveRoute = activeRouteStops.some((s) => s.id === stop.id);
            const isHighlighted = highlightStopId === stop.id || activeStop?.id === stop.id;

            if (!showAllNodes && !isPartOfActiveRoute && !isHighlighted) {
              return null;
            }

            let fill = '#475569';
            let stroke = '#1E293B';
            let r = stop.isInterchangeHub ? 5 : 3.5;

            if (isPartOfActiveRoute) {
              fill = '#14B8A6';
              stroke = '#0F766E';
              r = 6;
            }

            if (isTransfer) {
              fill = '#F59E0B';
              stroke = '#B45309';
              r = 8;
            }

            if (isOrigin) {
              fill = '#10B981';
              stroke = '#047857';
              r = 9;
            }

            if (isDestination) {
              fill = '#3B82F6';
              stroke = '#1D4ED8';
              r = 9;
            }

            return (
              <g
                key={stop.id}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredStop(stop)}
                onMouseLeave={() => setHoveredStop(null)}
              >
                {/* Outer ring for key origin/destination/transfer */}
                {(isOrigin || isDestination || isTransfer || isHighlighted) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 5}
                    fill="none"
                    stroke={isOrigin ? '#10B981' : isDestination ? '#3B82F6' : '#F59E0B'}
                    strokeWidth="2"
                    opacity="0.6"
                  />
                )}

                {/* Stop node dot */}
                <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="1.5" />

                {/* Label for major hubs or active route stops */}
                {(stop.isInterchangeHub || isPartOfActiveRoute || isHighlighted) && (
                  <text
                    x={x + 9}
                    y={y + 4}
                    fill={isPartOfActiveRoute ? '#F8FAFC' : '#94A3B8'}
                    fontSize={stop.isInterchangeHub ? '11' : '10'}
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight={isPartOfActiveRoute || stop.isInterchangeHub ? '600' : '400'}
                    className="pointer-events-none select-none"
                  >
                    {stop.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hovered Stop Tooltip Overlay */}
        {hoveredStop && (
          <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white p-3 rounded-lg shadow-xl max-w-xs pointer-events-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {hoveredStop.name}
                </h4>
                <p className="text-xs text-slate-400">{hoveredStop.kannadaName}</p>
              </div>
              <span className="font-mono text-[11px] text-teal-300 bg-slate-800 px-1.5 py-0.5 rounded">
                {hoveredStop.code}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-300">
              <span className="text-slate-400">Zone:</span> {hoveredStop.zone} Bengaluru
              <br />
              <span className="text-slate-400">Coords:</span>{' '}
              <span className="font-mono tabular-nums">
                {hoveredStop.lat.toFixed(4)}°N, {hoveredStop.lng.toFixed(4)}°E
              </span>
            </div>

            {hoveredStop.landmarks.length > 0 && (
              <div className="mt-1.5 text-[11px] text-slate-400">
                Landmarks: {hoveredStop.landmarks.slice(0, 2).join(', ')}
              </div>
            )}

            {onSelectStop && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectStop(hoveredStop, 'start')}
                  className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                >
                  Set as Origin
                </button>
                <button
                  type="button"
                  onClick={() => onSelectStop(hoveredStop, 'dest')}
                  className="px-2 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                >
                  Set as Destination
                </button>
              </div>
            )}
          </div>
        )}

        {/* Legend in corner */}
        <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 text-white p-2.5 rounded-lg text-xs space-y-1.5 pointer-events-none">
          <div className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Map Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Origin Stop</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Destination Stop</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Interchange / Transfer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
            <span>Active BMTC Route Path</span>
          </div>
          {gpsPosition && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/40"></span>
              <span className="text-cyan-300 font-semibold">Your Live GPS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
