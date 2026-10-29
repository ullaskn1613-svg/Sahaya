/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActivePage } from '../types';
import { MapPin, ShieldAlert, Award, Share2, Check } from 'lucide-react';

interface FooterProps {
  setActivePage: (page: ActivePage) => void;
  onOpenFeedback: () => void;
}

export const Footer: React.FC<FooterProps> = ({ setActivePage, onOpenFeedback }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = window.location.href || 'https://ais-pre-r3u7ddqujpvsnz5vkkhtag-800967173275.asia-northeast1.run.app';
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-sm mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Hackathon Context */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">SAHAYA ಸಹಾಯ</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              Bengaluru journeys, made simpler. A dedicated smart infrastructure mobility solution engineered by <strong>Team HexaForce</strong> for <strong>HACKNOVA-26 (ANVESHANA-26)</strong>.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Award className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Smart Infrastructure Track · Bengaluru, Karnataka, India</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-teal-400 transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('planner');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-teal-400 transition-colors"
                >
                  Journey Planner (Hebbal ↔ Majestic)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('stops');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-teal-400 transition-colors"
                >
                  Nearby Stops & GPS Search
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-teal-400 transition-colors"
                >
                  About Team HexaForce
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('sources');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-teal-400 transition-colors"
                >
                  Data & GTFS Sources
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Hackathon Team & Feedback */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Team HexaForce</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Ullas · Team HexaForce</div>
              <div>Prajwal · Team HexaForce</div>
              <div>Yeshwanth · Team HexaForce</div>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                  copied
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                    : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-teal-400" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Website Link'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenFeedback}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
              >
                <span>Report Missing Stop / Feedback</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data disclaimer notice */}
        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-amber-400/90">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>DEMO DATA — NOT VERIFIED BMTC INFORMATION. Curated for hackathon prototype evaluation.</span>
          </div>
          <div className="text-[12px] text-slate-500">
            © 2026 SAHAYA · Team HexaForce · HACKNOVA-26 (ANVESHANA-26)
          </div>
        </div>
      </div>
    </footer>
  );
};
