/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Shield, Activity, AlertTriangle, CheckCircle, Moon, Sun, Settings, X } from "lucide-react";

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              SecurePulse
            </h1>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#" className="text-indigo-600 dark:text-indigo-400">Daily Brief</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sources</a>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 h-full w-80 shadow-xl p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Switch to dark theme</p>
              </div>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? "bg-indigo-600" : "bg-slate-200"}`}
                aria-label="Toggle dark mode"
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Critical alerts only</p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Coming soon</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Brief Frequency</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">How often to generate</p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Coming soon</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Today's Intelligence Brief</h2>
          <p className="text-slate-500 dark:text-slate-400">Generated by Gemini 3 Flash • {new Date().toLocaleDateString()}</p>
        </div>

        {/* Placeholder for Brief Cards */}
        <div className="space-y-6">

          {/* Example Card 1 */}
          <article className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full bg-red-500"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    CRITICAL
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">CISA KEV Addition</span>
                </div>
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">HIGH CONFIDENCE</span>
              </div>

              <h3 className="text-xl font-bold mb-3">Active Exploitation of Ivanti Connect Secure (CVE-2024-21893)</h3>

              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                  <p>A server-side request forgery (SSRF) vulnerability in the SAML component allows attackers to bypass authentication.</p>
                </li>
                <li className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                  <p>Observed in targeted campaigns against aerospace and defense sectors.</p>
                </li>
              </ul>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-600">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Why it matters to you</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">You are subscribed to alerts for "Ivanti". This flaw allows unauthenticated access to internal resources and is currently being exploited in the wild.</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Suggested Action: Apply patch version 22.4R2.2 immediately.
                </div>
              </div>
            </div>
          </article>

          {/* Example Card 2 */}
          <article className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full bg-amber-500"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                    <Activity className="w-3.5 h-3.5" />
                    HIGH
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Threat Campaign</span>
                </div>
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">MEDIUM CONFIDENCE</span>
              </div>

              <h3 className="text-xl font-bold mb-3">Scattered Spider Shifts Tactics to Cloud Identity Providers</h3>

              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                  <p>The threat group is increasingly targeting Okta and Entra ID administrators via sophisticated social engineering.</p>
                </li>
                <li className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                  <p>Bypassing MFA using prompt bombing and SIM swapping techniques.</p>
                </li>
              </ul>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-600">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Why it matters to you</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">Your organization uses Okta (detected via subscriptions). This represents a direct threat to your identity perimeter.</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-400">
                  <Shield className="w-4 h-4" />
                  Suggested Action: Enforce FIDO2/WebAuthn hardware keys for all admin accounts.
                </div>
              </div>
            </div>
          </article>

        </div>
      </main>
    </div>
  );
}
