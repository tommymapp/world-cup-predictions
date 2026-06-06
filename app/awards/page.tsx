"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { INDIVIDUAL_AWARDS, TEAM_POSITIONS } from "@/lib/awards";

type Preds = Record<string, string>;
type Results = Record<string, string>;

function AwardInput({
  awardKey,
  label,
  icon,
  description,
  value,
  result,
  onSave,
}: {
  awardKey: string;
  label: string;
  icon?: string;
  description?: string;
  value: string;
  result?: string;
  onSave: (key: string, val: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const save = useCallback((val: string) => {
    if (val === value) return;
    setState("saving");
    onSave(awardKey, val);
    setState("saved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), 1500);
  }, [awardKey, value, onSave]);

  const correct = result !== undefined && draft.trim().toLowerCase() === result.toLowerCase() && result !== '';
  const wrong = result !== undefined && result !== '' && draft.trim() !== '' && draft.trim().toLowerCase() !== result.toLowerCase();

  return (
    <div className={`rounded-lg border p-3 ${correct ? "border-green-600 bg-green-950/40" : wrong ? "border-red-800 bg-red-950/20" : "border-gray-800 bg-gray-900"}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-300">
          {icon && <span className="mr-1">{icon}</span>}{label}
          {description && <span className="ml-2 text-xs text-gray-500">{description}</span>}
        </label>
        <span className="text-xs">
          {state === "saving" && <span className="text-gray-500">saving…</span>}
          {state === "saved" && <span className="text-green-500">saved</span>}
          {correct && <span className="text-green-400 font-semibold">+1 ✓</span>}
          {wrong && result && <span className="text-red-400">✗ {result}</span>}
        </span>
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => save(draft)}
        onKeyDown={(e) => e.key === "Enter" && save(draft)}
        placeholder="Player name…"
        maxLength={100}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500"
      />
    </div>
  );
}

export default function AwardsPage() {
  const [player, setPlayer] = useState<string | null>(null);
  const [preds, setPreds] = useState<Preds>({});
  const [results, setResults] = useState<Results>({});
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("wc2026_player");
    if (!name) { router.push("/"); return; }
    setPlayer(name);

    Promise.all([
      fetch(`/api/awards?player=${encodeURIComponent(name)}`).then((r) => r.json()),
      fetch("/api/awards/results").then((r) => r.json()),
    ]).then(([predRows, { results: resultRows }]) => {
      const p: Preds = {};
      for (const row of predRows) p[row.award_key] = row.value;
      setPreds(p);

      const r: Results = {};
      for (const row of resultRows) r[row.award_key] = row.value;
      setResults(r);
    });
  }, [router]);

  const handleSave = useCallback(async (awardKey: string, value: string) => {
    if (!player) return;
    setPreds((prev) => ({ ...prev, [awardKey]: value }));
    await fetch("/api/awards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, awardKey, value }),
    });
  }, [player]);

  const totalPossible = INDIVIDUAL_AWARDS.length + TEAM_POSITIONS.length;
  const filled = [...INDIVIDUAL_AWARDS, ...TEAM_POSITIONS].filter((a) => preds[a.key]?.trim()).length;

  if (!player) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Awards & Team of the Tournament</h1>
          <p className="text-gray-400 text-sm mt-1">Playing as <strong className="text-yellow-300">{player}</strong> · 1 point per correct pick</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{filled}/{totalPossible}</div>
          <div className="text-gray-500 text-xs">filled</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Individual Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INDIVIDUAL_AWARDS.map((award) => (
            <AwardInput
              key={award.key}
              awardKey={award.key}
              label={award.label}
              icon={award.icon}
              description={award.description}
              value={preds[award.key] ?? ""}
              result={results[award.key]}
              onSave={handleSave}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Team of the Tournament</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {/* Formation layout: 4-3-3 */}
          <div className="space-y-3">
            {/* GK */}
            <div className="flex justify-center">
              <div className="w-40">
                <AwardInput key="team_gk" awardKey="team_gk" label="GK" value={preds["team_gk"] ?? ""} result={results["team_gk"]} onSave={handleSave} />
              </div>
            </div>
            {/* Defenders */}
            <div className="grid grid-cols-4 gap-2">
              {(["team_rb", "team_cb1", "team_cb2", "team_lb"] as const).map((key) => {
                const pos = TEAM_POSITIONS.find((p) => p.key === key)!;
                return <AwardInput key={key} awardKey={key} label={pos.label} value={preds[key] ?? ""} result={results[key]} onSave={handleSave} />;
              })}
            </div>
            {/* Midfielders */}
            <div className="grid grid-cols-3 gap-2">
              {(["team_rm", "team_cm", "team_lm"] as const).map((key) => {
                const pos = TEAM_POSITIONS.find((p) => p.key === key)!;
                return <AwardInput key={key} awardKey={key} label={pos.label} value={preds[key] ?? ""} result={results[key]} onSave={handleSave} />;
              })}
            </div>
            {/* Forwards */}
            <div className="grid grid-cols-3 gap-2">
              {(["team_rw", "team_st", "team_lw"] as const).map((key) => {
                const pos = TEAM_POSITIONS.find((p) => p.key === key)!;
                return <AwardInput key={key} awardKey={key} label={pos.label} value={preds[key] ?? ""} result={results[key]} onSave={handleSave} />;
              })}
            </div>
          </div>
        </div>
        <p className="text-gray-600 text-xs mt-2">Formation is a guide — put whoever you think deserves to be in the team</p>
      </section>
    </div>
  );
}
