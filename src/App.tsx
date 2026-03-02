/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";

type Brief = {
  title?: string;
  summaryBullets?: string[];
  whyItMatters?: string;
  suggestedAction?: string;
  confidence?: string;
};

type ApiError = {
  status?: number;
  code?: string;
  message: string;
};

export default function App() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const loadBrief = async () => {
      try {
        const response = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw {
            status: response.status,
            code: payload.code,
            message: payload.details || payload.error || `Request failed: ${response.status}`,
          };
        }

        setBrief(payload.brief ?? {});
      } catch (err) {
        if (typeof err === "object" && err !== null && "message" in err) {
          const apiError = err as ApiError;
          setError(apiError);
          return;
        }
        setError({ message: "Unknown error" });
      }
    };

    loadBrief();
  }, []);

  const confidence = brief?.confidence || "UNKNOWN";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SecurePulse</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Today's Intelligence Brief</h2>
          <p className="text-slate-500">Fetched from backend API • {new Date().toLocaleDateString()}</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Unable to load brief</p>
            {error.status === 503 && error.code === "GEMINI_NOT_CONFIGURED" ? (
              <p className="text-sm">Gemini is not configured on the server. Add the Gemini server API key to your backend environment and restart.</p>
            ) : (
              <p className="text-sm">{error.message}</p>
            )}
          </div>
        ) : !brief ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">Loading brief…</div>
        ) : (
          <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-1.5 w-full bg-indigo-500"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  DAILY BRIEF
                </span>
                <span className="text-xs font-mono text-slate-400">{confidence} CONFIDENCE</span>
              </div>

              <h3 className="text-xl font-bold mb-3">{brief.title || "No title returned"}</h3>

              <ul className="space-y-2 mb-6">
                {(brief.summaryBullets || []).map((bullet, idx) => (
                  <li key={`${idx}-${bullet.slice(0, 12)}`} className="flex items-start gap-2 text-slate-700">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                    <p>{bullet}</p>
                  </li>
                ))}
              </ul>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-1">Why it matters</h4>
                <p className="text-sm text-slate-600">{brief.whyItMatters || "No impact narrative returned."}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                  Suggested Action: {brief.suggestedAction || "No recommendation returned."}
                </div>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
