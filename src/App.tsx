/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActivePage } from './types';
import { GpsProvider } from './context/GpsContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { PlanJourneyPage } from './pages/PlanJourneyPage';
import { NearbyStopsPage } from './pages/NearbyStopsPage';
import { AboutPage } from './pages/AboutPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { FeedbackModal } from './components/FeedbackModal';
import { PitchDemoGuideModal } from './components/PitchDemoGuideModal';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [plannerStart, setPlannerStart] = useState('Hebbal');
  const [plannerDest, setPlannerDest] = useState('Majestic');

  // Feedback modal state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<string>('');

  // Pitch demo guide modal state
  const [isPitchGuideOpen, setIsPitchGuideOpen] = useState(false);

  const handleQuickPlan = (start: string, dest: string) => {
    setPlannerStart(start);
    setPlannerDest(dest);
    setActivePage('planner');
  };

  const handlePlanWithStop = (stopName: string, type: 'start' | 'dest') => {
    if (type === 'start') {
      setPlannerStart(stopName);
    } else {
      setPlannerDest(stopName);
    }
    setActivePage('planner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenFeedback = (stopOrRoute?: string) => {
    setFeedbackTarget(stopOrRoute || '');
    setIsFeedbackOpen(true);
  };

  const handleRunPitchStep = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        setActivePage('home');
        break;
      case 2:
      case 3:
      case 4:
      case 5:
        setPlannerStart('Hebbal');
        setPlannerDest('Majestic');
        setActivePage('planner');
        break;
      case 6:
        setPlannerStart('Hebbal');
        setPlannerDest('Amruthahalli');
        setActivePage('planner');
        break;
      case 7:
        // Swap locations
        setPlannerStart('Majestic');
        setPlannerDest('Hebbal');
        setActivePage('planner');
        break;
      case 8:
        setActivePage('stops');
        break;
      case 9:
        setPlannerStart('Hebbal');
        setPlannerDest('Majestic');
        setActivePage('planner');
        setTimeout(() => {
          const el = document.getElementById('travel-cost-comparison');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
        break;
      case 10:
        setFeedbackTarget('Route 280 (Hebbal to Majestic)');
        setIsFeedbackOpen(true);
        break;
      case 11:
        setActivePage('sources');
        break;
      default:
        break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <GpsProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        {/* Top Navigation */}
        <Navbar
          activePage={activePage}
          setActivePage={setActivePage}
          onOpenPitchGuide={() => setIsPitchGuideOpen(true)}
        />

        {/* Main Viewport Content */}
        <main className="flex-1">
          {activePage === 'home' && (
            <HomePage
              setActivePage={setActivePage}
              onQuickPlan={handleQuickPlan}
              onOpenFeedback={handleOpenFeedback}
              onOpenPitchGuide={() => setIsPitchGuideOpen(true)}
            />
          )}

          {activePage === 'planner' && (
            <PlanJourneyPage
              initialStart={plannerStart}
              initialDest={plannerDest}
              onOpenFeedback={handleOpenFeedback}
            />
          )}

          {activePage === 'stops' && (
            <NearbyStopsPage
              onPlanTripWithStop={handlePlanWithStop}
              onOpenFeedback={handleOpenFeedback}
            />
          )}

          {activePage === 'about' && <AboutPage />}

          {activePage === 'sources' && <DataSourcesPage />}
        </main>

        {/* Footer */}
        <Footer
          setActivePage={setActivePage}
          onOpenFeedback={() => handleOpenFeedback()}
        />

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          prefilledStopOrRoute={feedbackTarget}
        />

        {/* 5-Minute Hackathon Pitch Assistant Modal */}
        <PitchDemoGuideModal
          isOpen={isPitchGuideOpen}
          onClose={() => setIsPitchGuideOpen(false)}
          setActivePage={setActivePage}
          onRunStep={handleRunPitchStep}
        />
      </div>
    </GpsProvider>
  );
}
