"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [players, setPlayers] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("wc2026_player");
    if (saved) setCurrent(saved);
    fetch("/api/players").then((r) => r.json()).then(setPlayers);
  }, []);

  function selectPlayer(name: string) {
    localStorage.setItem("wc2026_player", name);
    setCurrent(name);
  }

  async function addPlayer() {
    if (!newName.trim()) return;
    setAdding(true);
    await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const updated = await fetch("/api/players").then((r) => r.json());
    setPlayers(updated);
    selectPlayer(newName.trim());
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-2">World Cup 2026</h1>
      <p className="text-gray-400 mb-8">Group stage predictions — correct result = 1 point</p>

      {current && (
        <div className="mb-6 bg-green-900/40 border border-green-700 rounded-lg p-4 flex items-center justify-between">
          <span>Playing as <strong className="text-green-300">{current}</strong></span>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/predict")}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-sm"
            >
              Make predictions →
            </button>
            <button
              onClick={() => { localStorage.removeItem("wc2026_player"); setCurrent(null); }}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >
              Switch
            </button>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3 text-gray-300">
        {current ? "Switch player" : "Pick your name"}
      </h2>

      {players.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">No players yet — add the first one below.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {players.map((name) => (
            <button
              key={name}
              onClick={() => selectPlayer(name)}
              className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                current === name
                  ? "border-yellow-500 bg-yellow-900/30 text-yellow-300"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder="Add a new player..."
          maxLength={50}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
        />
        <button
          onClick={addPlayer}
          disabled={adding || !newName.trim()}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
}
