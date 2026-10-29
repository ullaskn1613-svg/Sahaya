/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActivePage, Stop } from '../types';
import { getStopSuggestions } from '../services/journeyEngine';
import { DATASET_METADATA, STOPS } from '../data/bmtcData';
import { useRealGps } from '../context/GpsContext';
import {
  ArrowRight,
  ArrowRightLeft,
  Bus,
  Compass,
  MapPin,
  Leaf,
  Layers,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Clock,
  Navigation,
  LocateFixed,
  Radio,
} from 'lucide-react';

interface HomePageProps {
  setActivePage: (page: ActivePage) => void;
  onQuickPlan: (start: string, dest: string) => void;
  onOpenFeedback: () => void;
  onOpenPitchGuide: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  setActivePage,
  onQuickPlan,
  onOpenFeedback,
  onOpenPitchGuide,
}) => {
  const [startQuery, setStartQuery] = useState('Hebbal');
  const [destQuery, setDestQuery] = useState('Majestic');
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const { position, nearestStop, requestRealGps } = useRealGps();

  const handleGpsClick = async () => {
    setIsLocating(true);
    setShowStartSuggestions(false);
    const pos = await requestRealGps();
    setIsLocating(false);
    if (pos) {
      if (nearestStop) {
        setStartQuery(nearestStop.stop.name);
      }
    }
  };

  const startSuggestions = getStopSuggestions(startQuery, 6);
  const destSuggestions = getStopSuggestions(destQuery, 6);

  const handleSwap = () => {
    const temp = startQuery;
    setStartQuery(destQuery);
    setDestQuery(temp);
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickPlan(startQuery, destQuery);
    setActivePage('planner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const popularCorridors = [
    {
      from: 'Amruthahalli',
      to: 'Majestic',
      routeHint: 'Route 280-E, 280, 280-A',
      duration: '42 min',
      fare: '₹22 (Ordinary)',
    },
    {
      from: 'Hebbal',
      to: 'Majestic',
      routeHint: 'Routes 280, 280-A, KIA-9',
      duration: '38 min',
      fare: '₹20 (Ordinary)',
    },
    {
      from: 'Hebbal',
      to: 'Central Silk Board',
      routeHint: 'Route 500-D (Outer Ring Road)',
      duration: '72 min',
      fare: '₹30 (Ordinary)',
    },
    {
      from: 'Amruthahalli',
      to: 'KR Market (City Market)',
      routeHint: 'Route 284 via Hebbal & Corporation',
      duration: '46 min',
      fare: '₹25 (Ordinary)',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white border-b border-slate-800">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading and Pitch */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-300">
                <span>HACKNOVA-26 (ANVESHANA-26)</span>
                <span aria-hidden="true">·</span>
                <span>Team HexaForce</span>
                <span aria-hidden="true">·</span>
                <span>Smart Infrastructure Track</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight text-balance">
                Find the place. Choose the smarter way.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                Empowering students, daily commuters, and new residents to navigate Bengaluru’s BMTC bus network with real corridor mapping, accurate stop timelines, and honest multi-modal travel comparisons.
              </p>

              {/* Quick Launch Planner Box */}
              <div className="p-4 sm:p-5 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200">
                <form onSubmit={handlePlanSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                    {/* Origin input */}
                    <div className="relative sm:col-span-5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Starting Point
                        </label>
                        <button
                          type="button"
                          onClick={handleGpsClick}
                          disabled={isLocating}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200 transition-colors"
                          title="Detect nearest BMTC stop via GPS"
                        >
                          <LocateFixed className={`w-3 h-3 text-teal-600 ${isLocating ? 'animate-spin' : ''}`} />
                          <span>{isLocating ? 'Locating...' : 'Use Real GPS'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={startQuery}
                          onChange={(e) => {
                            setStartQuery(e.target.value);
                            setShowStartSuggestions(true);
                          }}
                          onFocus={() => setShowStartSuggestions(true)}
                          placeholder="e.g. Hebbal, Yelahanka..."
                          className="w-full pl-9 pr-3 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      {showStartSuggestions && startSuggestions.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {startSuggestions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setStartQuery(s.title);
                                setShowStartSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-b-0"
                            >
                              <div>
                                <div className="font-semibold text-slate-800">{s.title}</div>
                                <div className="text-[10px] text-slate-400">{s.subtitle}</div>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-600">
                                {s.badgeLabel}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Swap button */}
                    <div className="sm:col-span-1 flex justify-center pt-5 sm:pt-4">
                      <button
                        type="button"
                        onClick={handleSwap}
                        title="Swap Origin and Destination"
                        className="p-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Destination input */}
                    <div className="relative sm:col-span-5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Destination
                      </label>
                      <div className="relative">
                        <Navigation className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={destQuery}
                          onChange={(e) => {
                            setDestQuery(e.target.value);
                            setShowDestSuggestions(true);
                          }}
                          onFocus={() => setShowDestSuggestions(true)}
                          placeholder="e.g. Amruthalli, Majestic..."
                          className="w-full pl-9 pr-3 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      {showDestSuggestions && destSuggestions.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {destSuggestions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setDestQuery(s.title);
                                setShowDestSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-b-0"
                            >
                              <div>
                                <div className="font-semibold text-slate-800">{s.title}</div>
                                <div className="text-[10px] text-slate-400">{s.subtitle}</div>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-50 text-purple-700">
                                {s.badgeLabel}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plan Button and quick disclaimer */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>BMTC bus corridors + multimodal comparison</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <span>Plan Your Journey</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Data Transparency Sub-Kicker */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-amber-400 font-semibold">{DATASET_METADATA.badge}</span>
                <span aria-hidden="true">·</span>
                <span>Bengaluru Urban Prototype</span>
              </div>
            </div>

            {/* Right Column: Hero Visual Asset */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-800">
                <img
                  src="/src/assets/images/hero_bengaluru_transit_1793202552855.jpg"
                  alt="Bengaluru BMTC Electric Bus Transit Boulevard"
                  className="w-full h-80 sm:h-96 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                  <div className="text-white space-y-1">
                    <div className="text-xs font-semibold text-teal-300">Smart Transit Infrastructure</div>
                    <div className="text-sm font-bold">Hebbal ↔ Central Silk Board ↔ Whitefield Arterial Grid</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Popular Bengaluru Commuter Corridors */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                High-Frequency Bengaluru Corridors
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Direct routes connecting central terminals, educational hubs, and IT corridors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePage('planner');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0"
            >
              <span>Explore All Routes</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularCorridors.map((corridor, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono text-teal-700 font-semibold">{corridor.duration}</span>
                    <span className="font-semibold text-slate-800">{corridor.fare}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {corridor.from} → {corridor.to}
                  </div>
                  <p className="text-xs text-slate-500">{corridor.routeHint}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onQuickPlan(corridor.from, corridor.to);
                    setActivePage('planner');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Plan This Corridor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Smart Infrastructure Pillars */}
        <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 relative overflow-hidden">
          <div className="max-w-3xl space-y-3 mb-10">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Smart Infrastructure Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Why SAHAYA for Bengaluru Commuters?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Bengaluru commuters lose an estimated 250+ hours annually to traffic congestion. SAHAYA provides transparent transit intelligence designed to shift individual trips to high-capacity BMTC buses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Bus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Direct & 1-Transfer Pathfinding</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Computes genuine multi-leg BMTC bus sequences through key interchange hubs like Majestic, Hebbal, and Silk Board without dead clicks.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multimodal & Honest Comparisons</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Prioritizes public transit. Never fakes ride-hailing fees—unverified ride-hail fares clearly state &quot;Live price unavailable — connect a supported pricing source.&quot;
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Open GTFS Compatibility</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Built strictly to ingest standard General Transit Feed Specification files (routes, stops, trips, stop_times) for straightforward real-world expansion.
              </p>
            </div>
          </div>
        </section>

        {/* Visual Bento Showcase */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-xl border border-slate-200 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                Stop Sequence & Landmark Intelligence
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Stop-by-stop clarity with Kannada and English signage
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every stop in the SAHAYA corridor index includes bilingual Kannada-English titles, localized landmarks (e.g. Mount Carmel College, Manyata Tech Park, Town Hall), and real geographic coordinates.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between font-medium text-slate-700">
                <span>Hebbal → Mekhri Circle → Majestic Corridor</span>
                <span className="font-mono text-teal-700">7 Intermediate Stops</span>
              </div>
              <div className="text-slate-500">
                Includes major interchange hubs connecting North Bengaluru to South & East corridors.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActivePage('stops');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Explore Nearby Stops
              </button>
              <button
                type="button"
                onClick={onOpenFeedback}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Report Missing Stop
              </button>
            </div>
          </div>

          <div className="md:col-span-5 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
            <img
              src="/src/assets/images/bmtc_electric_bus_1793202553401.jpg"
              alt="BMTC Bus Station at Shivajinagar Bengaluru"
              className="w-full h-full object-cover min-h-[260px]"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        {/* Hackathon Pitch Strip */}
        <section className="bg-teal-50 border border-teal-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-teal-950">
              Evaluating Team HexaForce for HACKNOVA-26?
            </h4>
            <p className="text-xs text-teal-800">
              Run through the 11-step hackathon pitch checklist covering journey planning, stop autocomplete, travel comparison, and data transparency.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPitchGuide}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-xs transition-colors shrink-0"
          >
            Open 5-Minute Pitch Checklist
          </button>
        </section>
      </div>
    </div>
  );
};
