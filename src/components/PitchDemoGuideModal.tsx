/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActivePage } from '../types';
import { X, CheckCircle, ArrowRight, Play, Award, Compass } from 'lucide-react';

interface PitchDemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActivePage: (page: ActivePage) => void;
  onRunStep: (stepNumber: number) => void;
}

export const PitchDemoGuideModal: React.FC<PitchDemoGuideModalProps> = ({
  isOpen,
  onClose,
  setActivePage,
  onRunStep,
}) => {
  if (!isOpen) return null;

  const pitchSteps = [
    {
      num: 1,
      title: 'Open Homepage',
      desc: 'Showcase "Bengaluru journeys, made simpler.", HexaForce branding, and Smart Infrastructure focus.',
      actionLabel: 'Go to Home',
      page: 'home' as ActivePage,
    },
    {
      num: 2,
      title: 'Enter Hebbal to Majestic',
      desc: 'Verify pre-filled defaults (Origin: Hebbal, Destination: Majestic).',
      actionLabel: 'Open Planner',
      page: 'planner' as ActivePage,
    },
    {
      num: 3,
      title: 'Click "Plan Your Journey"',
      desc: 'Executes genuine route engine finding direct buses (280, 280-A, KIA-9).',
      actionLabel: 'Execute Search',
      page: 'planner' as ActivePage,
    },
    {
      num: 4,
      title: 'Inspect Available Results',
      desc: 'Examine bus route number, service type (Ordinary/Vajra/Airport), duration, and fare.',
      actionLabel: 'Inspect Routes',
      page: 'planner' as ActivePage,
    },
    {
      num: 5,
      title: 'Expand Route Details',
      desc: 'View stop-by-stop timeline with landmarks and stage timings.',
      actionLabel: 'View Timeline',
      page: 'planner' as ActivePage,
    },
    {
      num: 6,
      title: 'Search Amruthalli / Amruthahalli',
      desc: 'Test typo-tolerant search ("Amruthalli" suggests "Amruthahalli"), resolving nearby stops (Amruthahalli Bus Stop & Cross).',
      actionLabel: 'Test Amruthahalli',
      page: 'planner' as ActivePage,
    },
    {
      num: 7,
      title: 'Swap Locations',
      desc: 'Test the bidirectional swap button (Majestic ↔ Hebbal).',
      actionLabel: 'Swap Test',
      page: 'planner' as ActivePage,
    },
    {
      num: 8,
      title: 'Open Nearby Stops',
      desc: 'Demonstrate real GPS live tracking with interactive Leaflet map and stop radius filter.',
      actionLabel: 'Go to Nearby Stops',
      page: 'stops' as ActivePage,
    },
    {
      num: 9,
      title: 'Compare Travel Options & Demo Mode',
      desc: 'Compare BMTC with Auto, Bike Taxi, and Cab. Test live honest pricing disclaimers vs Demo Comparison Mode with benchmark rate cards.',
      actionLabel: 'Compare Costs',
      page: 'planner' as ActivePage,
    },
    {
      num: 10,
      title: 'Submit Commuter Feedback',
      desc: 'File an incorrect stop or missing route report saved to local demo storage.',
      actionLabel: 'Open Feedback',
      page: 'planner' as ActivePage,
    },
    {
      num: 11,
      title: 'Open Data & Sources',
      desc: 'Showcase DEMO DATA transparency, GTFS specification, and real BMTC import roadmap.',
      actionLabel: 'Open Data & Sources',
      page: 'sources' as ActivePage,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-base font-bold text-white">5-Minute Hackathon Demo Script</h3>
              <p className="text-xs text-slate-400">Team HexaForce · HACKNOVA-26 (ANVESHANA-26)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pitch Info Bar */}
        <div className="px-6 py-3 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between text-xs text-teal-950">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>Smart Infrastructure Track</strong>: Presentation checklist for evaluators and presenters.
            </span>
          </div>
          <span className="font-semibold text-teal-800">11 Evaluated Steps</span>
        </div>

        {/* List of steps */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {pitchSteps.map((step) => (
            <div
              key={step.num}
              className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {step.num}
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{step.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{step.desc}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActivePage(step.page);
                  onRunStep(step.num);
                  onClose();
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md shrink-0 flex items-center gap-1 transition-colors"
              >
                <span>Jump</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            HexaForce: Ullas · Prajwal · Yeshwanth
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close Pitch Guide
          </button>
        </div>
      </div>
    </div>
  );
};
