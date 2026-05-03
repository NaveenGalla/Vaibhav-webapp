"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  endpoint: string;
  allowedActions: Array<{ action: string; label: string; tone: "green" | "red" | "blue" | "gray" }>;
};

const toneClass = {
  green: "bg-green-600 text-white hover:bg-green-700",
  red: "bg-red-600 text-white hover:bg-red-700",
  blue: "bg-blue-600 text-white hover:bg-blue-700",
  gray: "bg-slate-900 text-white hover:bg-slate-800",
};

export default function LifecycleDecisionPanel({ endpoint, allowedActions }: Props) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function submit(action: string) {
    setError("");
    setBusy(action);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, remarks }),
    });
    const json = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(json.error ?? "Unable to update request.");
      return;
    }
    setRemarks("");
    router.refresh();
  }

  if (allowedActions.length === 0) {
    return <div className="card"><p className="text-sm text-gray-500">No lifecycle actions are currently available.</p></div>;
  }

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-semibold text-slate-950">Actions</h3>
        <p className="mt-1 text-xs text-gray-400">Decision remarks are recorded in the audit log.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <textarea
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        rows={3}
        className="form-input resize-none"
        placeholder="Decision remarks"
      />
      <div className="grid gap-2">
        {allowedActions.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => void submit(item.action)}
            disabled={Boolean(busy)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${toneClass[item.tone]}`}
          >
            {busy === item.action ? "Updating..." : item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
