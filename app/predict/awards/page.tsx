"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { INDIVIDUAL_AWARDS, FORMATIONS, FORMATION_KEY, TEAM_GK_KEY, getFormationLayout } from "@/lib/awards";

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
  const wrong   = result !== undefined && result !== '' && draft.trim() !== '' && draft.trim().toLowerCase() !== result.toLowerCase();

  return (
    <div className={`rounded-lg border p-3 ${correct ? "border-green-600 bg-green-950/40" : wrong ? "border-red-800 bg-red-950/20" : "border-gray-800 bg-gray-900"}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-300">
          {icon && <span className="mr-1">{icon}</span>}{label}
          {description && <span className="ml-2 text-xs text-gray-500">{description}</span>}
        </label>
        <span className="text-xs">
          {state === "saving" && <span className="text-gray-500">saving…</span>}
          {state === "saved"  && <span className="text-green-500">saved</span>}
          {correct && <span className="text-green-400 font-semibold">✓</span>}
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
  const [player, setPlayer]   = useState<string | null>(null);
  const [preds, setPreds]     = useState<Preds>({});
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

  const selectedFormation = preds[FORMATION_KEY] ?? "";
  const formationLayout   = getFormationLayout(selectedFormation);

  const allSlotKeys = [TEAM_GK_KEY, ...formationLayout.flat().map(s => s.key)];
  const filled =
    INDIVIDUAL_AWARDS.filter(a => preds[a.key]?.trim()).length +
    allSlotKeys.filter(k => preds[k]?.trim()).length +
    (selectedFormation ? 1 : 0);
  const totalPossible = INDIVIDUAL_AWARDS.length + 11 + 1; // 5 individual + 11 players + formation

  if (!player) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Awards & Team of the Tournament</h1>
          <p className="text-gray-400 text-sm mt-1">Playing as <strong className="text-yellow-300">{player}</strong></p>
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

        {/* Formation picker */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Formation</p>
          <div className="flex flex-wrap gap-2">
            {FORMATIONS.map((f) => {
              const sel = selectedFormation === f;
              return (
                <button
                  key={f}
                  onClick={() => handleSave(FORMATION_KEY, sel ? "" : f)}
                  className={`px-3 py-1.5 rounded text-sm font-mono font-medium border transition-colors ${
                    sel
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

        {/* Team grid */}
        {!selectedFormation ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
            Select a formation above to fill in your team
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            {/* GK */}
            <div className="flex justify-center">
              <div className="w-40">
                <AwardInput
                  awardKey={TEAM_GK_KEY}
                  label="GK"
                  value={preds[TEAM_GK_KEY] ?? ""}
                  result={results[TEAM_GK_KEY]}
                  onSave={handleSave}
                />
              </div>
            </div>

            {/* Dynamic rows: DEF → MID(s) → FWD */}
            {formationLayout.map((row, i) => (
              <div
                key={i}
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
              >
                {row.map((slot) => (
                  <AwardInput
                    key={slot.key}
                    awardKey={slot.key}
                    label={slot.label}
                    value={preds[slot.key] ?? ""}
                    result={results[slot.key]}
                    onSave={handleSave}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
