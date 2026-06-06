"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUND_LABELS, ROUND_POINTS, slotLabel, type Round } from "@/lib/knockout";
import { ALL_TEAMS } from "@/lib/teams";

type KOMatch = {
  id: number;
  match_number: number;
  round: Round;
  home_slot: string;
  away_slot: string;
  home_team: string | null; // admin-confirmed real team (overrides predictions)
  away_team: string | null;
  result: "home" | "away" | null;
};

type GroupPreds = Record<string, Record<number, string>>; // group → position → team
type KOPreds = Record<number, string>; // matchId → predicted winner team

const ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "third", "final"];

// ── Slot resolver ─────────────────────────────────────────────────────────────
// Recursively resolves a slot code to a team name using the user's own predictions.
// Returns null if the slot can't be resolved yet (e.g. missing earlier predictions).

function makeResolver(
  groupPreds: GroupPreds,
  koPreds: KOPreds,
  matchesByNum: Map<number, KOMatch>,
  memo = new Map<string, string | null>()
) {
  function resolve(slot: string): string | null {
    if (memo.has(slot)) return memo.get(slot)!;

    let result: string | null = null;

    if (slot.startsWith("1")) {
      result = groupPreds[slot.slice(1)]?.[1] ?? null;
    } else if (slot.startsWith("2")) {
      result = groupPreds[slot.slice(1)]?.[2] ?? null;
    } else if (slot.startsWith("3")) {
      // 3rd-place slots depend on which 8 groups produce qualifying 3rds —
      // can't auto-resolve without knowing the full group points table.
      result = null;
    } else if (slot.startsWith("W")) {
      const matchNum = parseInt(slot.slice(1));
      const match = matchesByNum.get(matchNum);
      if (match) {
        // Admin-confirmed real team takes priority
        const adminHome = cleanTeam(match.home_team);
        const adminAway = cleanTeam(match.away_team);
        if (match.result === "home" && adminHome) result = adminHome;
        else if (match.result === "away" && adminAway) result = adminAway;
        else result = koPreds[match.id] ?? null;
      }
    } else if (slot.startsWith("L")) {
      const matchNum = parseInt(slot.slice(1));
      const match = matchesByNum.get(matchNum);
      if (match) {
        const adminHome = cleanTeam(match.home_team);
        const adminAway = cleanTeam(match.away_team);
        const predictedWinner =
          match.result === "home" ? adminHome :
          match.result === "away" ? adminAway :
          koPreds[match.id] ?? null;
        if (predictedWinner) {
          const home = adminHome ?? resolve(match.home_slot);
          const away = adminAway ?? resolve(match.away_slot);
          result = predictedWinner === home ? away : predictedWinner === away ? home : null;
        }
      }
    }

    memo.set(slot, result);
    return result;
  }
  return resolve;
}

// Strip wikitext / null-guard for admin-confirmed team names
function cleanTeam(t: string | null | undefined): string | null {
  if (!t) return null;
  if (t.includes("{{") || t.includes("[[") || t.includes("invoke")) return null;
  return t;
}

// ── Team picker ───────────────────────────────────────────────────────────────

