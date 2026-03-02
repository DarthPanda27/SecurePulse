/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useMemo, useState} from 'react';
import {AlertTriangle, CheckCircle, Download, Shield, WifiOff} from 'lucide-react';

type DailyBrief = {
  title: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: string;
  bullets: string[];
  action: string;
  generatedAt?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
};

const STORAGE_KEY = 'securepulse.latestBrief';

export default function App() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setBrief(JSON.parse(cached));
    }

    const loadBrief = async () => {
      try {
        const res = await fetch('/api/daily-briefs/latest');
        if (!res.ok) throw new Error('Failed to load latest brief');
        const latest: DailyBrief = await res.json();
        setBrief(latest);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
      } catch {
        // no-op: fall back to cached/local brief.
      } finally {
        setIsLoading(false);
      }
    };

    loadBrief();

    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const severityStyles = useMemo(() => {
    const severity = brief?.severity ?? 'info';
    switch (severity) {
      case 'critical':
        return {badge: 'bg-red-50 text-red-700 border-red-100', bar: 'bg-red-500'};
      case 'high':
        return {badge: 'bg-amber-50 text-amber-700 border-amber-100', bar: 'bg-amber-500'};
      case 'medium':
        return {badge: 'bg-orange-50 text-orange-700 border-orange-100', bar: 'bg-orange-500'};
      case 'low':
        return {badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', bar: 'bg-emerald-500'};
      default:
        return {badge: 'bg-indigo-50 text-indigo-700 border-indigo-100', bar: 'bg-indigo-500'};
    }
  }, [brief]);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SecurePulse</h1>
          </div>
          {installEvent && (
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download className="w-4 h-4" /> Install app
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {isOffline && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            You're offline. Showing your most recently cached intelligence brief.
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Today's Intelligence Brief</h2>
          <p className="text-slate-500">
            {brief?.generatedAt ? `Generated ${new Date(brief.generatedAt).toLocaleString()}` : 'Awaiting latest brief...'}
          </p>
        </div>

        {isLoading && !brief ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-600">Loading latest brief…</div>
        ) : brief ? (
          <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`h-1.5 w-full ${severityStyles.bar}`}></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${severityStyles.badge}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {brief.severity.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-slate-400">{brief.confidence}</span>
              </div>

              <h3 className="text-xl font-bold mb-3">{brief.title}</h3>
              <p className="text-slate-700 mb-4">{brief.summary}</p>

              {brief.bullets.length > 0 && (
                <ul className="space-y-2 mb-6">
                  {brief.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-slate-700">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                      <p>{item}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle className="w-4 h-4" /> Suggested Action: {brief.action}
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-600">
            No cached brief available yet. Connect once to sync your latest intelligence report.
          </div>
        )}
      </main>
    </div>
  );
}
