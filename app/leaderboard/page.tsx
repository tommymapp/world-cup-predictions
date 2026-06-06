"use client";

import { useEffect, useState } from "react";
import { ROUND_LABELS, ROUND_POINTS, type Round } from "@/lib/knockout";
import { INDIVIDUAL_AWARDS } from "@/lib/awards";
import { GROUP_NAMES } from "@/lib/groups";

type GroupScore = { player_name: string; group_points: string };
type AwardScore = { player_name: string; award_points: string };
type KoScore    = { player_name: string; knockout_points: string };

type Row = {
  player_name: string;
  groupPoints: number;
  awardPoints: number;
  knockoutPoints: number;
  total: number;
};

type GroupPick = { position: number; predicted: string; actual: string | null; correct: boolean; wentThrough: boolean };
type KoPick    = { match_number: number; round: string; predicted: string; actual_winner: string | null; settled: boolean; correct: boolean; points: number };
type AwardPick = { award_key: string; predicted: string; actual: string | null; correct: boolean };
type Breakdown = { groups: { group: string; picks: GroupPick[] }[]; knockout: KoPick[]; awards: AwardPick[] };

const POS_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "third", "final"];

const INDIVIDUAL_AWARD_META: Record<string, { label: string; icon: string }> =
  Object.fromEntries(INDIVIDUAL_AWARDS.map(a => [a.key, { label: a.label, icon: a.icon }]));

function teamKeyLabel(key: string): string {
  if (key === "team_gk") return "GK";
  const m = key.match(/^team_([dmaf])(\d)$/);
  if (!m) return key.replace("team_", "").toUpperCase();
  const tier = m[1] === "d" ? "DEF" : m[1] === "m" ? "MID" : m[1] === "a" ? "AM" : "FWD";
  return `${tier} ${m[2]}`;
}

