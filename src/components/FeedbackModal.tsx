/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FeedbackSubmission } from '../types';
import { X, MessageSquare, AlertCircle, CheckCircle, Trash2, ShieldCheck } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCategory?: FeedbackSubmission['category'];
  prefilledStopOrRoute?: string;
}

const STORAGE_KEY = 'sahaya_user_feedback_v1';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  preselectedCategory = 'General suggestion',
  prefilledStopOrRoute = '',
}) => {
  const [category, setCategory] = useState<FeedbackSubmission['category']>(preselectedCategory);
  const [stopOrRoute, setStopOrRoute] = useState<string>(prefilledStopOrRoute);
  const [message, setMessage] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [savedEntries, setSavedEntries] = useState<FeedbackSubmission[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  useEffect(() => {
    if (preselectedCategory) setCategory(preselectedCategory);
    if (prefilledStopOrRoute) setStopOrRoute(prefilledStopOrRoute);
    setIsSubmitted(false);
    setErrorMessage('');
    loadSavedFeedback();
  }, [isOpen, preselectedCategory, prefilledStopOrRoute]);

  const loadSavedFeedback = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedEntries(JSON.parse(stored));
      } else {
        // Initial sample prototype record
        setSavedEntries([
          {
            id: 'fb-sample-1',
            category: 'Missing route',
            stopOrRoute: 'Tin Factory to Whitefield',
            message: 'Need additional feeder stops noted along Benniganahalli Metro bridge.',
            timestamp: new Date(Date.now() - 3600000 * 4).toLocaleString('en-IN'),
            isDemoLocal: true,
          },
        ]);
      }
    } catch {
      // LocalStorage access fallback
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage('Please describe the issue or suggestion before submitting.');
      return;
    }

    const newEntry: FeedbackSubmission = {
      id: `fb-${Date.now()}`,
      category,
      stopOrRoute: stopOrRoute.trim() || undefined,
      message: message.trim(),
      contactEmail: contactEmail.trim() || undefined,
      timestamp: new Date().toLocaleString('en-IN'),
      isDemoLocal: true,
    };

    const updated = [newEntry, ...savedEntries];
    setSavedEntries(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Fallback
    }

    setIsSubmitted(true);
    setMessage('');
    setErrorMessage('');
  };

  const handleClearHistory = () => {
    setSavedEntries([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-base font-bold text-white">Commuter Feedback & Corrections</h3>
              <p className="text-xs text-slate-400">Help improve Bengaluru transit accuracy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Storage Transparency Notice */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Demo Storage Notice:</strong> This is a hackathon prototype. Submissions are saved locally to your browser storage (<code className="font-mono text-[11px] bg-amber-100 px-1 rounded">localStorage</code>) without external cloud transmission. No unnecessary personal data is collected.
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Thank you for your feedback!</h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                Your report has been recorded in the local demo database. In a production deployment, this flows to the BMTC Smart Infrastructure verification queue.
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                >
                  Submit Another Report
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                  {errorMessage}
                </div>
              )}

              {/* Feedback Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Incorrect stop',
                      'Missing route',
                      'Outdated information',
                      'General suggestion',
                    ] as FeedbackSubmission['category'][]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 text-xs text-left rounded-lg border transition-colors ${
                        category === cat
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Stop or Route */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relevant Stop or Bus Route (Optional)
                </label>
                <input
                  type="text"
                  value={stopOrRoute}
                  onChange={(e) => setStopOrRoute(e.target.value)}
                  placeholder="e.g. Hebbal, Route 280, Silk Board Junction"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Feedback Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the discrepancy, new bus stage, or suggestion..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              {/* Optional Contact */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Optional — only if you wish to be notified)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="commuter@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  {showHistory ? 'Hide Stored Entries' : `View Local Entries (${savedEntries.length})`}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs transition-colors"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Local storage inspection drawer */}
          {showHistory && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Prototype Local Storage Logs ({savedEntries.length})
                </h5>
                {savedEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear Local Data
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No stored entries.</p>
                ) : (
                  savedEntries.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-semibold text-slate-700">{item.category}</span>
                        <span>{item.timestamp}</span>
                      </div>
                      {item.stopOrRoute && (
                        <div className="text-slate-700 font-medium text-[11px]">
                          Target: {item.stopOrRoute}
                        </div>
                      )}
                      <p className="text-slate-600">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
