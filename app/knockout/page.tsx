"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUND_LABELS, ROUND_POINTS, slotLabel, type Round } from "@/lib/knockout";
import { ALL_TEAMS } from "@/lib/teams";
import { thirdPlaceGroups, THIRD_PLACE_MATCH_ORDER } from "@/lib/third-place";

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

type GroupPreds = Record<string, Record<number, string>>;
type KOPreds = Record<number, string>;
// qualifyingGroups: which 8 of 12 groups' 3rd-place teams the user thinks advance
// thirdAssignments: matchNumber → groupLetter whose 3rd-place team plays there
type ThirdAssignments = Record<number, string>;

const ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "third", "final"];
const ALL_GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function cleanTeam(t: string | null | undefined): string | null {
  if (!t) return null;
  if (t.includes("{{") || t.includes("[[") || t.includes("invoke")) return null;
  return t;
}

// ── Slot resolver ─────────────────────────────────────────────────────────────

function makeResolver(
  groupPreds: GroupPreds,
  koPreds: KOPreds,
  thirdAssignments: ThirdAssignments,
  matchesByNum: Map<number, KOMatch>,
  memo = new Map<string, string | null>()
) {
  function resolve(slot: string): string | null {
    if (memo.has(slot)) return memo.get(slot) ?? null;

    let result: string | null = null;

    if (slot.startsWith("1")) {
      result = groupPreds[slot.slice(1)]?.[1] ?? null;
    } else if (slot.startsWith("2")) {
      result = groupPreds[slot.slice(1)]?.[2] ?? null;
    } else if (slot.startsWith("3")) {
      // Resolved via third-place table lookup
      const matchNum = getMatchNumForThirdSlot(slot, matchesByNum);
      if (matchNum && thirdAssignments[matchNum]) {
        const group = thirdAssignments[matchNum];
        result = groupPreds[group]?.[3] ?? null;
      }
    } else if (slot.startsWith("W")) {
      const matchNum = parseInt(slot.slice(1));
      const match = matchesByNum.get(matchNum);
      if (match) {
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
        const winner =
          match.result === "home" ? adminHome :
          match.result === "away" ? adminAway :
          koPreds[match.id] ?? null;
        if (winner) {
          const home = adminHome ?? resolve(match.home_slot);
          const away = adminAway ?? resolve(match.away_slot);
          result = winner === home ? away : winner === away ? home : null;
        }
      }
    }

    memo.set(slot, result);
    return result;
  }
  return resolve;
}

function getMatchNumForThirdSlot(slot: string, matchesByNum: Map<number, KOMatch>): number | null {
  for (const [num, m] of matchesByNum) {
    if (m.away_slot === slot || m.home_slot === slot) return num;
  }
  return null;
}

// ── Third-place qualifier panel ───────────────────────────────────────────────

