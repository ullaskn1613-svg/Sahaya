/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RealGpsPosition } from '../services/gpsService';
import { Stop } from '../types';
import { getAllActiveStops } from '../services/gtfsEngine';
import { LocateFixed, Navigation, Layers, ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';

interface LeafletMapProps {
  userLocation: RealGpsPosition | null;
  destinationLocation?: { lat: number; lng: number; label?: string } | null;
  originLocation?: { lat: number; lng: number; label?: string } | null;
  localityLocation?: { lat: number; lng: number; label?: string } | null;
  routeCoordinates?: [number, number][]; // [lat, lng] array
  routeType?: 'walking' | 'transit';
  activeStop?: Stop | null;
  highlightedStopIds?: string[];
  showAllStops?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onSelectStop?: (stop: Stop, type: 'start' | 'dest') => void;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  userLocation,
  destinationLocation,
  originLocation,
  localityLocation,
  routeCoordinates,
  routeType = 'transit',
  activeStop,
  highlightedStopIds,
  showAllStops = true,
  onMapClick,
  onSelectStop,
  className = 'h-[500px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layers refs
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const localityMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [tileError, setTileError] = useState(false);
  const [stopsVisible, setStopsVisible] = useState(showAllStops);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Bengaluru Central
    const initialLat = userLocation ? userLocation.lat : 12.9772;
    const initialLng = userLocation ? userLocation.lng : 77.5713;
    const initialZoom = userLocation ? 14 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // OpenStreetMap standard tile layer
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    tileLayer.addTo(map);

    // Stops layer group
    const stopsGroup = L.layerGroup().addTo(map);
    stopMarkersLayerRef.current = stopsGroup;

    // Map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Live GPS Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const userLatLng: L.LatLngExpression = [userLocation.lat, userLocation.lng];

      const headingHtml =
        userLocation.headingDegrees !== null && userLocation.headingDegrees !== undefined
          ? `<div style="position: absolute; top: -14px; left: 1px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #0284c7; transform: rotate(${userLocation.headingDegrees}deg); transform-origin: 50% 18px;"></div>`
          : '';

      const userIcon = L.divIcon({
        className: 'user-location-marker-container',
        html: `<div class="user-location-pulsing-dot">${headingHtml}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userLatLng, {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
        userMarkerRef.current.bindPopup(
          `<div class="text-xs p-1"><strong>Your Live Position</strong><br/>Accuracy: ±${userLocation.accuracyMeters}m</div>`
        );
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
        userMarkerRef.current.setIcon(userIcon);
        userMarkerRef.current.setPopupContent(
          `<div class="text-xs p-1"><strong>Your Live Position</strong><br/>Accuracy: ±${userLocation.accuracyMeters}m</div>`
        );
      }

      // Accuracy Circle
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(userLatLng, {
          radius: Math.min(Math.max(userLocation.accuracyMeters, 15), 500),
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng(userLatLng);
        userAccuracyCircleRef.current.setRadius(
          Math.min(Math.max(userLocation.accuracyMeters, 15), 500)
        );
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
    }
  }, [userLocation]);

  // Update Locality Marker (e.g. Amruthahalli Area)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (localityLocation) {
      const locLatLng: L.LatLngExpression = [localityLocation.lat, localityLocation.lng];
      const locIcon = L.divIcon({
        className: 'locality-marker',
        html: `<div style="background: #8b5cf6; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 4px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); white-space: nowrap;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#facc15;"></span>
          ${localityLocation.label || 'Locality'}
        </div>`,
        iconSize: [120, 26],
        iconAnchor: [60, 13],
      });

      if (!localityMarkerRef.current) {
        localityMarkerRef.current = L.marker(locLatLng, { icon: locIcon }).addTo(map);
      } else {
        localityMarkerRef.current.setLatLng(locLatLng);
        localityMarkerRef.current.setIcon(locIcon);
      }
      localityMarkerRef.current.bindPopup(
        `<div class="text-xs"><strong>Locality:</strong> ${localityLocation.label}<br/><span class="text-slate-500">Nearby BMTC stops are highlighted on the map.</span></div>`
      );
    } else if (localityMarkerRef.current) {
      localityMarkerRef.current.remove();
      localityMarkerRef.current = null;
    }
  }, [localityLocation]);

  // Update Origin Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (originLocation) {
      const originLatLng: L.LatLngExpression = [originLocation.lat, originLocation.lng];
      const originIcon = L.divIcon({
        className: 'origin-marker',
        html: `<div style="background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 13px;">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!originMarkerRef.current) {
        originMarkerRef.current = L.marker(originLatLng, { icon: originIcon }).addTo(map);
      } else {
        originMarkerRef.current.setLatLng(originLatLng);
      }
      originMarkerRef.current.bindPopup(
        `<div class="text-xs"><strong>Origin:</strong> ${originLocation.label || 'Start Point'}</div>`
      );
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
  }, [originLocation]);

  // Update Destination Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destinationLocation) {
      const destLatLng: L.LatLngExpression = [destinationLocation.lat, destinationLocation.lng];
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `<div style="background: #ef4444; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 13px;">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker(destLatLng, { icon: destIcon }).addTo(map);
      } else {
        destinationMarkerRef.current.setLatLng(destLatLng);
      }
      destinationMarkerRef.current.bindPopup(
        `<div class="text-xs"><strong>Destination Stop:</strong> ${destinationLocation.label || 'End Point'}</div>`
      );
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  }, [destinationLocation]);

  // Render BMTC Bus Stops markers
  useEffect(() => {
    const group = stopMarkersLayerRef.current;
    if (!group) return;

    group.clearLayers();

    if (!stopsVisible) return;

    const allStops = getAllActiveStops();

    allStops.forEach((stop) => {
      const isSelected = activeStop?.id === stop.id;
      const isHighlighted = highlightedStopIds?.includes(stop.id);
      const isHub = stop.isInterchangeHub;

      const bgColor = isSelected
        ? '#0d9488'
        : isHighlighted
        ? '#7c3aed'
        : isHub
        ? '#0f172a'
        : '#334155';

      const stopIcon = L.divIcon({
        className: 'bmtc-stop-marker',
        html: `<div style="background: ${bgColor}; color: white; width: ${
          isSelected || isHighlighted ? '24px' : '20px'
        }; height: ${
          isSelected || isHighlighted ? '24px' : '20px'
        }; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.25); font-size: 10px; font-weight: bold;">🚏</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'text-xs space-y-2 p-1 min-w-[190px]';
      popupContent.innerHTML = `
        <div>
          <div class="font-bold text-slate-900">${stop.name}</div>
          <div class="text-[11px] text-slate-500">${stop.kannadaName} (${stop.code})</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${stop.zone} Zone ${
        isHighlighted ? '· Near Selected Locality' : ''
      }</div>
        </div>
        ${
          stop.landmarks.length > 0
            ? `<div class="text-[11px] text-slate-600">Near: ${stop.landmarks.slice(0, 2).join(', ')}</div>`
            : ''
        }
      `;

      if (onSelectStop) {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex items-center gap-1.5 pt-1.5 border-t border-slate-100';

        const btnStart = document.createElement('button');
        btnStart.className =
          'flex-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold';
        btnStart.textContent = 'Set Start';
        btnStart.onclick = () => {
          onSelectStop(stop, 'start');
          marker.closePopup();
        };

        const btnDest = document.createElement('button');
        btnDest.className =
          'flex-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded text-[10px] font-bold';
        btnDest.textContent = 'Set Dest';
        btnDest.onclick = () => {
          onSelectStop(stop, 'dest');
          marker.closePopup();
        };

        btnContainer.appendChild(btnStart);
        btnContainer.appendChild(btnDest);
        popupContent.appendChild(btnContainer);
      }

      marker.bindPopup(popupContent);
      marker.addTo(group);
    });
  }, [stopsVisible, activeStop, highlightedStopIds]);

  // Render Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeCoordinates && routeCoordinates.length > 1) {
      const isWalking = routeType === 'walking';
      const polyColor = isWalking ? '#0284c7' : '#0d9488';

      if (!routePolylineRef.current) {
        routePolylineRef.current = L.polyline(routeCoordinates, {
          color: polyColor,
          weight: isWalking ? 4 : 5,
          opacity: 0.85,
          dashArray: isWalking ? '6, 8' : undefined,
          lineJoin: 'round',
        }).addTo(map);
      } else {
        routePolylineRef.current.setLatLngs(routeCoordinates);
        routePolylineRef.current.setStyle({
          color: polyColor,
          weight: isWalking ? 4 : 5,
          dashArray: isWalking ? '6, 8' : undefined,
        });
      }

      // Fit bounds to display the whole route
      map.fitBounds(routePolylineRef.current.getBounds(), {
        padding: [45, 45],
        maxZoom: 16,
      });
    } else if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
  }, [routeCoordinates, routeType]);

  // Re-center on User GPS
  const handleRecenterOnUser = () => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
      duration: 1.2,
    });
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetBengaluruView = () => {
    mapInstanceRef.current?.flyTo([12.9772, 77.5713], 12, { duration: 1 });
  };

  return (
    <div className={`relative w-full ${className} rounded-xl overflow-hidden shadow-inner`}>
      {/* Map Target */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-100" />

      {/* Tile Fallback Notice */}
      {tileError && (
        <div className="absolute top-3 left-3 right-3 z-30 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            OpenStreetMap tile network slow or offline. Interactive stop list remains fully functional.
          </span>
        </div>
      )}

      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 mx-1" />
        <button
          type="button"
          onClick={handleResetBengaluruView}
          title="Reset to Bengaluru View"
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setStopsVisible(!stopsVisible)}
          title={stopsVisible ? 'Hide Bus Stops' : 'Show Bus Stops'}
          className={`p-2 rounded-lg transition-colors ${
            stopsVisible
              ? 'text-teal-700 bg-teal-50 hover:bg-teal-100'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Floating My Location Button */}
      {userLocation && (
        <button
          type="button"
          onClick={handleRecenterOnUser}
          className="absolute bottom-4 right-4 z-20 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-xl shadow-lg border border-slate-300 font-semibold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <LocateFixed className="w-4 h-4 text-sky-600 animate-pulse" />
          <span>My Location</span>
        </button>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[11px] flex items-center gap-3 text-slate-700">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Start (A)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span>Dest (B)</span>
        </div>
        {localityLocation && (
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
            <span>Locality</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 inline-block"></span>
          <span>BMTC Stop</span>
        </div>
      </div>
    </div>
  );
};
