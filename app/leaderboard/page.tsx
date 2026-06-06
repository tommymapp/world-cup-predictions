"use client";

import { useEffect, useState } from "react";

type GroupScore = { player_name: string; group_points: string };
type AwardScore = { player_name: string; award_points: string };
type KoScore = { player_name: string; knockout_points: string };

type CombinedRow = {
  player_name: string;
  groupPoints: number;
  awardPoints: number;
  knockoutPoints: number;
  total: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(localStorage.getItem("wc2026_player"));

    Promise.all([
      fetch("/api/group-results").then((r) => r.json()),
      fetch("/api/awards/results").then((r) => r.json()),
      fetch("/api/knockout/results").then((r) => r.json()),
    ]).then(([{ scores: groupScores }, { scores: awardScores }, { scores: koScores }]: [{ scores: GroupScore[] }, { scores: AwardScore[] }, { scores: KoScore[] }]) => {
      const groupMap: Record<string, number> = {};
      for (const s of groupScores) groupMap[s.player_name] = parseInt(s.group_points);

      const awardMap: Record<string, number> = {};
      for (const s of awardScores) awardMap[s.player_name] = parseInt(s.award_points);

      const koMap: Record<string, number> = {};
      for (const s of koScores) koMap[s.player_name] = parseInt(s.knockout_points);

      const allPlayers = new Set([
        ...groupScores.map((s) => s.player_name),
        ...awardScores.map((s) => s.player_name),
        ...koScores.map((s) => s.player_name),
      ]);

      const combined: CombinedRow[] = [...allPlayers].map((name) => {
        const groupPoints = groupMap[name] ?? 0;
        const awardPoints = awardMap[name] ?? 0;
        const knockoutPoints = koMap[name] ?? 0;
        return {
          player_name: name,
          groupPoints,
          awardPoints,
          knockoutPoints,
          total: groupPoints + awardPoints + knockoutPoints,
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
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {row.groupPoints > 0 && <span>📊 {row.groupPoints} groups</span>}
                    {row.awardPoints > 0 && <span>🏆 {row.awardPoints} awards</span>}
                    {row.knockoutPoints > 0 && <span>🥊 {row.knockoutPoints} bracket</span>}
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
