"use client";

import { useEffect, useState } from "react";

type Row = { player_name: string; points: string; predicted_played: string };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(localStorage.getItem("wc2026_player"));
    fetch("/api/results")
      .then((r) => r.json())
      .then((data) => { setRows(data); setLoading(false); });
  }, []);

  const maxPoints = rows.length > 0 ? parseInt(rows[0].points) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-gray-400 text-sm mb-6">Updates as results are entered</p>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">No results yet — check back once matches have been played.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => {
            const pts = parseInt(row.points);
            const played = parseInt(row.predicted_played);
            const pct = played > 0 ? Math.round((pts / played) * 100) : 0;
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
                  <div className="h-1.5 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: maxPoints > 0 ? `${(pts / maxPoints) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-yellow-400">{pts}</div>
                  <div className="text-xs text-gray-500">{pct}% of {played}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
