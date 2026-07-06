"use client";

import FrequencySlider from "@/components/FrequencySlider";
import StrobeSurface from "@/components/StrobeSurface";
import { useStrobeEngine } from "@/hooks/useStrobeEngine";
import { DISCLAIMER_FOOTER } from "@/lib/disclaimer";

export default function DreamachineScreen() {
  const { subscribe, isRunning, frequencyHz, start, stop, setFrequency } = useStrobeEngine();

  return (
    <main className="relative min-h-dvh">
      <StrobeSurface subscribe={subscribe} />

      {/* Controls are exempt from tap-anywhere-stops so the slider stays live
          mid-session; the Stop button inside stops explicitly. */}
      <div
        data-stop-exempt
        className={`fixed inset-x-0 bottom-14 z-10 mx-auto w-full max-w-md px-6 transition-opacity ${
          isRunning ? "opacity-60" : "opacity-100"
        }`}
      >
        <div className="rounded-2xl bg-neutral-900/90 p-6 backdrop-blur">
          <FrequencySlider value={frequencyHz} onChange={setFrequency} />
          <button
            onClick={isRunning ? stop : start}
            data-testid="start-stop"
            className={`mt-5 min-h-16 w-full rounded-lg text-xl font-semibold transition-colors ${
              isRunning
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-neutral-100 text-black hover:bg-white"
            }`}
          >
            {isRunning ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      {!isRunning && (
        <div className="pointer-events-none fixed inset-x-0 top-[18%] z-10 text-center">
          <h1 className="text-3xl font-semibold text-neutral-200">Dreamachine</h1>
          <p className="mx-auto mt-3 max-w-sm px-6 text-neutral-400">
            Close your eyes once it starts. Space, Escape, or a tap anywhere stops it
            instantly.
          </p>
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-10 bg-black/80 px-4 py-2 text-center text-xs text-neutral-500">
        {DISCLAIMER_FOOTER}
      </footer>
    </main>
  );
}
