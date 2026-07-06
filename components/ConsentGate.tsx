"use client";

import { DISCLAIMER_POINTS } from "@/lib/disclaimer";

interface ConsentGateProps {
  onAccept: () => void;
}

export default function ConsentGate({ onAccept }: ConsentGateProps) {
  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-semibold">Dreamachine</h1>
        <p className="mt-2 text-neutral-400">
          A full-screen light strobe synced to an isochronic tone, experienced with your
          eyes closed. Read the following before continuing.
        </p>
        <ul className="mt-6 space-y-4">
          {DISCLAIMER_POINTS.map((point) => (
            <li key={point} className="flex gap-3 text-neutral-200">
              <span aria-hidden className="mt-0.5 text-amber-400">
                ⚠
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onAccept}
          className="mt-8 min-h-16 w-full rounded-lg bg-neutral-100 px-6 text-lg font-semibold text-black transition-colors hover:bg-white active:bg-neutral-300"
        >
          I understand and accept
        </button>
      </div>
    </main>
  );
}
