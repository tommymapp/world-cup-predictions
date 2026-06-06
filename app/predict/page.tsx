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

export default function PredictPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [preds, setPreds] = useState<Predictions>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
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

      const groups = [...new Set(ms.map((m: Match) => m.group_name))].sort();
      setActiveGroup(groups[0] ?? null);
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
  const groupMatches = matches.filter((m) => m.group_name === activeGroup);

  // Per-group summary: predicted / total, and points earned
  function groupStats(group: string) {
    const gm = matches.filter((m) => m.group_name === group);
    const predicted = gm.filter((m) => preds[m.id]).length;
    const points = gm.filter((m) => m.result !== null && preds[m.id] === m.result).length;
    const played = gm.filter((m) => m.result !== null).length;
    return { predicted, total: gm.length, points, played };
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Group Stage Predictions</h1>
          <p className="text-gray-400 text-sm mt-1">
            Playing as <strong className="text-yellow-300">{player}</strong>
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{done}/{total}</div>
          <div className="text-gray-500 text-xs">predicted</div>
        </div>
      </div>

      {/* Group tab grid */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-6">
        {groups.map((group) => {
          const { predicted, total: gt, points, played } = groupStats(group);
          const complete = predicted === gt;
          const active = group === activeGroup;
          return (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`relative rounded-lg border py-2 flex flex-col items-center transition-colors ${
                active
                  ? "border-yellow-500 bg-yellow-900/30 text-yellow-300"
                  : complete
                    ? "border-green-800 bg-green-950/30 text-gray-300 hover:border-gray-600"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600"
              }`}
            >
              <span className="text-sm font-bold">{group}</span>
              <span className="text-xs text-gray-500 mt-0.5">{predicted}/{gt}</span>
              {played > 0 && (
                <span className={`text-xs font-semibold ${points > 0 ? "text-green-400" : "text-gray-600"}`}>
                  {points}pt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active group matches */}
      {activeGroup && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Group {activeGroup}</h2>
            {(() => {
              const { predicted, total: gt, points, played } = groupStats(activeGroup);
              return (
                <div className="flex gap-3 text-sm text-gray-400">
                  <span>{predicted}/{gt} predicted</span>
                  {played > 0 && <span className="text-green-400">{points}/{played} correct</span>}
                </div>
              );
            })()}
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {groupMatches.map((match) => {
              const locked = match.result !== null || new Date(match.match_date) < now;
              const current = preds[match.id];
              const correct = match.result !== null && current === match.result;
              const wrong = match.result !== null && current !== undefined && current !== match.result;

              return (
                <div
                  key={match.id}
                  className={`rounded-lg border p-3 ${
                    correct ? "border-green-600 bg-green-950/40" :
                    wrong   ? "border-red-800 bg-red-950/20" :
                              "border-gray-800 bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(match.match_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
                      })}
                    </span>
                    {correct && <span className="text-xs text-green-400 font-semibold">+1 ✓</span>}
                    {wrong   && <span className="text-xs text-red-400">✗</span>}
                    {saving === match.id && <span className="text-xs text-gray-500">saving…</span>}
                    {saved.has(match.id) && saving !== match.id && <span className="text-xs text-green-500">saved</span>}
                  </div>
                  <div className="flex gap-1">
                    {(["home", "draw", "away"] as const).map((opt) => {
                      const label = opt === "home" ? match.home_team : opt === "away" ? match.away_team : "Draw";
                      const isSelected = current === opt;
                      const isResult = match.result === opt;
                      return (
                        <button
                          key={opt}
                          disabled={locked}
                          onClick={() => predict(match.id, opt)}
                          className={`flex-1 py-2 px-1 rounded text-sm font-medium transition-colors truncate ${
                            locked
                              ? isSelected
                                ? isResult ? "bg-green-700 text-white" : "bg-red-900/50 text-red-300"
                                : isResult ? "bg-green-900/40 text-green-400 border border-green-700" : "bg-gray-800 text-gray-600 cursor-not-allowed"
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

          {/* Prev / Next group navigation */}
          <div className="flex gap-2">
            {groups.indexOf(activeGroup) > 0 && (
              <button
                onClick={() => setActiveGroup(groups[groups.indexOf(activeGroup) - 1])}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm"
              >
                ← Group {groups[groups.indexOf(activeGroup) - 1]}
              </button>
            )}
            {groups.indexOf(activeGroup) < groups.length - 1 && (
              <button
                onClick={() => setActiveGroup(groups[groups.indexOf(activeGroup) + 1])}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm"
              >
                Group {groups[groups.indexOf(activeGroup) + 1]} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
