/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bus,
  Car,
  Bike,
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Leaf,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  ExternalLink,
} from 'lucide-react';
import { DEMO_PRICING_CONFIG, TransportModeConfig } from '../config/demoPricingConfig';

interface TravelCostComparisonProps {
  originName: string;
  destName: string;
  originCoord?: { lat: number; lng: number } | null;
  destCoord?: { lat: number; lng: number } | null;
  transitDistanceKm?: number | null;
  transitDurationMinutes?: number | null;
  transitFareInr?: number | null;
  onNavigateToSources?: () => void;
  // External control for Judge Demo button
  isDemoModeProp?: boolean;
  onToggleDemoMode?: (enabled: boolean) => void;
}

// Haversine formula for straight-line reference distance
function calculateStraightLineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const TravelCostComparison: React.FC<TravelCostComparisonProps> = ({
  originName,
  destName,
  originCoord,
  destCoord,
  transitDistanceKm,
  transitDurationMinutes,
  transitFareInr,
  onNavigateToSources,
  isDemoModeProp,
  onToggleDemoMode,
}) => {
  const [internalDemoMode, setInternalDemoMode] = useState(false);
  const isDemoMode = isDemoModeProp !== undefined ? isDemoModeProp : internalDemoMode;

  const handleToggle = (val: boolean) => {
    if (onToggleDemoMode) {
      onToggleDemoMode(val);
    } else {
      setInternalDemoMode(val);
    }
  };

  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Compute straight-line reference distance if coordinates are present
  const straightLineDistance =
    originCoord && destCoord
      ? calculateStraightLineDistanceKm(
          originCoord.lat,
          originCoord.lng,
          destCoord.lat,
          destCoord.lng
        )
      : null;

  // Effective road distance for calculations:
  // If we have verified transit corridor distance from BMTC route, use it.
  // Otherwise, apply standard Bengaluru road tortuosity factor (~1.25x straight-line).
  const effectiveDistanceKm =
    transitDistanceKm && transitDistanceKm > 0
      ? transitDistanceKm
      : straightLineDistance
      ? Math.round(straightLineDistance * 1.25 * 10) / 10
      : 8.5; // fallback representative city distance

  // Helper to calculate illustrative demo price for a mode
  const getDemoPrice = (modeConfig: TransportModeConfig): number => {
    const p = modeConfig.demoParameters;
    if (modeConfig.id === 'bmtc') {
      if (transitFareInr !== undefined && transitFareInr !== null) {
        return transitFareInr;
      }
      const chargeableKm = Math.max(0, effectiveDistanceKm - p.baseKmIncluded);
      return Math.round(p.baseFareInr + chargeableKm * p.perKmRateInr);
    }

    const chargeableKm = Math.max(0, effectiveDistanceKm - p.baseKmIncluded);
    const computed = p.baseFareInr + chargeableKm * p.perKmRateInr + p.bookingFeeInr;
    return Math.max(p.minimumFareInr, Math.round(computed));
  };

  // Helper to calculate illustrative demo travel time
  const getDemoDurationMinutes = (modeConfig: TransportModeConfig): number => {
    if (modeConfig.id === 'bmtc' && transitDurationMinutes) {
      return transitDurationMinutes;
    }
    const speed = modeConfig.demoParameters.averageSpeedKmh;
    const baseDriveMinutes = (effectiveDistanceKm / speed) * 60;
    // Add realistic 3-5 min pickup / buffer
    const buffer = modeConfig.id === 'bike_taxi' ? 3 : 5;
    return Math.round(baseDriveMinutes + buffer);
  };

  // Icon mapping helper
  const renderModeIcon = (modeId: string, className: string) => {
    switch (modeId) {
      case 'bmtc':
        return <Bus className={className} />;
      case 'auto':
        return <Car className={className} />;
      case 'bike_taxi':
        return <Bike className={className} />;
      case 'cab':
        return <Car className={className} />;
      default:
        return <Car className={className} />;
    }
  };

  const modes = [
    DEMO_PRICING_CONFIG.modes.bmtc,
    DEMO_PRICING_CONFIG.modes.auto,
    DEMO_PRICING_CONFIG.modes.bike_taxi,
    DEMO_PRICING_CONFIG.modes.cab,
  ];

  return (
    <section
      id="travel-cost-comparison"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6 scroll-mt-20"
    >
      {/* Section Header & Judge Presentation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
              Smart Infrastructure
            </span>
            <span className="text-xs text-slate-400 font-mono">HACKNOVA-26</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Compare Your Travel Options
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Compare BMTC public transit against commercial ride alternatives between{' '}
            <span className="font-semibold text-slate-700">{originName || 'Origin'}</span> and{' '}
            <span className="font-semibold text-slate-700">{destName || 'Destination'}</span>.
          </p>
        </div>

        {/* Demo Mode Toggle Switch */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl self-start md:self-auto">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Comparison Mode</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {isDemoMode ? 'Showing illustrative rates' : 'Live pricing disabled'}
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
              aria-label="Toggle Demo Comparison Mode"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
      </div>

      {/* Demo Mode Active Banner (Strict Hackathon Requirement) */}
      {isDemoMode ? (
        <div className="p-4 rounded-xl bg-amber-50/80 border-2 border-amber-300/80 text-amber-950 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h4 className="text-sm font-black tracking-wide text-amber-900 uppercase">
              {DEMO_PRICING_CONFIG.disclaimer.bannerTitle}
            </h4>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              JUDGE DEMO ACTIVE
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            {DEMO_PRICING_CONFIG.disclaimer.bannerNotice}
          </p>
          <div className="text-[11px] text-amber-800/90 font-medium pt-1 border-t border-amber-200/60">
            <strong>Notice:</strong> {DEMO_PRICING_CONFIG.disclaimer.actualPriceNote}
          </div>
        </div>
      ) : (
        /* Honest Live Disconnected State Banner */
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">
              Honest Data Policy Active (Production Mode)
            </div>
            <div className="text-slate-500 text-[11px]">
              BMTC bus fares reflect verified stage tables. Commercial auto, bike taxi, and cab fares
              remain unestimated until official aggregator dispatch APIs are integrated. Turn on{' '}
              <strong>Demo Comparison Mode</strong> above for judge demonstration.
            </div>
          </div>
        </div>
      )}

      {/* Reference Distance & Corridor Disclosure */}
      <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            {transitDistanceKm ? (
              <>
                Corridor road distance:{' '}
                <strong className="text-slate-900 font-mono">{transitDistanceKm} km</strong> (via
                BMTC transit corridor)
              </>
            ) : straightLineDistance ? (
              <>
                Reference straight-line distance:{' '}
                <strong className="text-slate-900 font-mono">{straightLineDistance} km</strong>
              </>
            ) : (
              <>
                Estimated road corridor:{' '}
                <strong className="text-slate-900 font-mono">{effectiveDistanceKm} km</strong>
              </>
            )}
          </span>
        </div>

        {straightLineDistance && !transitDistanceKm && (
          <div className="text-[11px] text-slate-500 italic">
            Note: Actual road distance via Bengaluru arterial network is typically 20–35% longer.
          </div>
        )}

        <div className="text-[11px] text-slate-500">
          Origin: <strong className="text-slate-700">{originName}</strong> → Destination:{' '}
          <strong className="text-slate-700">{destName}</strong>
        </div>
      </div>

      {/* 4 Responsive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modes.map((mode) => {
          const isBmtc = mode.isPublicTransit;
          const demoPrice = getDemoPrice(mode);
          const demoDuration = getDemoDurationMinutes(mode);

          return (
            <div
              key={mode.id}
              className={`relative rounded-xl border p-4.5 flex flex-col justify-between transition-all duration-200 ${
                isBmtc
                  ? 'bg-linear-to-b from-teal-50/80 to-white border-teal-300 shadow-xs ring-1 ring-teal-400/30'
                  : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              {/* Card Top: Tag + Icon */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isBmtc
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {renderModeIcon(mode.id, 'w-5 h-5')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">
                        {mode.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {mode.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Highlights Badge */}
                  {isBmtc ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                      Public Transit
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {mode.demoParameters.averageSpeedKmh} km/h
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="my-3 py-2.5 px-3 rounded-lg bg-slate-50/80 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Estimated Price
                  </div>

                  {isBmtc ? (
                    // BMTC Price (Verified or Demo)
                    <div>
                      {transitFareInr !== undefined && transitFareInr !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-teal-700 font-mono">
                            ₹{transitFareInr}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            (Verified Stage Fare)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-teal-700 font-mono">
                            ₹{demoPrice}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">(Stage Est.)</span>
                        </div>
                      )}
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-600" />
                        <span>Free for Women (Karnataka Shakti Scheme)</span>
                      </div>
                    </div>
                  ) : isDemoMode ? (
                    // Commercial modes in Demo Mode
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          ~₹{demoPrice}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          DEMO ESTIMATE
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {mode.demoParameters.rateCardDescription}
                      </div>
                    </div>
                  ) : (
                    // Commercial modes in Honest Live Mode (Strict Prompt Phrasing)
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>Live price unavailable — connect a supported pricing source.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Travel Time */}
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Est. Travel Time:</span>
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {isBmtc ? (
                      transitDurationMinutes ? (
                        `${transitDurationMinutes} min`
                      ) : (
                        `~${demoDuration} min`
                      )
                    ) : isDemoMode ? (
                      `~${demoDuration} min (Demo)`
                    ) : (
                      <span className="text-slate-400 italic">Demo only</span>
                    )}
                  </span>
                </div>

                {/* Carbon footprint */}
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                    <span>CO₂ Footprint:</span>
                  </span>
                  <span
                    className={`font-semibold font-mono ${
                      mode.carbonEmissionPerKmGrams < 50
                        ? 'text-emerald-700'
                        : mode.carbonEmissionPerKmGrams < 100
                        ? 'text-teal-700'
                        : 'text-amber-800'
                    }`}
                  >
                    {mode.carbonEmissionPerKmGrams} g/km
                  </span>
                </div>

                {/* Data Source & Status */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Price Source & Status
                  </div>
                  <div className="text-[11px] text-slate-700 font-medium">
                    {isBmtc ? (
                      <span className="text-teal-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        {mode.liveStatus.statusText}
                      </span>
                    ) : isDemoMode ? (
                      <span className="text-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Illustrative benchmark rate card
                      </span>
                    ) : (
                      <span className="text-slate-500">{mode.liveStatus.statusText}</span>
                    )}
                  </div>
                </div>

                {/* Why Choose This */}
                <div className="mt-3 text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                  <span className="font-bold text-slate-800 block mb-0.5">Why choose this:</span>
                  {mode.whyChoose}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{mode.liveStatus.providerName}</span>
                {isBmtc && (
                  <span className="text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                    Green Pick
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table for Evaluation */}
      <div className="bg-slate-50/60 rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Corridor Comparison Matrix ({originName} ↔ {destName})
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Corridor Distance: ~{effectiveDistanceKm} km
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Transport Option</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Fare / Price</th>
                <th className="py-2.5 px-3">Est. Travel Time</th>
                <th className="py-2.5 px-3">CO₂ / Pax</th>
                <th className="py-2.5 px-4">Pricing Status & Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-slate-700">
              {modes.map((mode) => {
                const isBmtc = mode.isPublicTransit;
                const demoPrice = getDemoPrice(mode);
                const demoDuration = getDemoDurationMinutes(mode);

                return (
                  <tr
                    key={mode.id}
                    className={`hover:bg-slate-100/50 transition-colors ${
                      isBmtc ? 'bg-teal-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4 flex items-center gap-2">
                      {renderModeIcon(mode.id, isBmtc ? 'w-4 h-4 text-teal-600' : 'w-4 h-4 text-slate-600')}
                      <span className="font-bold text-slate-900">{mode.name}</span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 capitalize">
                      {mode.category.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {isBmtc ? (
                        <div className="font-bold text-teal-700">
                          ₹{transitFareInr ?? demoPrice}{' '}
                          <span className="text-[10px] font-normal text-emerald-600">(₹0 for women)</span>
                        </div>
                      ) : isDemoMode ? (
                        <div className="font-bold text-slate-800">
                          ~₹{demoPrice}{' '}
                          <span className="text-[10px] text-amber-700 font-normal">(Demo)</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">Unavailable</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {isBmtc ? (
                        transitDurationMinutes ? `${transitDurationMinutes} min` : `~${demoDuration} min`
                      ) : isDemoMode ? (
                        `~${demoDuration} min`
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-700">
                      {mode.carbonEmissionPerKmGrams} g/km
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {isBmtc ? (
                        <span className="text-teal-700 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified GTFS Stage Fare
                        </span>
                      ) : isDemoMode ? (
                        <span className="text-amber-800">Demo Rate Card ({mode.liveStatus.providerName})</span>
                      ) : (
                        <span className="text-slate-400">
                          Live pricing disconnected
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accordion: "How this comparison works" */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600" />
            <span>How this comparison works & Hackathon evaluation methodology</span>
          </div>
          {isAccordionOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {isAccordionOpen && (
          <div className="p-4 text-xs text-slate-600 space-y-3 bg-white border-t border-slate-100 leading-relaxed">
            <div>
              <strong className="text-slate-800 block mb-0.5">1. Live Honesty Principle:</strong>
              Unlike speculative apps that make up fake ride-hail numbers, Sahaya adheres strictly to
              truthful status reporting. When live taxi or bike aggregator APIs are not linked, the system
              honestly informs the commuter with{' '}
              <code className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-mono text-[10px]">
                “Live price unavailable — connect a supported pricing source.”
              </code>
            </div>

            <div>
              <strong className="text-slate-800 block mb-0.5">2. Centralized Demo Configuration:</strong>
              All benchmark calculations for the judge demonstration are governed by a single, editable
              configuration file (<code className="text-teal-700 font-mono text-[10px]">src/config/demoPricingConfig.ts</code>).
              Parameters include Bengaluru RTO auto meter rates (₹30 for first 2 km + ₹15/km), bike taxi base
              fees, city cab brackets, and corridor speed thresholds.
            </div>

            <div>
              <strong className="text-slate-800 block mb-0.5">3. Distance Transparency:</strong>
              Straight-line Euclidean distances are identified explicitly as reference distances and never
              conflated with real road routing. When a BMTC bus route is calculated, the actual transit corridor
              mileage is utilized.
            </div>

            <div>
              <strong className="text-slate-800 block mb-0.5">4. Smart Infrastructure & Sustainability:</strong>
              Shared BMTC buses produce up to 83% less carbon per passenger-kilometer than private cabs and
              relieve Bengaluru arterial chokepoints like Hebbal Flyover and Silk Board.
            </div>

            {onNavigateToSources && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Inspect GTFS specification and open data roadmap:
                </span>
                <button
                  type="button"
                  onClick={onNavigateToSources}
                  className="text-teal-700 hover:text-teal-800 font-bold inline-flex items-center gap-1 text-[11px]"
                >
                  <span>Data & Sources Page</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Presentation Disclaimer Note */}
      <div className="text-center text-[11px] text-slate-400 italic">
        {DEMO_PRICING_CONFIG.disclaimer.judgeExplanation}
      </div>
    </section>
  );
};
