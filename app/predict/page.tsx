"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Match = {
  id: number;
  group_name: string;
  home_team: string;
  away_team: string;
  match_date: string;
  result: "home" | "draw" | "away" | null;
};

type Predictions = Record<number, "home" | "draw" | "away">;

const OPTS = [
  { value: "home", label: (home: string) => home },
  { value: "draw", label: () => "Draw" },
  { value: "away", label: (_: string, away: string) => away },
] as const;

export default function PredictPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [preds, setPreds] = useState<Predictions>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("wc2026_player");
    if (!name) { router.push("/"); return; }
    setPlayer(name);

    Promise.all([
      fetch("/api/matches").then((r) => r.json()),
      fetch(`/api/predictions?player=${encodeURIComponent(name)}`).then((r) => r.json()),
    ]).then(([ms, ps]: [Match[], { match_id: number; prediction: string }[]]) => {
      setMatches(ms);
      const map: Predictions = {};
      for (const p of ps) map[p.match_id] = p.prediction as "home" | "draw" | "away";
      setPreds(map);
    });
  }, [router]);

  const predict = useCallback(async (matchId: number, prediction: "home" | "draw" | "away") => {
    if (!player) return;
    setPreds((prev) => ({ ...prev, [matchId]: prediction }));
    setSaving(matchId);
    await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, matchId, prediction }),
    });
    setSaving(null);
    setSaved((prev) => new Set(prev).add(matchId));
    setTimeout(() => setSaved((prev) => { const s = new Set(prev); s.delete(matchId); return s; }), 1500);
  }, [player]);

  const groups = [...new Set(matches.map((m) => m.group_name))].sort();
  const now = new Date();

  if (!player) return null;

  const total = matches.length;
  const done = Object.keys(preds).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Predictions</h1>
          <p className="text-gray-400 text-sm mt-1">Playing as <strong className="text-yellow-300">{player}</strong></p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{done}/{total}</div>
          <div className="text-gray-500 text-xs">predicted</div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group} className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Group {group}</h2>
          <div className="flex flex-col gap-2">
            {matches.filter((m) => m.group_name === group).map((match) => {
              const locked = match.result !== null || new Date(match.match_date) < now;
              const current = preds[match.id];
              const correct = match.result !== null && current === match.result;
              const wrong = match.result !== null && current !== undefined && current !== match.result;

              return (
                <div
                  key={match.id}
                  className={`rounded-lg border p-3 ${
                    correct ? "border-green-600 bg-green-950/40" :
                    wrong ? "border-red-800 bg-red-950/20" :
                    "border-gray-800 bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(match.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                    </span>
                    {correct && <span className="text-xs text-green-400 font-semibold">+1 point ✓</span>}
                    {wrong && <span className="text-xs text-red-400">✗</span>}
                    {saving === match.id && <span className="text-xs text-gray-500">saving…</span>}
                    {saved.has(match.id) && saving !== match.id && <span className="text-xs text-green-500">saved</span>}
                  </div>
                  <div className="flex gap-1">
                    {OPTS.map((opt) => {
                      const label = opt.value === "home" ? match.home_team :
                                    opt.value === "away" ? match.away_team : "Draw";
                      const isSelected = current === opt.value;
                      const isResult = match.result === opt.value;
                      return (
                        <button
                          key={opt.value}
                          disabled={locked}
                          onClick={() => predict(match.id, opt.value)}
                          className={`flex-1 py-2 px-1 rounded text-sm font-medium transition-colors truncate ${
                            locked
                              ? isSelected
                                ? isResult
                                  ? "bg-green-700 text-white"
                                  : "bg-red-900/50 text-red-300"
                                : isResult
                                  ? "bg-green-900/40 text-green-400 border border-green-700"
                                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
                              : isSelected
                                ? "bg-yellow-500 text-black"
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
