/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActivePage } from '../types';
import { useRealGps } from '../context/GpsContext';
import { MapPin, Menu, X, Compass, Route, LocateFixed, Radio } from 'lucide-react';

interface NavbarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onOpenPitchGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  onOpenPitchGuide,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { position, status: gpsStatus, requestRealGps } = useRealGps();

  const navItems: { id: ActivePage; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'planner', label: 'Plan Journey' },
    { id: 'stops', label: 'Nearby Stops' },
    { id: 'about', label: 'About Sahaya' },
    { id: 'sources', label: 'Data & Sources' },
  ];

  const handleNavClick = (page: ActivePage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark with Location Pin */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left text-white group whitespace-nowrap shrink-0 focus-visible:outline-hidden"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
                SAHAYA
                <span className="text-teal-400 text-sm font-normal">ಸಹಾಯ</span>
              </span>
            </div>
          </button>

          {/* Zone 2: 5 single-line clean text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-teal-400 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: GPS Status & Primary Action */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {position ? (
              <button
                type="button"
                onClick={() => handleNavClick('stops')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-cyan-300 bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-cyan-500/40 transition-colors whitespace-nowrap shrink-0"
                title="Real GPS Active. Click to inspect nearby stops."
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>
                  {position.lat.toFixed(3)}°N, {position.lng.toFixed(3)}°E
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requestRealGps()}
                disabled={gpsStatus === 'requesting'}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0"
                title="Detect device GPS"
              >
                <LocateFixed className={`w-3.5 h-3.5 text-teal-400 ${gpsStatus === 'requesting' ? 'animate-spin' : ''}`} />
                <span>{gpsStatus === 'requesting' ? 'Locating...' : 'Real GPS'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenPitchGuide}
              className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Pitch Demo Guide</span>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={onOpenPitchGuide}
              className="p-2 text-teal-400 bg-slate-800 rounded-lg text-xs font-semibold"
              title="Pitch Demo Guide"
            >
              Demo
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleNavClick('planner');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-slate-950 bg-teal-400 rounded-lg"
            >
              <Route className="w-4 h-4" />
              <span>Launch Journey Planner</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
