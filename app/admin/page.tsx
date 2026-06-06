"use client";

import { useEffect, useState } from "react";

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
  const [matches, setMatches] = useState<Match[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const s = sessionStorage.getItem("wc_admin_secret");
    if (s) { setSecret(s); setAuthed(true); }
  }, []);

  async function login() {
    const res = await fetch("/api/matches");
    if (res.ok) {
      sessionStorage.setItem("wc_admin_secret", secret);
      setMatched(await res.json());
      setAuthed(true);
    }
  }

  function setMatched(data: Match[]) {
    setMatches(data);
  }

  useEffect(() => {
    if (authed) fetch("/api/matches").then((r) => r.json()).then(setMatches);
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
      setStatus("Database ready! Refresh matches.");
      const updated = await fetch("/api/matches").then((r) => r.json());
      setMatches(updated);
    } else {
      setStatus("Setup failed");
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
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Admin secret"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-yellow-500"
        />
        <button
          onClick={login}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded text-sm"
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div>
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
