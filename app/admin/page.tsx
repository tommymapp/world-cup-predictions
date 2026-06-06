"use client";

import { useEffect, useState } from "react";
import { INDIVIDUAL_AWARDS, TEAM_POSITIONS } from "@/lib/awards";

type Match = {
  id: number;
  group_name: string;
  home_team: string;
  away_team: string;
  match_date: string;
  result: "home" | "draw" | "away" | null;
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbWarning, setDbWarning] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [awardResults, setAwardResults] = useState<Record<string, string>>({});
  const [awardDrafts, setAwardDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const s = sessionStorage.getItem("wc_admin_secret");
    if (s) { setSecret(s); doLogin(s); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLogin(s: string) {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: s }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(
          res.status === 401 ? "Invalid secret." :
          res.status === 503 ? `Cannot reach database: ${data.detail ?? data.error}` :
          data.error ?? "Unknown error"
        );
        sessionStorage.removeItem("wc_admin_secret");
      } else {
        sessionStorage.setItem("wc_admin_secret", s);
        if (!data.tablesExist) {
          setDbWarning("Tables not found — click \"Init DB / Reseed\" to set up the database.");
        }
        setAuthed(true);
      }
    } catch {
      setLoginError("Network error — could not reach the server.");
    }
    setLoginLoading(false);
  }

  function login() {
    if (!secret.trim()) return;
    doLogin(secret);
  }

  useEffect(() => {
    if (!authed) return;
    fetch("/api/matches").then((r) => r.json()).then(setMatches);
    fetch("/api/awards/results").then((r) => r.json()).then(({ results }) => {
      const map: Record<string, string> = {};
      for (const row of results) map[row.award_key] = row.value;
      setAwardResults(map);
      setAwardDrafts(map);
    });
  }, [authed]);

  async function setResult(matchId: number, result: "home" | "draw" | "away" | null) {
    setSaving(matchId);
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, matchId, result }),
    });
    if (res.ok) {
      setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, result } : m));
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    } else {
      const err = await res.json();
      setStatus(err.error || "Error");
    }
    setSaving(null);
  }

  async function runSetup() {
    setStatus("Setting up database…");
    const res = await fetch("/api/setup", { method: "POST" });
    if (res.ok) {
      setStatus("Database ready!");
      setDbWarning("");
      const updated = await fetch("/api/matches").then((r) => r.json());
      setMatches(updated);
    } else {
      const err = await res.json().catch(() => ({}));
      setStatus(`Setup failed: ${err.error ?? res.statusText}`);
    }
  }

  async function saveAward(awardKey: string, value: string) {
    const res = await fetch("/api/awards/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, awardKey, value }),
    });
    if (res.ok) {
      setAwardResults((prev) => ({ ...prev, [awardKey]: value }));
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    }
  }

  const groups = [...new Set(matches.map((m) => m.group_name))].sort();
  const now = new Date();

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-xl font-bold mb-4">Admin</h1>
        <p className="text-gray-400 text-sm mb-4">Enter your ADMIN_SECRET to continue.</p>
        <input
          type="password"
          value={secret}
          onChange={(e) => { setSecret(e.target.value); setLoginError(""); }}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Admin secret"
          className={`w-full bg-gray-800 border rounded px-3 py-2 text-sm mb-3 focus:outline-none ${
            loginError ? "border-red-500 focus:border-red-400" : "border-gray-700 focus:border-yellow-500"
          }`}
        />
        {loginError && (
          <p className="text-red-400 text-sm mb-3">{loginError}</p>
        )}
        <button
          onClick={login}
          disabled={loginLoading || !secret.trim()}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold py-2 rounded text-sm"
        >
          {loginLoading ? "Checking…" : "Enter"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {dbWarning && (
        <div className="mb-4 bg-yellow-900/40 border border-yellow-600 rounded-lg px-4 py-3 text-yellow-300 text-sm">
          ⚠ {dbWarning}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin — Enter Results</h1>
        <div className="flex items-center gap-3">
          {status && <span className="text-sm text-green-400">{status}</span>}
          <button
            onClick={runSetup}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm"
          >
            Init DB / Reseed
          </button>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Individual Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {INDIVIDUAL_AWARDS.map((award) => (
            <div key={award.key} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {award.icon} {award.label}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={awardDrafts[award.key] ?? ""}
                  onChange={(e) => setAwardDrafts((p) => ({ ...p, [award.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveAward(award.key, awardDrafts[award.key] ?? "")}
                  placeholder="Player name…"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={() => saveAward(award.key, awardDrafts[award.key] ?? "")}
                  className="bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm"
                >
                  Set
                </button>
              </div>
              {awardResults[award.key] && (
                <p className="text-xs text-green-400 mt-1">Current: {awardResults[award.key]}</p>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Team of the Tournament</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[{ key: "team_gk", label: "GK" }, ...TEAM_POSITIONS.filter((p) => p.key !== "team_gk")].map((pos) => (
            <div key={pos.key} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <label className="block text-xs font-bold text-gray-500 mb-1">{pos.label}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={awardDrafts[pos.key] ?? ""}
                  onChange={(e) => setAwardDrafts((p) => ({ ...p, [pos.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveAward(pos.key, awardDrafts[pos.key] ?? "")}
                  placeholder="Player…"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={() => saveAward(pos.key, awardDrafts[pos.key] ?? "")}
                  className="bg-green-700 hover:bg-green-600 text-white px-2 py-1.5 rounded text-sm"
                >
                  ✓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-6">Match Results</h2>
      {groups.map((group) => (
        <div key={group} className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Group {group}</h2>
          <div className="flex flex-col gap-2">
            {matches.filter((m) => m.group_name === group).map((match) => {
              const played = new Date(match.match_date) < now;
              return (
                <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                    <span>{new Date(match.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    {!played && <span className="text-xs text-yellow-600">upcoming</span>}
                  </div>
                  <div className="flex gap-1">
                    {(["home", "draw", "away"] as const).map((opt) => {
                      const label = opt === "home" ? match.home_team : opt === "away" ? match.away_team : "Draw";
                      const selected = match.result === opt;
                      return (
                        <button
                          key={opt}
                          disabled={saving === match.id}
                          onClick={() => setResult(match.id, selected ? null : opt)}
                          className={`flex-1 py-2 px-1 rounded text-sm font-medium truncate transition-colors ${
                            selected
                              ? "bg-green-600 text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
