"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GROUPS, GROUP_NAMES } from "@/lib/groups";

// player_name → group → position → team
type GroupPreds = Record<string, Record<number, string>>;
type GroupResults = Record<string, Record<number, string>>;

const POSITIONS = [1, 2, 3, 4] as const;
const POS_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const POS_COLOUR: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-gray-300",
  3: "text-amber-600",
  4: "text-gray-600",
};

export default function PredictPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [preds, setPreds] = useState<GroupPreds>({});
  const [results, setResults] = useState<GroupResults>({});
  const [activeGroup, setActiveGroup] = useState<string>(GROUP_NAMES[0]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("wc2026_player");
    if (!name) { router.push("/"); return; }
    setPlayer(name);

    Promise.all([
      fetch(`/api/group-predictions?player=${encodeURIComponent(name)}`).then(r => r.json()),
      fetch("/api/group-results").then(r => r.json()),
    ]).then(([predRows, { results: resultRows }]) => {
      const p: GroupPreds = {};
      for (const row of predRows) {
        if (!p[row.group_name]) p[row.group_name] = {};
        p[row.group_name][row.position] = row.team;
      }
      setPreds(p);

      const r: GroupResults = {};
      for (const row of resultRows) {
        if (!r[row.group_name]) r[row.group_name] = {};
        r[row.group_name][row.position] = row.team;
      }
      setResults(r);
    });
  }, [router]);

  const pick = useCallback(async (group: string, position: number, team: string) => {
    if (!player) return;

    // Optimistic update — also clear whatever position this team was previously in
    setPreds(prev => {
      const g = { ...(prev[group] ?? {}) };
      for (const [pos, t] of Object.entries(g)) {
        if (t === team) delete g[Number(pos)];
      }
      g[position] = team;
      return { ...prev, [group]: g };
    });

    setSaving(true);
    await fetch("/api/group-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, group, position, team }),
    });
    setSaving(false);
  }, [player]);

  function groupStats(group: string) {
    const g = preds[group] ?? {};
    const r = results[group] ?? {};
    const filled = POSITIONS.filter(p => g[p]).length;
    const correct = POSITIONS.filter(p => g[p] && r[p] && g[p] === r[p]).length;
    const played = Object.keys(r).length;
    return { filled, correct, played };
  }

  const totalFilled = GROUP_NAMES.reduce((acc, g) => acc + groupStats(g).filled, 0);
  const totalPossible = GROUP_NAMES.length * 4;

  if (!player) return null;

  const groupTeams = GROUPS[activeGroup] ?? [];
  const groupPreds = preds[activeGroup] ?? {};
  const groupResults = results[activeGroup] ?? {};
  const hasResults = Object.keys(groupResults).length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Group Stage Predictions</h1>
          <p className="text-gray-400 text-sm mt-1">
            Playing as <strong className="text-yellow-300">{player}</strong>
            {" · "}Predict the final standings for each group
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{totalFilled}/{totalPossible}</div>
          <div className="text-gray-500 text-xs">filled</div>
        </div>
      </div>

      {/* Group tab grid */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-6">
        {GROUP_NAMES.map(group => {
          const { filled, correct, played } = groupStats(group);
          const active = group === activeGroup;
          const complete = filled === 4;
          return (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`rounded-lg border py-2 flex flex-col items-center gap-0.5 transition-colors ${
                active
                  ? "border-yellow-500 bg-yellow-900/30 text-yellow-300"
                  : complete
                    ? "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                    : "border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-600"
              }`}
            >
              <span className="text-sm font-bold">{group}</span>
              <span className="text-xs text-gray-600">{filled}/4</span>
              {played > 0 && (
                <span className={`text-xs font-bold ${correct > 0 ? "text-green-400" : "text-gray-600"}`}>
                  {correct}pt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active group */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Group {activeGroup}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {saving && <span>saving…</span>}
            {hasResults && (
              <span className="text-green-400">
                {groupStats(activeGroup).correct}/4 correct
              </span>
            )}
          </div>
        </div>

        {/* Standings prediction grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {POSITIONS.map(pos => {
            const picked = groupPreds[pos];
            const actual = groupResults[pos];
            const correct = hasResults && picked && picked === actual;
            const wrong = hasResults && picked && actual && picked !== actual;

            return (
              <div
                key={pos}
                className={`rounded-lg border p-3 ${
                  correct ? "border-green-600 bg-green-950/40" :
                  wrong   ? "border-red-800 bg-red-950/20" :
                            "border-gray-800 bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${POS_COLOUR[pos]}`}>
                    {POS_LABEL[pos]}
                  </span>
                  <span className="text-xs">
                    {correct && <span className="text-green-400 font-semibold">+1 ✓</span>}
                    {wrong && actual && <span className="text-red-400">✗ {actual}</span>}
                  </span>
                </div>

                {/* Team buttons */}
                <div className="grid grid-cols-2 gap-1">
                  {groupTeams.map(team => {
                    const isSelected = picked === team;
                    const teamPos = Object.entries(groupPreds).find(([, t]) => t === team)?.[0];
                    const takenElsewhere = teamPos !== undefined && Number(teamPos) !== pos;
                    const actualForPos = groupResults[pos];

                    return (
                      <button
                        key={team}
                        onClick={() => pick(activeGroup, pos, team)}
                        className={`py-1.5 px-2 rounded text-xs font-medium truncate transition-colors text-left ${
                          isSelected
                            ? hasResults
                              ? correct ? "bg-green-700 text-white" : "bg-red-900/50 text-red-300"
                              : "bg-yellow-500 text-black ring-2 ring-yellow-300"
                            : hasResults && team === actualForPos
                              ? "bg-green-900/30 text-green-500 border border-green-800 hover:bg-green-900/50"
                              : takenElsewhere
                                ? "bg-gray-800 text-gray-500 border border-dashed border-gray-700 hover:bg-gray-700"
                                : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                        }`}
                      >
                        {team}
                        {takenElsewhere && !hasResults && (
                          <span className="ml-1 text-gray-600">{POS_LABEL[Number(teamPos)]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview of current picks in order */}
        {POSITIONS.some(p => groupPreds[p]) && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Your standings</p>
            <div className="flex flex-col gap-1">
              {POSITIONS.map(pos => (
                <div key={pos} className="flex items-center gap-2 text-sm">
                  <span className={`w-6 text-right font-bold text-xs ${POS_COLOUR[pos]}`}>{POS_LABEL[pos]}</span>
                  <span className={groupPreds[pos] ? "text-white" : "text-gray-600 italic"}>
                    {groupPreds[pos] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex gap-2">
          {GROUP_NAMES.indexOf(activeGroup) > 0 && (
            <button
              onClick={() => setActiveGroup(GROUP_NAMES[GROUP_NAMES.indexOf(activeGroup) - 1])}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm"
            >
              ← Group {GROUP_NAMES[GROUP_NAMES.indexOf(activeGroup) - 1]}
            </button>
          )}
          {GROUP_NAMES.indexOf(activeGroup) < GROUP_NAMES.length - 1 && (
            <button
              onClick={() => setActiveGroup(GROUP_NAMES[GROUP_NAMES.indexOf(activeGroup) + 1])}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm"
            >
              Group {GROUP_NAMES[GROUP_NAMES.indexOf(activeGroup) + 1]} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