function BreakdownPanel({ data }: { data: Breakdown }) {
  // ── Group stage ──────────────────────────────────────────────────────────────
  const groupsByName: Record<string, GroupPick[]> = {};
  for (const g of data.groups) groupsByName[g.group] = g.picks;

  // ── Knockout by round ────────────────────────────────────────────────────────
  const koByRound: Record<string, KoPick[]> = {};
  for (const m of data.knockout) {
    if (!koByRound[m.round]) koByRound[m.round] = [];
    koByRound[m.round].push(m);
  }

  // ── Awards split ─────────────────────────────────────────────────────────────
  const individualKeys = new Set(INDIVIDUAL_AWARDS.map(a => a.key));
  const indAwards  = data.awards.filter(a => individualKeys.has(a.award_key));
  const teamAwards = data.awards.filter(a => !individualKeys.has(a.award_key));

  const allGroupPicks  = data.groups.flatMap(g => g.picks);
  const totalGroupPts  = allGroupPicks.filter(p => p.correct).length * 3 + allGroupPicks.filter(p => p.wentThrough).length;
  const totalKoPts     = data.knockout.filter(m => m.correct).reduce((s, m) => s + m.points, 0);
  const totalAwardPts  = data.awards.filter(a => a.correct && individualKeys.has(a.award_key)).length * 10
                       + data.awards.filter(a => a.correct && !individualKeys.has(a.award_key)).length * 5;

  return (
    <div className="mt-3 pt-3 border-t border-gray-800 space-y-5 text-sm">

      {/* Groups */}
      {data.groups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Group Stage</span>
            <span className="text-xs text-yellow-400 font-semibold">{totalGroupPts} pts</span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {GROUP_NAMES.map(g => {
              const picks = groupsByName[g] ?? [];
              const correct = picks.filter(p => p.correct).length;
              const settled = picks.filter(p => p.actual !== null).length;
              const hasPicks = picks.length > 0;
              return (
                <div
                  key={g}
                  className={`rounded border py-1.5 flex flex-col items-center gap-0.5 ${
                    !hasPicks ? "border-gray-800 opacity-40" :
                    correct > 0 ? "border-green-800 bg-green-950/30" : "border-gray-800 bg-gray-900"
                  }`}
                  title={picks.map(p => `${POS_LABEL[p.position]}: ${p.predicted}${p.actual ? (p.correct ? " ✓" : ` → ${p.actual}`) : ""}`).join("\n")}
                >
                  <span className="text-xs font-bold text-gray-400">{g}</span>
                  {hasPicks ? (
                    <span className={`text-xs font-bold ${correct > 0 ? "text-green-400" : settled > 0 ? "text-gray-600" : "text-gray-500"}`}>
                      {settled > 0 ? `${correct}/${settled}` : `${picks.length}✎`}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-700">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Knockout */}
      {data.knockout.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Knockout</span>
            <span className="text-xs text-yellow-400 font-semibold">{totalKoPts} pts</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ROUNDS.map(round => {
              const picks = koByRound[round] ?? [];
              if (picks.length === 0) return null;
              const settled = picks.filter(m => m.settled);
              const correct = picks.filter(m => m.correct);
              const pts = correct.reduce((s, m) => s + m.points, 0);
              return (
                <div key={round} className="bg-gray-800/60 rounded px-2 py-1.5">
                  <div className="text-xs text-gray-500 leading-tight">{ROUND_LABELS[round]}</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`font-bold text-sm ${pts > 0 ? "text-green-400" : "text-gray-600"}`}>
                      {settled.length > 0 ? `${correct.length}/${settled.length}` : `${picks.length}✎`}
                    </span>
                    {pts > 0 && <span className="text-xs text-yellow-500">{pts}pt</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Awards */}
      {indAwards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Individual Awards</span>
            <span className="text-xs text-yellow-400 font-semibold">{indAwards.filter(a => a.correct).length * 10} pts</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {indAwards.map(a => {
              const meta = INDIVIDUAL_AWARD_META[a.award_key];
              return (
                <div key={a.award_key} className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  a.correct ? "bg-green-950/40 text-green-300" :
                  a.actual  ? "bg-red-950/20 text-red-300" :
                              "bg-gray-800/50 text-gray-400"
                }`}>
                  <span className="shrink-0">{meta?.icon ?? "🏅"}</span>
                  <span className="text-gray-500 shrink-0">{meta?.label ?? a.award_key}:</span>
                  <span className="font-medium truncate">{a.predicted}</span>
                  {a.correct && <span className="ml-auto shrink-0">✓</span>}
                  {!a.correct && a.actual && <span className="ml-auto shrink-0 text-gray-500 truncate">→ {a.actual}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team of the Tournament */}
      {teamAwards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Team of the Tournament</span>
            <span className="text-xs text-yellow-400 font-semibold">{teamAwards.filter(a => a.correct).length * 5} pts</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
            {teamAwards.map(a => (
              <div key={a.award_key} className={`flex flex-col rounded px-2 py-1.5 text-xs ${
                a.correct ? "bg-green-950/40 text-green-300" :
                a.actual  ? "bg-red-950/20 text-red-300" :
                            "bg-gray-800/50 text-gray-400"
              }`}>
                <span className="text-gray-600 text-xs">{teamKeyLabel(a.award_key)}</span>
                <span className="font-medium truncate">{a.predicted}</span>
                {!a.correct && a.actual && <span className="text-gray-600 truncate">→ {a.actual}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.groups.length === 0 && data.knockout.length === 0 && data.awards.length === 0 && (
        <p className="text-gray-600 text-xs italic">No predictions made yet.</p>
      )}
    </div>
  );
}

function ScoringGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span className="font-medium">How points are scored</span>
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-gray-400 space-y-4 border-t border-gray-800 pt-3">
          <div>
            <p className="font-semibold text-gray-300 mb-1">Group stage</p>
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Correct finishing position</span><span className="text-yellow-400 font-semibold ml-2">3 pts</span></div>
              <div className="flex justify-between"><span>Predicted to qualify (top 2) and they did</span><span className="text-yellow-400 font-semibold ml-2">1 pt</span></div>
            </div>
            <p className="mt-1 text-gray-500">Bonuses stack — correctly placing a top-2 team earns 4 pts total.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-300 mb-1">Knockout stage — points per correct pick</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1">
              {([
                ["Round of 32", 1],
                ["Round of 16", 3],
                ["Quarter-finals", 5],
                ["Semi-finals", 8],
                ["Third Place Play-off", 8],
                ["Final", 15],
              ] as [string, number][]).map(([label, pts]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-yellow-400 font-semibold ml-2">{pts} pts</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-300 mb-1">Individual awards — <span className="text-yellow-400">10 pts</span> each</p>
            <p>Golden Ball, Golden Boot, Golden Glove, Best Young Player, Goal of the Tournament.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-300 mb-1">Team of the Tournament — <span className="text-yellow-400">5 pts</span> each</p>
            <p>Pick the best GK, defenders, midfielders and forwards. 5 points per correct player.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [rows, setRows]         = useState<Row[]>([]);
  const [loading, setLoading]   = useState(true);
  const [me, setMe]             = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<string, Breakdown>>({});
  const [fetching, setFetching] = useState<string | null>(null);

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

  async function toggleExpanded(name: string) {
    if (expanded === name) { setExpanded(null); return; }
    setExpanded(name);
    if (breakdowns[name]) return;
    setFetching(name);
    const data = await fetch(`/api/leaderboard/breakdown?player=${encodeURIComponent(name)}`).then(r => r.json());
    setBreakdowns(prev => ({ ...prev, [name]: data }));
    setFetching(null);
  }

  const maxPoints = rows.length > 0 ? rows[0].total : 0;

  function rank(i: number): number {
    if (i === 0) return 1;
    return rows[i].total === rows[i - 1].total ? rank(i - 1) : i + 1;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <ScoringGuide />
      <p className="text-gray-400 text-sm mb-4">Click a player to see their points breakdown</p>

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
            const isExpanded = expanded === row.player_name;
            const isFetching = fetching === row.player_name;

            return (
              <div
                key={row.player_name}
                className={`rounded-lg border transition-colors ${
                  isMe ? "border-yellow-600 bg-yellow-900/20" : "border-gray-800 bg-gray-900"
                } ${isExpanded ? "ring-1 ring-gray-700" : ""}`}
              >
                <button
                  onClick={() => toggleExpanded(row.player_name)}
                  className="w-full flex items-center gap-4 p-4 text-left"
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

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <div className={`text-xl font-bold ${row.total > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                        {row.total}
                      </div>
                      <div className="text-xs text-gray-500">pts</div>
                    </div>
                    <span className="text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    {isFetching ? (
                      <p className="text-gray-600 text-xs py-2">Loading breakdown…</p>
                    ) : breakdowns[row.player_name] ? (
                      <BreakdownPanel data={breakdowns[row.player_name]} />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
