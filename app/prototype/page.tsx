"use client";

// Phase 0 throwaway test page (PLAN.md) — hardcoded Start + frequency, bare
// full-viewport flip, drift instrumentation on window.__driftStats.
// Deleted once the consent-gated app exists; never ships behind the gate.

import { useEffect, useRef, useState } from "react";
import { createStrobeEngine, type StrobeEngine } from "@/lib/strobeEngine";

const FREQUENCY_HZ = 8;

interface DriftStats {
  toggles: number;
  maxAbsDeltaMs: number;
  meanAbsDeltaMs: number;
  startLatencyMs: number;
}

declare global {
  interface Window {
    __driftStats?: DriftStats;
  }
}

export default function PrototypePage() {
  const engineRef = useRef<StrobeEngine | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const engine = createStrobeEngine();
    engineRef.current = engine;

    // Drift instrumentation: each visual toggle should land on the half-cycle
    // grid (t0 + k / 2f). Track observed-vs-ideal delta; rAF quantization is
    // the expected noise floor (~1 frame).
    let sawInitialState = false;
    let t0: number | null = null;
    let toggles = 0;
    let sumAbsDelta = 0;
    let maxAbsDelta = 0;
    const unsubscribe = engine.onTick(() => {
      const now = performance.now();
      if (!sawInitialState) {
        // First callback is the synchronous current-state notification at
        // start — mid-cycle, not a grid edge. Anchor on the next real toggle.
        sawInitialState = true;
        return;
      }
      if (t0 === null) {
        t0 = now;
        return;
      }
      toggles++;
      const halfPeriodMs = 1000 / (2 * FREQUENCY_HZ);
      const ideal = t0 + toggles * halfPeriodMs;
      const delta = Math.abs(now - ideal);
      sumAbsDelta += delta;
      if (delta > maxAbsDelta) maxAbsDelta = delta;
      window.__driftStats = {
        toggles,
        maxAbsDeltaMs: maxAbsDelta,
        meanAbsDeltaMs: sumAbsDelta / toggles,
        startLatencyMs: window.__driftStats?.startLatencyMs ?? -1,
      };
      if (surfaceRef.current) {
        surfaceRef.current.style.backgroundColor =
          surfaceRef.current.style.backgroundColor === "white" ? "black" : "white";
      }
    });
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  const handleStart = () => {
    const clickedAt = performance.now();
    const engine = engineRef.current;
    if (!engine) return;
    const unsub = engine.onTick(() => {
      window.__driftStats = {
        ...(window.__driftStats ?? { toggles: 0, maxAbsDeltaMs: 0, meanAbsDeltaMs: 0 }),
        startLatencyMs: performance.now() - clickedAt,
      } as DriftStats;
      unsub();
    });
    engine.start(FREQUENCY_HZ);
    setRunning(true);
  };

  const handleStop = () => {
    engineRef.current?.stop();
    setRunning(false);
    if (surfaceRef.current) surfaceRef.current.style.backgroundColor = "black";
  };

  return (
    <div ref={surfaceRef} className="fixed inset-0 bg-black">
      <button
        onClick={running ? handleStop : handleStart}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded bg-neutral-700 px-8 py-4 text-white"
      >
        {running ? "Stop" : `Start ${FREQUENCY_HZ}Hz`}
      </button>
    </div>
  );
}
