"use client";

import { useEffect, useState } from "react";

type MatchRow = { player_name: string; points: string; predicted_played: string };
type AwardScore = { player_name: string; award_points: string };

type CombinedRow = {
  player_name: string;
  matchPoints: number;
  awardPoints: number;
  total: number;
  predicted_played: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(localStorage.getItem("wc2026_player"));

    Promise.all([
      fetch("/api/results").then((r) => r.json()),
      fetch("/api/awards/results").then((r) => r.json()),
    ]).then(([matchRows, { scores }]: [MatchRow[], { scores: AwardScore[] }]) => {
      const awardMap: Record<string, number> = {};
      for (const s of scores) awardMap[s.player_name] = parseInt(s.award_points);

      const allPlayers = new Set([
        ...matchRows.map((r) => r.player_name),
        ...scores.map((s) => s.player_name),
      ]);

      const combined: CombinedRow[] = [...allPlayers].map((name) => {
        const m = matchRows.find((r) => r.player_name === name);
        const matchPoints = m ? parseInt(m.points) : 0;
        const awardPoints = awardMap[name] ?? 0;
        return {
          player_name: name,
          matchPoints,
          awardPoints,
          total: matchPoints + awardPoints,
          predicted_played: m ? parseInt(m.predicted_played) : 0,
        };
      });

      combined.sort((a, b) => b.total - a.total || a.player_name.localeCompare(b.player_name));
      setRows(combined);
      setLoading(false);
    });
  }, []);

  const maxPoints = rows.length > 0 ? rows[0].total : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-gray-400 text-sm mb-6">Match results + awards — updates as results are entered</p>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">No results yet — check back once matches have been played.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => {
            const isMe = row.player_name === me;
            const matchPct = row.predicted_played > 0
              ? Math.round((row.matchPoints / row.predicted_played) * 100)
              : 0;

            return (
              <div
                key={row.player_name}
                className={`rounded-lg border p-4 flex items-center gap-4 ${
                  isMe ? "border-yellow-600 bg-yellow-900/20" : "border-gray-800 bg-gray-900"
                }`}
              >
                <div className={`text-2xl font-bold w-8 text-center ${
                  i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {row.player_name} {isMe && <span className="text-yellow-400 text-sm">(you)</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                    <span>⚽ {row.matchPoints} matches ({matchPct}%)</span>
                    {row.awardPoints > 0 && <span>🏆 {row.awardPoints} awards</span>}
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: maxPoints > 0 ? `${(row.total / maxPoints) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-yellow-400">{row.total}</div>
                  <div className="text-xs text-gray-500">pts total</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
