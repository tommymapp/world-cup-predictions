"use client";

import { useEffect, useState } from "react";
import { INDIVIDUAL_AWARDS, FORMATIONS, FORMATION_KEY, TEAM_GK_KEY, getFormationLayout } from "@/lib/awards";
import { ROUND_LABELS, slotLabel, type Round } from "@/lib/knockout";
import { GROUPS, GROUP_NAMES } from "@/lib/groups";
import { THIRD_PLACE_MATCH_ORDER } from "@/lib/third-place";

type GroupResults = Record<string, Record<number, string>>; // group → position → team

function AdminPositionInput({ pos, awardDrafts, setAwardDrafts, saveAward, awardResults }: {
  pos: { key: string; label: string };
  awardDrafts: Record<string, string>;
  setAwardDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveAward: (key: string, val: string) => void;
  awardResults: Record<string, string>;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <label className="block text-xs font-bold text-gray-500 mb-1">{pos.label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={awardDrafts[pos.key] ?? ""}
          onChange={(e) => setAwardDrafts((p) => ({ ...p, [pos.key]: e.target.value }))}
          onBlur={() => saveAward(pos.key, awardDrafts[pos.key] ?? "")}
          onKeyDown={(e) => e.key === "Enter" && saveAward(pos.key, awardDrafts[pos.key] ?? "")}
          placeholder="Player…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
        />
        <button
          onClick={() => saveAward(pos.key, awardDrafts[pos.key] ?? "")}
          className="bg-green-700 hover:bg-green-600 text-white px-2 py-1.5 rounded text-sm"
        >
          ✓
        </button>
      </div>
      {awardResults[pos.key] && (
        <p className="text-xs text-green-400 mt-1">Current: {awardResults[pos.key]}</p>
      )}
    </div>
  );
}

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

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbWarning, setDbWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [groupResults, setGroupResults] = useState<GroupResults>({});
  const [fetchLog, setFetchLog] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [qualifyingGroups, setQualifyingGroups] = useState<Set<string>>(new Set());
  const [awardResults, setAwardResults] = useState<Record<string, string>>({});
  const [awardDrafts, setAwardDrafts] = useState<Record<string, string>>({});
  const [koMatches, setKoMatches] = useState<KOMatch[]>([]);
  const [thirdAssignments, setThirdAssignments] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<"groups" | "knockout" | "awards" | "players">("groups");
  const [players, setPlayers] = useState<string[]>([]);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem("wc_admin_secret");
    if (s) { setSecret(s); doLogin(s); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLogin(s: string) {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: s }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(
          res.status === 401 ? "Invalid secret." :
          res.status === 503 ? `Cannot reach database: ${data.detail ?? data.error}` :
          data.error ?? "Unknown error"
        );
        sessionStorage.removeItem("wc_admin_secret");
      } else {
        sessionStorage.setItem("wc_admin_secret", s);
        if (!data.tablesExist) {
          setDbWarning("Tables not found — click \"Init DB / Reseed\" to set up the database.");
        }
        setAuthed(true);
      }
    } catch {
      setLoginError("Network error — could not reach the server.");
    }
    setLoginLoading(false);
  }

  function login() {
    if (!secret.trim()) return;
    doLogin(secret);
  }

  useEffect(() => {
    if (!authed) return;
    fetch("/api/players").then((r) => r.json()).then((names: string[]) => setPlayers(names));
    fetch("/api/group-results").then((r) => r.json()).then(({ results }) => {
      const gr: GroupResults = {};
      for (const row of results) {
        if (!gr[row.group_name]) gr[row.group_name] = {};
        gr[row.group_name][row.position] = row.team;
      }
      setGroupResults(gr);
    });
    fetch("/api/knockout").then((r) => r.json()).then(({ matches: kms }) => {
      setKoMatches(kms);
    });
    fetch("/api/awards/results").then((r) => r.json()).then(({ results }) => {
      const map: Record<string, string> = {};
      for (const row of results) map[row.award_key] = row.value;
      setAwardResults(map);
      setAwardDrafts(map);
    });
  }, [authed]);

  async function setGroupResult(group: string, position: number, team: string | null) {
    setSaving(true);
    await fetch("/api/group-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, group, position, team }),
    });
    // Reload from DB so displayed state always matches — avoids duplicate team issues
    const { results } = await fetch("/api/group-results").then(r => r.json());
    const gr: GroupResults = {};
    for (const row of results) {
      if (!gr[row.group_name]) gr[row.group_name] = {};
      gr[row.group_name][row.position] = row.team;
    }
    setGroupResults(gr);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 2000);
    setSaving(false);
  }

  async function fetchLatest() {
    setFetching(true);
    setFetchLog(['Fetching from Wikipedia…']);
    const res = await fetch("/api/fetch-latest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    const data = await res.json();
    if (res.ok) {
      setFetchLog(data.log ?? []);
      const { koTeamsSet, koResultsSet, groupPositionsSet } = data.summary ?? {};

      // Auto-fill R32 slots from the freshly fetched group results
      const fillRes = await fetch("/api/autofill-r32", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, qualifyingGroups: [...qualifyingGroups] }),
      });
      const fillData = await fillRes.json();

      setStatus(`Fetched: ${koTeamsSet ?? 0} team slots, ${koResultsSet ?? 0} results, ${groupPositionsSet ?? 0} group positions updated · ${fillData.filled ?? 0} R32 slots auto-filled`);

      // Reload knockout matches and group results
      const [{ matches: kms }, { results: grRows }] = await Promise.all([
        fetch("/api/knockout").then(r => r.json()),
        fetch("/api/group-results").then(r => r.json()),
      ]);
      setKoMatches(kms);
      const gr: GroupResults = {};
      for (const row of grRows) {
        if (!gr[row.group_name]) gr[row.group_name] = {};
        gr[row.group_name][row.position] = row.team;
      }
      setGroupResults(gr);
    } else {
      setFetchLog([`Error: ${data.error}`]);
    }
    setFetching(false);
  }

  async function runSetup() {
    setStatus("Setting up database…");
    const res = await fetch("/api/setup", { method: "POST" });
    if (res.ok) {
      setStatus("Database ready!");
      setDbWarning("");
    } else {
      const err = await res.json().catch(() => ({}));
      setStatus(`Setup failed: ${err.error ?? res.statusText}`);
    }
  }

  async function saveKoResult(matchId: number, result: "home" | "away" | null) {
    await fetch("/api/knockout/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, matchId, result: result ?? "" }),
    });

    const match = koMatches.find((m) => m.id === matchId);
    setKoMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, result } : m));

    if (match) {
      const num = match.match_number;
      const winner = result === "home" ? match.home_team : result === "away" ? match.away_team : null;
      const loser  = result === "home" ? match.away_team : result === "away" ? match.home_team : null;

      const updates: { id: number; home?: string | null; away?: string | null }[] = [];
      for (const m of koMatches) {
        if (m.id === matchId) continue;
        const upd: { id: number; home?: string | null; away?: string | null } = { id: m.id };
        if (m.home_slot === `W${num}`) upd.home = winner;
        if (m.away_slot === `W${num}`) upd.away = winner;
        if (m.home_slot === `L${num}`) upd.home = loser;
        if (m.away_slot === `L${num}`) upd.away = loser;
        if (upd.home !== undefined || upd.away !== undefined) updates.push(upd);
      }

      if (updates.length > 0) {
        await Promise.all(updates.map((u) =>
          fetch("/api/knockout/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret, matchId: u.id, homeTeam: u.home, awayTeam: u.away }),
          })
        ));
        const { matches: kms } = await fetch("/api/knockout").then((r) => r.json());
        setKoMatches(kms);
      }
    }

    setStatus("Result saved");
    setTimeout(() => setStatus(""), 2000);
  }

  async function saveAward(awardKey: string, value: string) {
    const res = await fetch("/api/awards/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, awardKey, value }),
    });
    if (res.ok) {
      setAwardResults((prev) => ({ ...prev, [awardKey]: value }));
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    }
  }

  async function handleQualifyingChange(groups: Set<string>) {
    setQualifyingGroups(groups);
    if (groups.size !== 8) { setThirdAssignments({}); return; }
    const key = [...groups].sort().join("");
    const res = await fetch(`/api/third-place-lookup?groups=${key}`);
    const data = await res.json();
    if (data.found) setThirdAssignments(data.assignments);
    else setThirdAssignments({});
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-xl font-bold mb-4">Admin</h1>
        <p className="text-gray-400 text-sm mb-4">Enter your ADMIN_SECRET to continue.</p>
        <input
          type="password"
          value={secret}
          onChange={(e) => { setSecret(e.target.value); setLoginError(""); }}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Admin secret"
          className={`w-full bg-gray-800 border rounded px-3 py-2 text-sm mb-3 focus:outline-none ${
            loginError ? "border-red-500 focus:border-red-400" : "border-gray-700 focus:border-yellow-500"
          }`}
        />
        {loginError && (
          <p className="text-red-400 text-sm mb-3">{loginError}</p>
        )}
        <button
          onClick={login}
          disabled={loginLoading || !secret.trim()}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold py-2 rounded text-sm"
        >
          {loginLoading ? "Checking…" : "Enter"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {dbWarning && (
        <div className="mb-4 bg-yellow-900/40 border border-yellow-600 rounded-lg px-4 py-3 text-yellow-300 text-sm">
          ⚠ {dbWarning}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin — Enter Results</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {status && <span className="text-sm text-green-400">{status}</span>}
          <button
            onClick={fetchLatest}
            disabled={fetching}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            {fetching ? "Fetching…" : "⬇ Fetch Latest"}
          </button>
          <button
            onClick={runSetup}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm"
          >
            Init DB / Reseed
          </button>
        </div>
      </div>

      {fetchLog.length > 0 && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Fetch log</span>
            <button onClick={() => setFetchLog([])} className="text-gray-600 hover:text-gray-400 text-xs">clear</button>
          </div>
          <ul className="text-xs text-gray-400 space-y-0.5 font-mono max-h-48 overflow-y-auto">
            {fetchLog.map((line, i) => (
              <li key={i} className={
                line.startsWith('⚠') ? 'text-yellow-500' :
                line.startsWith('  Group') ? 'text-green-400' :
                line.includes('→') ? 'text-blue-400' :
                'text-gray-500'
              }>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {([["groups", "Groups"], ["knockout", "Knockout"], ["awards", "Awards"], ["players", "Players"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "awards" && <div className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Individual Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {INDIVIDUAL_AWARDS.map((award) => (
            <div key={award.key} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {award.icon} {award.label}
              </label>
              <input
                type="text"
                value={awardDrafts[award.key] ?? ""}
                onChange={(e) => setAwardDrafts((p) => ({ ...p, [award.key]: e.target.value }))}
                onBlur={() => saveAward(award.key, awardDrafts[award.key] ?? "")}
                onKeyDown={(e) => e.key === "Enter" && saveAward(award.key, awardDrafts[award.key] ?? "")}
                placeholder="Player name…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
              />
              {awardResults[award.key] && (
                <p className="text-xs text-green-400 mt-1">Current: {awardResults[award.key]}</p>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Team of the Tournament</h2>

        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Formation</p>
          <div className="flex flex-wrap gap-2">
            {FORMATIONS.map((f) => {
              const selected = awardResults[FORMATION_KEY] === f;
              return (
                <button
                  key={f}
                  onClick={() => {
                    const next = selected ? "" : f;
                    setAwardResults((p) => ({ ...p, [FORMATION_KEY]: next }));
                    saveAward(FORMATION_KEY, next);
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-mono font-medium border transition-colors ${
                    selected
                      ? "bg-yellow-500 border-yellow-400 text-gray-900"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-yellow-600 hover:text-yellow-400"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const formation = awardResults[FORMATION_KEY] ?? "";
          const layout = getFormationLayout(formation);

          if (!formation) return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
              Select a formation above to fill in the team
            </div>
          );

          return (
            <div className="space-y-3">
              {/* GK */}
              <div className="flex justify-center">
                <div className="w-48">
                  {[{ key: TEAM_GK_KEY, label: "GK" }].map((pos) => (
                    <AdminPositionInput key={pos.key} pos={pos} awardDrafts={awardDrafts} setAwardDrafts={setAwardDrafts} saveAward={saveAward} awardResults={awardResults} />
                  ))}
                </div>
              </div>
              {/* Formation rows */}
              {layout.map((row, i) => (
                <div key={i} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                  {row.map((pos) => (
                    <AdminPositionInput key={pos.key} pos={pos} awardDrafts={awardDrafts} setAwardDrafts={setAwardDrafts} saveAward={saveAward} awardResults={awardResults} />
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
      </div>}

      {activeTab === "knockout" && <div className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-6">Knockout Bracket</h2>
        <p className="text-gray-600 text-xs mb-4">
          R32 slots are auto-filled when you click Fetch Latest. Select 3rd-place qualifiers below to include 3rd-place slots.
        </p>

        {/* Third-place qualifier selector */}
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">3rd Place Qualifiers</h3>
            <span className="text-xs text-gray-600">{qualifyingGroups.size}/8 selected</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Select the 8 groups whose 3rd-place team advanced. Used to assign the correct team to each 3rd-place R32 slot.
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-3">
            {GROUP_NAMES.map(g => {
              const team3rd = groupResults[g]?.[3];
              const selected = qualifyingGroups.has(g);
              const disabled = !selected && qualifyingGroups.size >= 8;
              return (
                <button
                  key={g}
                  onClick={() => {
                    const next = new Set(qualifyingGroups);
                    if (next.has(g)) next.delete(g);
                    else if (next.size < 8) next.add(g);
                    handleQualifyingChange(next);
                  }}
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
          {qualifyingGroups.size === 8 && Object.keys(thirdAssignments).length > 0 && (
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-2">Slot assignments from FIFA table:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {THIRD_PLACE_MATCH_ORDER.map(matchNum => {
                  const group = thirdAssignments[matchNum];
                  const team = group ? groupResults[group]?.[3] : null;
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

        {(["r32", "r16", "qf", "sf", "third", "final"] as Round[]).map((round) => {
          const rms = koMatches.filter((m) => m.round === round);
          if (rms.length === 0) return null;
          return (
            <div key={round} className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">{ROUND_LABELS[round]}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rms.map((m) => (
                  <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-2">
                      M{m.match_number} · {slotLabel(m.home_slot)} vs {slotLabel(m.away_slot)}
                    </div>
                    <div className="flex gap-1">
                      {(["home", "away"] as const).map((opt) => {
                        const team = opt === "home" ? m.home_team : m.away_team;
                        const label = team ?? slotLabel(opt === "home" ? m.home_slot : m.away_slot);
                        const selected = m.result === opt;
                        return (
                          <button
                            key={opt}
                            disabled={!team}
                            onClick={() => saveKoResult(m.id, selected ? null : opt)}
                            className={`flex-1 py-1.5 px-1 rounded text-xs font-medium truncate transition-colors ${
                              !team
                                ? "bg-gray-800 text-gray-700 cursor-not-allowed"
                                : selected
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                          >{label}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>}

      {activeTab === "groups" && <div>
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Group Stage Results</h2>
      <p className="text-gray-600 text-xs mb-4">Enter the final standings for each group once all matches are played.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GROUP_NAMES.map(group => {
          const teams = GROUPS[group];
          const gr = groupResults[group] ?? {};
          return (
            <div key={group} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <h3 className="text-sm font-bold text-gray-400 mb-3">Group {group}</h3>
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4].map(pos => {
                  const posLabel = ["1st", "2nd", "3rd", "4th"][pos - 1];
                  const posColour = ["text-yellow-400", "text-gray-300", "text-amber-600", "text-gray-600"][pos - 1];
                  return (
                    <div key={pos} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-6 text-right shrink-0 ${posColour}`}>{posLabel}</span>
                      <select
                        value={gr[pos] ?? ""}
                        disabled={saving}
                        onChange={e => setGroupResult(group, pos, e.target.value || null)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
                      >
                        <option value="">— pick team —</option>
                        {teams.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>}

      {activeTab === "players" && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Players</h2>
          <p className="text-gray-600 text-xs mb-4">Reset clears all group, knockout and award predictions for a player. The player account itself is kept.</p>
          <div className="flex flex-col gap-2">
            {players.length === 0 && <p className="text-gray-600 text-sm italic">No players yet.</p>}
            {players.map(name => (
              <div key={name} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <span className="text-sm font-medium">{name}</span>
                {confirmReset === name ? (
                  <div className="flex gap-2">
                    <span className="text-xs text-red-400 self-center">Sure?</span>
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/reset-player", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ secret, player: name }),
                        });
                        setConfirmReset(null);
                        setStatus(`Reset ${name}`);
                        setTimeout(() => setStatus(""), 2000);
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmReset(null)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmReset(name)}
                    className="bg-gray-800 hover:bg-red-900/50 hover:border-red-800 border border-gray-700 text-gray-400 hover:text-red-300 px-3 py-1 rounded text-xs transition-colors"
                  >
                    Reset predictions
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
