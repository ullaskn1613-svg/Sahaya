/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  getActiveDatasetInfo,
  getAllActiveRoutes,
  getAllActiveStops,
  importGtfsFromFiles,
  importGtfsFromZip,
  resetToBuiltinGtfs,
} from '../services/gtfsEngine';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  ExternalLink,
  Code,
  Database,
  CheckCircle2,
  Download,
  Terminal,
  HelpCircle,
  Upload,
  RotateCcw,
  AlertTriangle,
  FolderArchive,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'explorer'>('overview');
  const [importStatus, setImportStatus] = useState<{
    isLoading: boolean;
    step?: string;
    success?: boolean;
    message?: string;
  }>({ isLoading: false });

  const datasetInfo = getActiveDatasetInfo();
  const allRoutes = getAllActiveRoutes();
  const allStops = getAllActiveStops();

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    allRoutes[0]?.id || ''
  );

  const selectedRoute = allRoutes.find((r) => r.id === selectedRouteId) || allRoutes[0];

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ isLoading: true, step: 'Unpacking ZIP archive...' });
    const res = await importGtfsFromZip(file, (step) =>
      setImportStatus((prev) => ({ ...prev, step }))
    );

    setImportStatus({
      isLoading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportStatus({ isLoading: true, step: 'Parsing GTFS text files...' });
    const res = await importGtfsFromFiles(files, (step) =>
      setImportStatus((prev) => ({ ...prev, step }))
    );

    setImportStatus({
      isLoading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleReset = () => {
    resetToBuiltinGtfs();
    setImportStatus({
      isLoading: false,
      success: true,
      message: 'Reset to standard curated Bengaluru BMTC benchmark dataset.',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Data Transparency & Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Open GTFS Specification</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              {datasetInfo.badge}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            BMTC Data, GTFS Importer & Sources
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Honest reporting on active datasets, GTFS relationship compliance, and live import of official municipal feeds.
          </p>
        </div>

        {/* Status Badge */}
        <div
          className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs border ${
            datasetInfo.isCustomImport
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          {datasetInfo.isCustomImport ? (
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
          )}
          <div>
            <div className="font-bold">{datasetInfo.badge}</div>
            <div className="text-[11px] text-slate-600">
              {datasetInfo.isCustomImport
                ? 'User-uploaded official GTFS feed active'
                : 'Synthetic benchmark dataset for HACKNOVA-26'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Dataset Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'import'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Import Official GTFS Feed</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'explorer'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Live Route & Stop Explorer
        </button>
      </div>

      {/* Tab 1: Dataset Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs text-slate-500">Active Routes</div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {datasetInfo.activeRoutesCount}
              </div>
              <div className="text-[11px] text-slate-400">Arterial & Feeder Corridors</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs text-slate-500">Indexed Stops</div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {datasetInfo.activeStopsCount}
              </div>
              <div className="text-[11px] text-slate-400">Includes Amruthahalli & Bellary Rd</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs text-slate-500">GTFS Trips</div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {datasetInfo.activeTripsCount}
              </div>
              <div className="text-[11px] text-slate-400">Directional Run Sequences</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs text-slate-500">Stop-Time Links</div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {datasetInfo.activeStopTimesCount}
              </div>
              <div className="text-[11px] text-slate-400">Ordered GTFS Stop Times</div>
            </div>
          </div>

          {/* Dataset Disclosure */}
          <div className="p-6 rounded-xl bg-slate-900 text-white space-y-4">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>GTFS Data Integrity & Disclosure</span>
            </div>

            <h2 className="text-xl font-bold text-white">
              Built-in Amruthahalli & Arterial Benchmark vs. Official Live Feeds
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              In accordance with hackathon ethics and open data policies, Sahaya maintains strict transparency:
              The application ships with a rich, curated GTFS-compliant database featuring North Bengaluru corridors (Amruthahalli Bus Stop, Amruthahalli Cross, Hebbal, Yelahanka, Majestic, Manyata Tech Park, and KR Market) and major ring road arterial routes.
              If an official municipal BMTC GTFS feed is available from Open City Bengaluru or the Karnataka Open Data initiative, users can upload the ZIP or raw CSV files in the &quot;Import Official GTFS Feed&quot; tab to immediately replace or augment the index.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs">
              <a
                href="https://opencity.in/data/bengaluru-bmtc-bus-routes"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-teal-300 hover:text-teal-200 underline"
              >
                <span>Open City Bengaluru GTFS Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="https://gtfs.org"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-300 underline"
              >
                <span>General Transit Feed Specification (GTFS) Reference</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GTFS Importer */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-teal-600" />
                <span>Upload Official BMTC GTFS Feed</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Import standard GTFS archives or individual files. The parser reads routes.txt, stops.txt, trips.txt, and stop_times.txt, builds inverted trip graph indices, and activates real-time BMTC journey search.
              </p>
            </div>

            {/* Importer Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: ZIP Archive */}
              <div className="p-5 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/30 hover:bg-teal-50/60 transition-colors flex flex-col items-center justify-center text-center space-y-3">
                <FolderArchive className="w-8 h-8 text-teal-600" />
                <div>
                  <div className="font-bold text-sm text-slate-900">Upload GTFS ZIP Archive</div>
                  <div className="text-[11px] text-slate-500">e.g. bmtc_gtfs.zip or bengaluru_transit.zip</div>
                </div>

                <label className="cursor-pointer px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
                  <span>Browse .zip File</span>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={handleZipUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Option B: Individual TXT Files */}
              <div className="p-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-colors flex flex-col items-center justify-center text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-600" />
                <div>
                  <div className="font-bold text-sm text-slate-900">Upload Multiple .txt Files</div>
                  <div className="text-[11px] text-slate-500">routes.txt, stops.txt, trips.txt, stop_times.txt</div>
                </div>

                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
                  <span>Select GTFS Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.csv"
                    onChange={handleFilesUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Status Feedback */}
            {importStatus.isLoading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping shrink-0" />
                <div>
                  <strong>Processing Feed:</strong> {importStatus.step}
                </div>
              </div>
            )}

            {importStatus.message && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                  importStatus.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong>{importStatus.success ? 'Import Complete' : 'Import Warning'}:</strong>{' '}
                  {importStatus.message}
                </div>
              </div>
            )}

            {/* Reset Button */}
            {datasetInfo.isCustomImport && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Custom feed is currently stored in browser storage.
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Curated Benchmark Data</span>
                </button>
              </div>
            )}
          </div>

          {/* GTFS Spec Reference Guide */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Required GTFS Files & Key Mapping</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono font-bold text-slate-900">routes.txt</span>
                <p className="text-slate-600 mt-0.5">
                  Connects internal <code className="text-teal-700">route_id</code> to public-facing BMTC bus route numbers (<code className="text-teal-700">route_short_name</code>, e.g. 280, 500-D, KIA-9).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono font-bold text-slate-900">stops.txt</span>
                <p className="text-slate-600 mt-0.5">
                  Contains verified BMTC stop identifiers (<code className="text-teal-700">stop_id</code>), stop names, and GPS coordinates (<code className="text-teal-700">stop_lat</code>, <code className="text-teal-700">stop_lon</code>).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono font-bold text-slate-900">trips.txt</span>
                <p className="text-slate-600 mt-0.5">
                  Links individual scheduled directional trips to <code className="text-teal-700">route_id</code> with destination headsigns.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono font-bold text-slate-900">stop_times.txt</span>
                <p className="text-slate-600 mt-0.5">
                  Establishes the exact sequence of stops visited on each trip (<code className="text-teal-700">stop_sequence</code>) and arrival/departure schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Route & Stop Explorer */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-2 max-h-[550px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select BMTC Route ({allRoutes.length})
            </h3>
            {allRoutes.map((route) => {
              const isSelected = selectedRoute?.id === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="font-mono">{route.routeNumber}</span>
                      <span className="text-[10px] font-normal opacity-80">
                        ({route.serviceType})
                      </span>
                    </div>
                    <div
                      className={`text-[11px] truncate max-w-[220px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {route.routeName}
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      isSelected ? 'bg-slate-800 text-teal-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {route.stops.length} Stops
                  </span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
            {selectedRoute ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-lg font-bold text-slate-900">
                      Route {selectedRoute.routeNumber}
                    </div>
                    <div className="text-xs text-slate-500">{selectedRoute.routeName}</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded">
                    {selectedRoute.totalDistanceKm} km · {selectedRoute.averageTravelMinutes} min
                  </span>
                </div>

                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Ordered Sequence of Stops:
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {selectedRoute.stops.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-mono text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800">{st.stopName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        Stage {st.stageNumber} · +{st.scheduledMinutesFromStart}m
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Select a route to view its ordered GTFS stop sequence.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
