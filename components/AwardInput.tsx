"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function AwardInput({
  awardKey,
  label,
  icon,
  description,
  value,
  onSave,
}: {
  awardKey: string;
  label: string;
  icon?: string;
  description?: string;
  value: string;
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

  return (
    <div className="rounded-lg border p-3 border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-300">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
          {description && <span className="ml-2 text-xs text-gray-500">{description}</span>}
        </label>
        <span className="text-xs">
          {state === "saving" && <span className="text-gray-500">saving…</span>}
          {state === "saved"  && <span className="text-green-500">saved</span>}
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
