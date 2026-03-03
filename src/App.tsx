/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Shield, Activity, AlertTriangle, CheckCircle,
  Sun, Moon, X, Plus, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function useDarkMode(): [boolean, (v: boolean) => void] {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("securepulse-dark");
      if (saved !== null) return saved === "true";
    } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("securepulse-dark", String(dark));
    } catch {}
  }, [dark]);

  return [dark, setDark];
}

// Popular vendors shown as one-click chips
const POPULAR_VENDORS = [
  "Microsoft", "Okta", "Ivanti", "Cisco", "Palo Alto Networks",
  "Fortinet", "CrowdStrike", "SentinelOne", "VMware", "Citrix",
  "F5 Networks", "Juniper Networks", "Check Point", "Zscaler",
  "Cloudflare", "AWS", "Google Cloud", "Splunk", "GitLab", "Atlassian",
];

// Full list for typeahead suggestions
const ALL_VENDORS = [
  ...POPULAR_VENDORS,
  "Apple", "IBM", "Oracle", "SAP", "Sophos", "Trend Micro",
  "Qualys", "Tenable", "Rapid7", "SolarWinds", "Barracuda Networks",
  "WatchGuard", "HP", "Lenovo", "Dell", "Ubiquiti", "Progress Software",
  "Apache", "OpenSSL", "Redis", "MongoDB", "Jenkins", "Kubernetes",
  "Docker", "HashiCorp", "Arctic Wolf", "Darktrace", "Netgear",
];

