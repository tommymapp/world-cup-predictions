"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROUND_LABELS, ROUND_POINTS, slotLabel, type Round } from "@/lib/knockout";
import { ALL_TEAMS } from "@/lib/teams";

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

type Preds = Record<number, string>; // matchId → team name

const ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "third", "final"];

function TeamPicker({
  matchId,
  current,
  homeTeam,
  awayTeam,
  homeSlot,
  awaySlot,
  result,
  onPick,
}: {
  matchId: number;
  current: string | undefined;
  homeTeam: string | null;
  awayTeam: string | null;
  homeSlot: string;
  awaySlot: string;
  result: "home" | "away" | null;
  onPick: (matchId: number, team: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const winner = result === "home" ? homeTeam : result === "away" ? awayTeam : null;
  const correct = !!current && !!winner && current === winner;
  const wrong = !!current && !!winner && current !== winner;
  const locked = result !== null;

  // teams confirmed for this match, shown first in the list
  const confirmed = [homeTeam, awayTeam].filter(Boolean) as string[];
  const filtered = ALL_TEAMS.filter(
    (t) => !query || t.toLowerCase().includes(query.toLowerCase())
  );
  const sorted = [
    ...confirmed.filter((t) => filtered.includes(t)),
    ...filtered.filter((t) => !confirmed.includes(t)),
  ];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (locked) {
    return (
      <div className={`rounded px-3 py-2 text-sm font-medium flex items-center justify-between ${
        correct ? "bg-green-900/50 text-green-300" :
        wrong   ? "bg-red-900/30 text-red-300" :
                  "bg-gray-800 text-gray-500 italic"
      }`}>
        <span>{current ?? "No pick"}</span>
        {correct && <span className="text-green-400">✓</span>}
        {wrong && winner && <span className="text-red-400 text-xs">Won: {winner}</span>}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left rounded px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
          current
            ? "bg-yellow-500 text-black font-semibold"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        <span className="truncate">{current ?? "Pick winner…"}</span>
        <span className="shrink-0 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-800">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams…"
              className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {sorted.map((team) => {
              const isConfirmed = confirmed.includes(team);
              return (
                <li key={team}>
                  <button
                    onClick={() => { onPick(matchId, team); setOpen(false); setQuery(""); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-800 transition-colors ${
                      team === current ? "text-yellow-400 font-semibold" : "text-gray-200"
                    }`}
                  >
                    <span>{team}</span>
                    {isConfirmed && (
                      <span className="text-xs text-blue-400 shrink-0 ml-2">in match</span>
                    )}
                  </button>
                </li>
              );
            })}
            {sorted.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-600">No teams match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  prediction,
  onPick,
}: {
  match: KOMatch;
  prediction: string | undefined;
  onPick: (matchId: number, team: string) => void;
}) {
  const home = match.home_team || slotLabel(match.home_slot);
  const away = match.away_team || slotLabel(match.away_slot);
  const winner = match.result === "home" ? match.home_team : match.result === "away" ? match.away_team : null;
  const correct = !!prediction && !!winner && prediction === winner;
  const wrong = !!prediction && !!winner && prediction !== winner;

  return (
    <div className={`rounded-lg border p-3 ${
      correct ? "border-green-600 bg-green-950/40" :
      wrong   ? "border-red-800 bg-red-950/20" :
                "border-gray-800 bg-gray-900"
    }`}>
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span>M{match.match_number} · {ROUND_POINTS[match.round]}pt</span>
        <span>
          {correct && <span className="text-green-400 font-semibold">+{ROUND_POINTS[match.round]} ✓</span>}
          {wrong && winner && <span className="text-red-400">✗ won: {winner}</span>}
        </span>
      </div>

      {/* Show confirmed teams or slot descriptions */}
      <div className="flex items-center gap-1 mb-2 text-sm">
        <span className={`flex-1 truncate font-medium ${match.home_team ? "text-white" : "text-gray-500 italic"}`}>
          {home}
        </span>
        <span className="text-gray-600 shrink-0">vs</span>
        <span className={`flex-1 truncate font-medium text-right ${match.away_team ? "text-white" : "text-gray-500 italic"}`}>
          {away}
        </span>
      </div>

      <TeamPicker
        matchId={match.id}
        current={prediction}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homeSlot={match.home_slot}
        awaySlot={match.away_slot}
        result={match.result}
        onPick={onPick}
      />
    </div>
  );
}

export default function KnockoutPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [matches, setMatches] = useState<KOMatch[]>([]);
  const [preds, setPreds] = useState<Preds>({});
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

  const handlePick = useCallback(async (matchId: number, team: string) => {
    if (!player) return;
    setPreds((prev) => ({ ...prev, [matchId]: team }));
    await fetch("/api/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, matchId, prediction: team }),
    });
  }, [player]);

  const total = matches.length;
  const done = matches.filter((m) => preds[m.id]).length;

  if (!player) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Knockout Bracket</h1>
          <p className="text-gray-400 text-sm mt-1">
            Playing as <strong className="text-yellow-300">{player}</strong>
            {" · "}Pick who wins each match — points scale by round
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{done}/{total}</div>
          <div className="text-gray-500 text-xs">predicted</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        {ROUNDS.map((r) => (
          <div key={r} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-2">
            <div className="text-gray-500 leading-tight">{ROUND_LABELS[r]}</div>
            <div className="text-yellow-400 font-bold">{ROUND_POINTS[r]}pt</div>
          </div>
        ))}
      </div>

      <div className="mb-4 bg-blue-900/20 border border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-300">
        <strong>How it works:</strong> Pick who you think wins each match from all 48 teams.
        Slot descriptions (e.g. <em>Winner Group A</em>) show until admin confirms the actual teams.
        Confirmed teams are highlighted <span className="text-blue-400">in match</span> in the picker.
      </div>

      {ROUNDS.map((round) => {
        const roundMatches = matches.filter((m) => m.round === round);
        if (roundMatches.length === 0) return null;
        return (
          <section key={round} className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">
              {ROUND_LABELS[round]}
              <span className="ml-2 text-yellow-700 font-normal normal-case">
                {ROUND_POINTS[round]}pt each
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={preds[m.id]}
                  onPick={handlePick}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
