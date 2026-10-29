/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, Bus, CheckCircle2, Compass, Layers, ShieldCheck, Users, MapPin, Zap } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const teamMembers = [
    { name: 'Ullas', role: 'Team HexaForce · Lead Developer' },
    { name: 'Prajwal', role: 'Team HexaForce · Systems & Data Engineer' },
    { name: 'Yeshwanth', role: 'Team HexaForce · UX & Infrastructure Specialist' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header Banner */}
      <div className="space-y-3 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700">
          <Award className="w-4 h-4 text-teal-600" />
          <span>HACKNOVA-26 (ANVESHANA-26)</span>
          <span aria-hidden="true">·</span>
          <span>Smart Infrastructure Track</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          About SAHAYA & Team HexaForce
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          An open, accessible Passenger Information & Multimodal Transit Router engineered for Bengaluru’s daily commuters, students, and urban transit riders.
        </p>
      </div>

      {/* Team HexaForce Profile */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Team HexaForce</h2>
            <p className="text-xs text-slate-500">
              Developed exclusively by the three core student engineers for HACKNOVA-26 (ANVESHANA-26).
            </p>
          </div>
          <div className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
            Focus: Smart Urban Infrastructure
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {teamMembers.map((m, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-slate-900 text-teal-300 font-bold flex items-center justify-center text-sm">
                {m.name.charAt(0)}
              </div>
              <div className="text-base font-bold text-slate-900">{m.name}</div>
              <div className="text-xs text-slate-500">{m.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem, Users, and Solution Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Problem */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            01
          </div>
          <h3 className="text-lg font-bold text-slate-900">The Problem in Bengaluru</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Bengaluru suffers from severe road gridlock, with commuters spending hundreds of hours annually in traffic. While BMTC operates over 6,000 buses across 2,000+ routes, navigating bus stages, interchange hubs, and transfer timing without verified data remains intimidating for newcomers and students.
          </p>
        </div>

        {/* Target Users */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            02
          </div>
          <h3 className="text-lg font-bold text-slate-900">Target Commuters</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Students commuting to colleges (PES, MSRIT, BMSCE, Christ, Bangalore University), IT tech park employees navigating the Outer Ring Road (ORR) and Electronic City corridors, hospital visitors, and migrants discovering the city&apos;s bus network.
          </p>
        </div>

        {/* Solution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="text-lg font-bold text-slate-900">The SAHAYA Solution</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            A fast, honest, and accessible transit navigation platform. SAHAYA shows transparent bus stage sequences, calculated fares, transfer hubs (Majestic, Hebbal, Silk Board), and multimodal comparisons that incentivize eco-friendly bus ridership over solo vehicular trips.
          </p>
        </div>
      </section>

      {/* Smart Infrastructure Visualization & Narrative */}
      <section className="bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 sm:p-12">
          <div className="lg:col-span-7 space-y-5">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Smart Infrastructure Impact
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Data-Driven Public Transit for Bengaluru’s Growth
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Smart infrastructure is not just about physical flyovers and asphalt; it is about high-fidelity digital passenger information systems (PIS) that make public transport transparent and dependable.
            </p>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-1" />
                <span>
                  <strong>Mass Transit Shift:</strong> One full standard BMTC bus replaces up to 40 cars or 60 two-wheelers, eliminating severe bottlenecks along Outer Ring Road and Hosur Road.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-1" />
                <span>
                  <strong>Transparent Stage Fares:</strong> Honest BMTC stage calculation gives students and commuters clear predictability compared to surging ride-hail tariffs.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-1" />
                <span>
                  <strong>Open GTFS Standard:</strong> Ingests standard transit data files, allowing municipal authorities to update schedules seamlessly without vendor lock-in.
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-slate-700 shadow-xl bg-slate-950">
              <img
                src="/src/assets/images/smart_infra_bengaluru_1793202552724.jpg"
                alt="Bengaluru Smart Urban Transit Infrastructure Diagram"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