function TeamPicker({
  matchId,
  current,
  expectedHome,
  expectedAway,
  result,
  onPick,
}: {
  matchId: number;
  current: string | undefined;
  expectedHome: string | null;
  expectedAway: string | null;
  result: "home" | "away" | null;
  onPick: (matchId: number, team: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const locked = result !== null;
  const winner =
    result === "home" ? expectedHome :
    result === "away" ? expectedAway : null;

  const confirmed = [expectedHome, expectedAway].filter(Boolean) as string[];
  const filtered = ALL_TEAMS.filter(t => !query || t.toLowerCase().includes(query.toLowerCase()));
  const sorted = [...confirmed.filter(t => filtered.includes(t)), ...filtered.filter(t => !confirmed.includes(t))];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById(`picker-${matchId}`);
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, matchId]);

  if (locked) {
    const correct = !!current && !!winner && current === winner;
    const wrong = !!current && !!winner && current !== winner;
    return (
      <div className={`rounded px-3 py-2 text-sm font-medium flex items-center justify-between ${
        correct ? "bg-green-900/50 text-green-300" :
        wrong   ? "bg-red-900/30 text-red-300" :
                  "bg-gray-800 text-gray-500 italic"
      }`}>
        <span>{current ?? "No pick"}</span>
        {correct && <span className="text-green-400">✓</span>}
        {wrong && winner && <span className="text-xs text-red-400">Won: {winner}</span>}
      </div>
    );
  }

  return (
    <div id={`picker-${matchId}`} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full text-left rounded px-3 py-2 text-sm flex items-center justify-between gap-2 ${
          current ? "bg-yellow-500 text-black font-semibold" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        <span className="truncate">{current ?? "Pick winner…"}</span>
        <span className="text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-800">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {sorted.map(team => (
              <li key={team}>
                <button
                  onClick={() => { onPick(matchId, team); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-800 ${
                    team === current ? "text-yellow-400 font-semibold" : "text-gray-200"
                  }`}
                >
                  <span>{team}</span>
                  {confirmed.includes(team) && <span className="text-xs text-blue-400 shrink-0 ml-2">predicted here</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  prediction,
  resolve,
  onPick,
}: {
  match: KOMatch;
  prediction: string | undefined;
  resolve: (slot: string) => string | null;
  onPick: (matchId: number, team: string) => void;
}) {
  const adminHome = cleanTeam(match.home_team);
  const adminAway = cleanTeam(match.away_team);

  const expectedHome = adminHome ?? resolve(match.home_slot);
  const expectedAway = adminAway ?? resolve(match.away_slot);

  // What to show as the label for each side
  const homeLabel = expectedHome ?? slotLabel(match.home_slot);
  const awayLabel = expectedAway ?? slotLabel(match.away_slot);
  const homeKnown = !!expectedHome;
  const awayKnown = !!expectedAway;

  const winner =
    match.result === "home" ? (adminHome ?? expectedHome) :
    match.result === "away" ? (adminAway ?? expectedAway) : null;

  const correct = !!prediction && !!winner && prediction === winner;
  const wrong   = !!prediction && !!winner && prediction !== winner;

  return (
    <div className={`rounded-lg border p-3 ${
      correct ? "border-green-600 bg-green-950/40" :
      wrong   ? "border-red-800 bg-red-950/20" :
                "border-gray-800 bg-gray-900"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span>M{match.match_number} · {ROUND_POINTS[match.round]}pt</span>
        <span>
          {correct && <span className="text-green-400 font-semibold">+{ROUND_POINTS[match.round]} ✓</span>}
          {wrong && winner && <span className="text-red-400">✗ {winner}</span>}
        </span>
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-1 mb-2 text-sm">
        <span className={`flex-1 truncate font-medium ${homeKnown ? "text-white" : "text-gray-500 italic text-xs"}`}>
          {homeLabel}
        </span>
        <span className="text-gray-600 shrink-0 text-xs">vs</span>
        <span className={`flex-1 truncate font-medium text-right ${awayKnown ? "text-white" : "text-gray-500 italic text-xs"}`}>
          {awayLabel}
        </span>
      </div>

      <TeamPicker
        matchId={match.id}
        current={prediction}
        expectedHome={expectedHome}
        expectedAway={expectedAway}
        result={match.result}
        onPick={onPick}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KnockoutPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [matches, setMatches] = useState<KOMatch[]>([]);
  const [koPreds, setKoPreds] = useState<KOPreds>({});
  const [groupPreds, setGroupPreds] = useState<GroupPreds>({});
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("wc2026_player");
    if (!name) { router.push("/"); return; }
    setPlayer(name);

    Promise.all([
      fetch(`/api/knockout?player=${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`/api/group-predictions?player=${encodeURIComponent(name)}`).then(r => r.json()),
    ]).then(([{ matches: ms, predictions: ps }, gpRows]) => {
      setMatches(ms);

      const ko: KOPreds = {};
      for (const p of ps) ko[p.match_id] = p.prediction;
      setKoPreds(ko);

      const gp: GroupPreds = {};
      for (const row of gpRows) {
        if (!gp[row.group_name]) gp[row.group_name] = {};
        gp[row.group_name][row.position] = row.team;
      }
      setGroupPreds(gp);
    });
  }, [router]);

  const handlePick = useCallback(async (matchId: number, team: string) => {
    if (!player) return;
    setKoPreds(prev => ({ ...prev, [matchId]: team }));
    await fetch("/api/knockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, matchId, prediction: team }),
    });
  }, [player]);

  const matchesByNum = new Map(matches.map(m => [m.match_number, m]));
  const resolve = makeResolver(groupPreds, koPreds, matchesByNum);

  const total = matches.length;
  const done  = matches.filter(m => koPreds[m.id]).length;

  // How many slots can be shown (have a resolved team or admin-confirmed team)
  const resolvable = matches.filter(m =>
    cleanTeam(m.home_team) ?? resolve(m.home_slot) ??
    cleanTeam(m.away_team) ?? resolve(m.away_slot)
  ).length;

  if (!player) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Knockout Bracket</h1>
          <p className="text-gray-400 text-sm mt-1">
            Playing as <strong className="text-yellow-300">{player}</strong>
            {" · "}Teams are filled from your group stage predictions
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{done}/{total}</div>
          <div className="text-gray-500 text-xs">predicted</div>
        </div>
      </div>

      {/* Points key */}
      <div className="mb-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        {ROUNDS.map(r => (
          <div key={r} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-2">
            <div className="text-gray-500 leading-tight">{ROUND_LABELS[r]}</div>
            <div className="text-yellow-400 font-bold">{ROUND_POINTS[r]}pt</div>
          </div>
        ))}
      </div>

      {/* Hint if group predictions incomplete */}
      {resolvable < total && (
        <div className="mb-4 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400">
          Slots shown in <em className="text-gray-300">italics</em> can&apos;t be resolved yet — fill in your group stage predictions and they&apos;ll populate automatically.
          Third-place slots always stay TBD until the group stage is complete.
        </div>
      )}

      {ROUNDS.map(round => {
        const roundMatches = matches.filter(m => m.round === round);
        if (!roundMatches.length) return null;
        return (
          <section key={round} className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">
              {ROUND_LABELS[round]}
              <span className="ml-2 text-yellow-700 font-normal normal-case">{ROUND_POINTS[round]}pt each</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roundMatches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={koPreds[m.id]}
                  resolve={resolve}
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