function SettingsPage({
  subscriptions,
  onAdd,
  onRemove,
}: {
  subscriptions: string[];
  onAdd: (keyword: string) => void;
  onRemove: (keyword: string) => void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions = input.trim().length > 0
    ? ALL_VENDORS.filter(
        v =>
          v.toLowerCase().includes(input.toLowerCase()) &&
          !subscriptions.includes(v)
      ).slice(0, 6)
    : [];

  function handleAdd(keyword: string) {
    const trimmed = keyword.trim();
    if (!trimmed || subscriptions.includes(trimmed)) return;
    onAdd(trimmed);
    setInput("");
    setShowSuggestions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) handleAdd(suggestions[0]);
      else if (input.trim()) handleAdd(input.trim());
    }
    if (e.key === "Escape") setShowSuggestions(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-1 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-gray-500 text-sm">
          Manage your vendor and product subscriptions for personalized threat intelligence.
        </p>
      </div>

      {/* Popular vendors — quick-add chip grid */}
      <section className="bg-white dark:bg-[#0e1829] rounded-2xl border border-slate-200 dark:border-gray-800/80 shadow-sm dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)] p-6 transition-colors duration-300">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-200 mb-0.5">Popular Vendors</h3>
        <p className="text-xs text-slate-500 dark:text-gray-500 mb-4">Click to subscribe. Click again to remove.</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_VENDORS.map(vendor => {
            const subscribed = subscriptions.includes(vendor);
            return (
              <button
                key={vendor}
                onClick={() => (subscribed ? onRemove(vendor) : onAdd(vendor))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer ${
                  subscribed
                    ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500"
                    : "bg-white dark:bg-gray-800/60 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                {subscribed && <Check className="w-3.5 h-3.5" />}
                {vendor}
              </button>
            );
          })}
        </div>
      </section>

      {/* Typeahead input for any vendor / custom keyword */}
      <section className="bg-white dark:bg-[#0e1829] rounded-2xl border border-slate-200 dark:border-gray-800/80 shadow-sm dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)] p-6 transition-colors duration-300">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-200 mb-0.5">Add by name</h3>
        <p className="text-xs text-slate-500 dark:text-gray-500 mb-4">
          Search for any vendor or product, or type a custom keyword and press Enter.
        </p>
        <div className="relative max-w-md">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Fortinet, nginx, OpenSSL…"
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />
            <button
              onClick={() => handleAdd(input)}
              disabled={!input.trim() || subscriptions.includes(input.trim())}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Add keyword"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown suggestions */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute z-20 mt-1 w-full bg-white dark:bg-[#0e1829] border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
              >
                {suggestions.map(vendor => (
                  <button
                    key={vendor}
                    onMouseDown={e => {
                      e.preventDefault();
                      handleAdd(vendor);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    {vendor}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Current subscriptions list */}
      <section className="bg-white dark:bg-[#0e1829] rounded-2xl border border-slate-200 dark:border-gray-800/80 shadow-sm dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)] p-6 transition-colors duration-300">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-200 mb-0.5 inline-flex items-center gap-2">
          Your Subscriptions
          {subscriptions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
              {subscriptions.length}
            </span>
          )}
        </h3>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-gray-600 mt-3">
            No subscriptions yet. Add vendors and products above to get personalized threat intelligence.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-4">
            {subscriptions.map(kw => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700"
              >
                {kw}
                <button
                  onClick={() => onRemove(kw)}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 transition-colors"
                  aria-label={`Remove ${kw}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useDarkMode();
  const [page, setPage] = useState<"brief" | "settings">("brief");
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then(r => r.json())
      .then(data => setSubscriptions(data.keywords ?? []))
      .catch(() => {});
  }, []);

  async function addSubscription(keyword: string) {
    await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    setSubscriptions(prev => (prev.includes(keyword) ? prev : [...prev, keyword]));
  }

  async function removeSubscription(keyword: string) {
    await fetch(`/api/subscriptions/${encodeURIComponent(keyword)}`, { method: "DELETE" });
    setSubscriptions(prev => prev.filter(k => k !== keyword));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080d17] text-slate-900 dark:text-gray-100 font-sans transition-colors duration-300">

      {/* Top Navigation */}
      <header className="bg-white/80 dark:bg-[#0c1220]/90 border-b border-slate-200 dark:border-indigo-950/60 sticky top-0 z-10 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 dark:bg-indigo-500 p-1.5 rounded-lg transition-all duration-300 dark:shadow-[0_0_14px_rgba(99,102,241,0.55)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              SecurePulse
            </h1>
          </div>

          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-gray-400">
              <button
                onClick={() => setPage("brief")}
                className={`transition-colors ${
                  page === "brief"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Daily Brief
              </button>
              <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Sources
              </a>
              <button
                onClick={() => setPage("settings")}
                className={`transition-colors ${
                  page === "settings"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Settings
              </button>
            </nav>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-800/80 hover:bg-slate-200 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700/60 transition-all duration-300 cursor-pointer shrink-0"
            >
              <AnimatePresence mode="wait" initial={false}>
                {dark ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.4 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute flex items-center justify-center"
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.4 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute flex items-center justify-center"
                  >
                    <Moon className="w-4 h-4 text-slate-500" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {page === "settings" ? (
          <SettingsPage
            subscriptions={subscriptions}
            onAdd={addSubscription}
            onRemove={removeSubscription}
          />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-1 dark:text-white">Today's Intelligence Brief</h2>
              <p className="text-slate-500 dark:text-gray-500 text-sm">
                Generated by Gemini Flash &bull; {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-6">

              {/* CRITICAL card */}
              <article className="bg-white dark:bg-[#0e1829] rounded-2xl border border-slate-200 dark:border-gray-800/80 shadow-sm dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:border-red-900/40">
                <div className="h-1.5 w-full bg-red-500 dark:bg-red-600"></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/40">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        CRITICAL
                      </span>
                      <span className="text-sm text-slate-500 dark:text-gray-500 font-medium">CISA KEV Addition</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 dark:text-gray-600">HIGH CONFIDENCE</span>
                  </div>

                  <h3 className="text-xl font-bold mb-3 dark:text-white">
                    Active Exploitation of Ivanti Connect Secure (CVE-2024-21893)
                  </h3>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-slate-700 dark:text-gray-300">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-gray-600 shrink-0"></div>
                      <p>A server-side request forgery (SSRF) vulnerability in the SAML component allows attackers to bypass authentication.</p>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700 dark:text-gray-300">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-gray-600 shrink-0"></div>
                      <p>Observed in targeted campaigns against aerospace and defense sectors.</p>
                    </li>
                  </ul>

                  <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-gray-700/40">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-gray-200 mb-1">Why it matters to you</h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      You are subscribed to alerts for "Ivanti". This flaw allows unauthenticated access to internal resources and is currently being exploited in the wild.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-gray-800/80">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Suggested Action: Apply patch version 22.4R2.2 immediately.
                    </div>
                  </div>
                </div>
              </article>

              {/* HIGH card */}
              <article className="bg-white dark:bg-[#0e1829] rounded-2xl border border-slate-200 dark:border-gray-800/80 shadow-sm dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:border-amber-900/40">
                <div className="h-1.5 w-full bg-amber-500 dark:bg-amber-500"></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                        <Activity className="w-3.5 h-3.5" />
                        HIGH
                      </span>
                      <span className="text-sm text-slate-500 dark:text-gray-500 font-medium">Threat Campaign</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 dark:text-gray-600">MEDIUM CONFIDENCE</span>
                  </div>

                  <h3 className="text-xl font-bold mb-3 dark:text-white">
                    Scattered Spider Shifts Tactics to Cloud Identity Providers
                  </h3>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-slate-700 dark:text-gray-300">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-gray-600 shrink-0"></div>
                      <p>The threat group is increasingly targeting Okta and Entra ID administrators via sophisticated social engineering.</p>
                    </li>
                    <li className="flex items-start gap-2 text-slate-700 dark:text-gray-300">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-gray-600 shrink-0"></div>
                      <p>Bypassing MFA using prompt bombing and SIM swapping techniques.</p>
                    </li>
                  </ul>

                  <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-gray-700/40">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-gray-200 mb-1">Why it matters to you</h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      Your organization uses Okta (detected via subscriptions). This represents a direct threat to your identity perimeter.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-gray-800/80">
                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-400">
                      <Shield className="w-4 h-4" />
                      Suggested Action: Enforce FIDO2/WebAuthn hardware keys for all admin accounts.
                    </div>
                  </div>
                </div>
              </article>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
