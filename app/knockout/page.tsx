"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUND_LABELS, ROUND_POINTS, slotLabel, type Round } from "@/lib/knockout";

type KOMatch = {
  id: number;
  match_number: number;
  round: Round;
  home_slot: string;
  away_slot: string;
  home_team: string | null;
  away_team: string | null;
  result: "home" | "away" | null;
};

type Preds = Record<number, "home" | "away">;

const ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "third", "final"];

function MatchCard({
  match,
  prediction,
  onPredict,
  saving,
}: {
  match: KOMatch;
  prediction?: "home" | "away";
  onPredict: (matchId: number, side: "home" | "away") => void;
  saving: boolean;
}) {
  const home = match.home_team || slotLabel(match.home_slot);
  const away = match.away_team || slotLabel(match.away_slot);
  const teamsKnown = !!match.home_team && !!match.away_team;
  const locked = match.result !== null;

  const correct = locked && prediction === match.result;
  const wrong = locked && prediction !== undefined && prediction !== match.result;

  return (
    <div className={`rounded-lg border p-3 ${
      correct ? "border-green-600 bg-green-950/40" :
      wrong   ? "border-red-800 bg-red-950/20" :
                "border-gray-800 bg-gray-900"
    }`}>
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span>M{match.match_number}</span>
        <span className="flex gap-2 items-center">
          {saving && <span>saving…</span>}
          {correct && <span className="text-green-400 font-semibold">+{ROUND_POINTS[match.round]} ✓</span>}
          {wrong && match.result && (
            <span className="text-red-400">
              ✗ {match.result === "home" ? match.home_team : match.away_team}
            </span>
          )}
          {!teamsKnown && <span className="text-yellow-700 italic">TBD</span>}
        </span>
      </div>
      <div className="flex gap-1">
        {(["home", "away"] as const).map((side) => {
          const label = side === "home" ? home : away;
          const isSelected = prediction === side;
          const isResult = match.result === side;
          return (
            <button
              key={side}
              disabled={!teamsKnown || locked}
              onClick={() => onPredict(match.id, side)}
              title={!teamsKnown ? "Teams not yet confirmed" : undefined}
              className={`flex-1 py-2 px-2 rounded text-sm font-medium truncate transition-colors ${
                locked
                  ? isSelected
                    ? isResult
                      ? "bg-green-700 text-white"
                      : "bg-red-900/50 text-red-300"
                    : isResult
                      ? "bg-green-900/40 text-green-400 border border-green-700"
                      : "bg-gray-800 text-gray-600"
                  : !teamsKnown
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed italic text-xs"
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
}

export default function KnockoutPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [matches, setMatches] = useState<KOMatch[]>([]);
  const [preds, setPreds] = useState<Preds>({});
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("wc2026_player");
    if (!name) { router.push("/"); return; }
    setPlayer(name);

    fetch(`/api/knockout?player=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then(({ matches: ms, predictions: ps }) => {
        setMatches(ms);
        const map: Preds = {};
        for (const p of ps) map[p.match_id] = p.prediction;
        setPreds(map);
      });
  }, [router]);

  const handlePredict = useCallback(async (matchId: number, side: "home" | "away") => {
    if (!player) return;
    setPreds((prev) => ({ ...prev, [matchId]: side }));
    setSaving((prev) => new Set(prev).add(matchId));
    await fetch("/api/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, matchId, prediction: side }),
    });
    setSaving((prev) => { const s = new Set(prev); s.delete(matchId); return s; });
  }, [player]);

  const total = matches.filter((m) => !!m.home_team && !!m.away_team).length;
  const done = matches.filter((m) => !!m.home_team && !!m.away_team && preds[m.id]).length;

  if (!player) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Knockout Bracket</h1>
          <p className="text-gray-400 text-sm mt-1">
            Playing as <strong className="text-yellow-300">{player}</strong>
            {" · "}Points scale by round (R32=1 → Final=5)
          </p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-400">{done}/{total}</div>
            <div className="text-gray-500 text-xs">predicted</div>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        {ROUNDS.map((r) => (
          <div key={r} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-2">
            <div className="text-gray-500">{ROUND_LABELS[r]}</div>
            <div className="text-yellow-400 font-bold">{ROUND_POINTS[r]} pt{ROUND_POINTS[r] > 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      {ROUNDS.map((round) => {
        const roundMatches = matches.filter((m) => m.round === round);
        if (roundMatches.length === 0) return null;
        return (
          <section key={round} className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">
              {ROUND_LABELS[round]}
              <span className="ml-2 text-yellow-700 font-normal normal-case">{ROUND_POINTS[round]} pt{ROUND_POINTS[round] > 1 ? "s" : ""} each</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={preds[m.id]}
                  onPredict={handlePredict}
                  saving={saving.has(m.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {matches.length === 0 && (
        <p className="text-gray-500">Knockout bracket not set up yet — check back after the group stage.</p>
      )}
    </div>
  );
}
