"use client";

import { useEffect, useState } from "react";

type GroupScore = { player_name: string; group_points: string };
type AwardScore = { player_name: string; award_points: string };
type KoScore = { player_name: string; knockout_points: string };

type Row = {
  player_name: string;
  groupPoints: number;
  awardPoints: number;
  knockoutPoints: number;
  total: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(localStorage.getItem("wc2026_player"));

    Promise.all([
      fetch("/api/players").then((r) => r.json()) as Promise<string[]>,
      fetch("/api/group-results").then((r) => r.json()),
      fetch("/api/awards/results").then((r) => r.json()),
      fetch("/api/knockout/results").then((r) => r.json()),
    ]).then(([players, { scores: gs }, { scores: as_ }, { scores: ks }]: [
      string[],
      { scores: GroupScore[] },
      { scores: AwardScore[] },
      { scores: KoScore[] },
    ]) => {
      const groupMap: Record<string, number> = {};
      for (const s of gs) groupMap[s.player_name] = parseInt(s.group_points);

      const awardMap: Record<string, number> = {};
      for (const s of as_) awardMap[s.player_name] = parseInt(s.award_points);

      const koMap: Record<string, number> = {};
      for (const s of ks) koMap[s.player_name] = parseInt(s.knockout_points);

      const combined: Row[] = players.map((name) => {
        const groupPoints    = groupMap[name]  ?? 0;
        const awardPoints    = awardMap[name]  ?? 0;
        const knockoutPoints = koMap[name]     ?? 0;
        return { player_name: name, groupPoints, awardPoints, knockoutPoints, total: groupPoints + awardPoints + knockoutPoints };
      });

      combined.sort((a, b) => b.total - a.total || a.player_name.localeCompare(b.player_name));
      setRows(combined);
      setLoading(false);
    });
  }, []);

  const maxPoints = rows.length > 0 ? rows[0].total : 0;

  // Shared rank: players tied on the same total get the same rank number
  function rank(i: number): number {
    if (i === 0) return 1;
    return rows[i].total === rows[i - 1].total ? rank(i - 1) : i + 1;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-gray-400 text-sm mb-6">Updates live as results are entered</p>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">No players yet — add yourself on the home page.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => {
            const isMe = row.player_name === me;
            const r = rank(i);
            const rankColour =
              r === 1 ? "text-yellow-400" :
              r === 2 ? "text-gray-300" :
              r === 3 ? "text-amber-600" :
                        "text-gray-600";

            return (
              <div
                key={row.player_name}
                className={`rounded-lg border p-4 flex items-center gap-4 ${
                  isMe ? "border-yellow-600 bg-yellow-900/20" : "border-gray-800 bg-gray-900"
                }`}
              >
                <div className={`text-2xl font-bold w-8 text-center shrink-0 ${rankColour}`}>
                  {r}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {row.player_name}
                    {isMe && <span className="ml-2 text-yellow-400 text-sm">(you)</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {row.groupPoints > 0    && <span>📊 {row.groupPoints} groups</span>}
                    {row.awardPoints > 0    && <span>🏆 {row.awardPoints} awards</span>}
                    {row.knockoutPoints > 0 && <span>🥊 {row.knockoutPoints} bracket</span>}
                    {row.total === 0        && <span className="italic">no points yet</span>}
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: maxPoints > 0 ? `${(row.total / maxPoints) * 100}%` : "0%" }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-xl font-bold ${row.total > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                    {row.total}
                  </div>
                  <div className="text-xs text-gray-500">pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