function ThirdPlacePanel({
  groupPreds,
  qualifyingGroups,
  thirdAssignments,
  onChange,
}: {
  groupPreds: GroupPreds;
  qualifyingGroups: Set<string>;
  thirdAssignments: ThirdAssignments;
  onChange: (groups: Set<string>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(groups: Set<string>) {
    if (groups.size !== 8) return;
    setLoading(true);
    setError("");
    const key = [...groups].sort().join("");
    const res = await fetch(`/api/third-place-lookup?groups=${key}`);
    const data = await res.json();
    if (!res.ok || !data.found) {
      setError(data.error ?? `Combination not found in table (key: ${data.key}, table size: ${data.tableSize ?? "?"})`);
    }
    setLoading(false);
  }

  function toggle(group: string) {
    const next = new Set(qualifyingGroups);
    if (next.has(group)) {
      next.delete(group);
    } else if (next.size < 8) {
      next.add(group);
    }
    onChange(next);
    if (next.size === 8) lookup(next);
  }

  return (
    <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
          3rd Place Qualifiers
        </h2>
        <span className="text-xs text-gray-600">
          {qualifyingGroups.size}/8 selected
          {loading && " · looking up…"}
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Pick the 8 groups whose 3rd-place team you think advances. The table then
        assigns them to the correct R32 slots.
      </p>

      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-3">
        {ALL_GROUPS.map(g => {
          const team3rd = groupPreds[g]?.[3];
          const selected = qualifyingGroups.has(g);
          const disabled = !selected && qualifyingGroups.size >= 8;
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              disabled={disabled}
              className={`rounded-lg border py-2 flex flex-col items-center gap-0.5 transition-colors ${
                selected
                  ? "border-blue-500 bg-blue-900/30 text-blue-300"
                  : disabled
                    ? "border-gray-800 bg-gray-900 text-gray-700 cursor-not-allowed"
                    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
              }`}
            >
              <span className="text-sm font-bold">{g}</span>
              <span className="text-xs text-gray-600 truncate w-full text-center px-0.5" title={team3rd}>
                {team3rd ? team3rd.split(" ")[0] : "?"}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {qualifyingGroups.size === 8 && Object.keys(thirdAssignments).length > 0 && (
        <div className="mt-3 border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-500 mb-2">Slot assignments from FIFA table:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {THIRD_PLACE_MATCH_ORDER.map(matchNum => {
              const group = thirdAssignments[matchNum];
              const team = group ? groupPreds[group]?.[3] : null;
              return (
                <div key={matchNum} className="bg-gray-800 rounded px-2 py-1.5 text-xs">
                  <span className="text-gray-500">M{matchNum}</span>
                  <div className="font-semibold text-blue-300 truncate">{team ?? `3rd ${group ?? "?"}`}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team picker ───────────────────────────────────────────────────────────────

function TeamPicker({
  matchId,
  matchSlotHome,
  matchSlotAway,
  current,
  expectedHome,
  expectedAway,
  result,
  onPick,
  limitedTeams,
}: {
  matchId: number;
  matchSlotHome: string;
  matchSlotAway: string;
  current: string | undefined;
  expectedHome: string | null;
  expectedAway: string | null;
  result: "home" | "away" | null;
  onPick: (matchId: number, team: string) => void;
  limitedTeams?: string[]; // for 3rd-place slots
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const locked = result !== null;
  const winner = result === "home" ? expectedHome : result === "away" ? expectedAway : null;

  const teams = limitedTeams ?? ALL_TEAMS;
  const confirmed = [expectedHome, expectedAway].filter(Boolean) as string[];
  const filtered = teams.filter(t => !query || t.toLowerCase().includes(query.toLowerCase()));
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
          {!limitedTeams && (
            <div className="p-2 border-b border-gray-800">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm focus:outline-none"
              />
            </div>
          )}
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
                  {confirmed.includes(team) && (
                    <span className="text-xs text-blue-400 shrink-0 ml-2">predicted here</span>
                  )}
                </button>
              </li>
            ))}
            {sorted.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-600 italic">
                {limitedTeams ? "No 3rd-place teams predicted for this slot yet" : "No teams match"}
              </li>
            )}
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
  groupPreds,
  thirdAssignments,
}: {
  match: KOMatch;
  prediction: string | undefined;
  resolve: (slot: string) => string | null;
  onPick: (matchId: number, team: string) => void;
  groupPreds: GroupPreds;
  thirdAssignments: ThirdAssignments;
}) {
  const adminHome = cleanTeam(match.home_team);
  const adminAway = cleanTeam(match.away_team);

  const expectedHome = adminHome ?? resolve(match.home_slot);
  const expectedAway = adminAway ?? resolve(match.away_slot);

  const homeLabel = expectedHome ?? slotLabel(match.home_slot);
  const awayLabel = expectedAway ?? slotLabel(match.away_slot);

  const winner =
    match.result === "home" ? (adminHome ?? expectedHome) :
    match.result === "away" ? (adminAway ?? expectedAway) : null;

  const correct = !!prediction && !!winner && prediction === winner;
  const wrong   = !!prediction && !!winner && prediction !== winner;

  // For 3rd-place away slots: limit picker to teams from relevant groups
  function getLimitedTeams(slot: string): string[] | undefined {
    if (!slot.startsWith("3")) return undefined;
    const groups = thirdPlaceGroups(slot);
    const teams = groups
      .map(g => groupPreds[g]?.[3])
      .filter(Boolean) as string[];
    return teams.length > 0 ? teams : undefined;
  }

  const homeLimited = getLimitedTeams(match.home_slot);
  const awayLimited = getLimitedTeams(match.away_slot);
  const limitedTeams = homeLimited ?? awayLimited;

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
          {wrong && winner && <span className="text-red-400">✗ {winner}</span>}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-2 text-sm">
        <span className={`flex-1 truncate font-medium ${expectedHome ? "text-white" : "text-gray-500 italic text-xs"}`}>
          {homeLabel}
        </span>
        <span className="text-gray-600 shrink-0 text-xs">vs</span>
        <span className={`flex-1 truncate font-medium text-right ${expectedAway ? "text-white" : "text-gray-500 italic text-xs"}`}>
          {awayLabel}
        </span>
      </div>

      <TeamPicker
        matchId={match.id}
        matchSlotHome={match.home_slot}
        matchSlotAway={match.away_slot}
        current={prediction}
        expectedHome={expectedHome}
        expectedAway={expectedAway}
        result={match.result}
        onPick={onPick}
        limitedTeams={limitedTeams}
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
  const [qualifyingGroups, setQualifyingGroups] = useState<Set<string>>(new Set());
  const [thirdAssignments, setThirdAssignments] = useState<ThirdAssignments>({});
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("wc2026_player");
    if (!name) { router.push("/"); return; }
    setPlayer(name);

    // Restore qualifier selection from localStorage
    const savedGroups = localStorage.getItem("wc2026_qualifying_groups");
    if (savedGroups) {
      try {
        const groups = new Set<string>(JSON.parse(savedGroups));
        setQualifyingGroups(groups);
        if (groups.size === 8) {
          const key = [...groups].sort().join("");
          fetch(`/api/third-place-lookup?groups=${key}`)
            .then(r => r.json())
            .then(data => { if (data.found) setThirdAssignments(data.assignments); });
        }
      } catch {}
    }

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

  const handleQualifyingChange = useCallback(async (groups: Set<string>) => {
    setQualifyingGroups(groups);
    localStorage.setItem("wc2026_qualifying_groups", JSON.stringify([...groups]));

    if (groups.size !== 8) {
      setThirdAssignments({});
      return;
    }

    const key = [...groups].sort().join("");
    const res = await fetch(`/api/third-place-lookup?groups=${key}`);
    const data = await res.json();
    if (data.found) setThirdAssignments(data.assignments);
    else setThirdAssignments({});
  }, []);

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
  const resolve = makeResolver(groupPreds, koPreds, thirdAssignments, matchesByNum);

  const total = matches.length;
  const done  = matches.filter(m => koPreds[m.id]).length;

  if (!player) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Knockout Bracket</h1>
          <p className="text-gray-400 text-sm mt-1">
            Playing as <strong className="text-yellow-300">{player}</strong>
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{done}/{total}</div>
          <div className="text-gray-500 text-xs">predicted</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        {ROUNDS.map(r => (
          <div key={r} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-2">
            <div className="text-gray-500 leading-tight">{ROUND_LABELS[r]}</div>
            <div className="text-yellow-400 font-bold">{ROUND_POINTS[r]}pt</div>
          </div>
        ))}
      </div>

      <ThirdPlacePanel
        groupPreds={groupPreds}
        qualifyingGroups={qualifyingGroups}
        thirdAssignments={thirdAssignments}
        onChange={handleQualifyingChange}
      />

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
                  groupPreds={groupPreds}
                  thirdAssignments={thirdAssignments}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
