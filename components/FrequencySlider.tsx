"use client";

import { MAX_FREQUENCY_HZ, MIN_FREQUENCY_HZ } from "@/lib/strobeEngine";

interface FrequencySliderProps {
  value: number;
  onChange: (hz: number) => void;
}

export default function FrequencySlider({ value, onChange }: FrequencySliderProps) {
  return (
    <label className="block w-full">
      <span className="flex items-baseline justify-between">
        <span className="text-sm uppercase tracking-widest text-neutral-400">Frequency</span>
        <output className="text-2xl font-semibold tabular-nums" data-testid="frequency-value">
          {value.toFixed(1)}
          <span className="ml-1 text-base font-normal text-neutral-400">Hz</span>
        </output>
      </span>
      <input
        type="range"
        min={MIN_FREQUENCY_HZ}
        max={MAX_FREQUENCY_HZ}
        step={0.1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Strobe frequency in hertz"
        className="mt-3 h-12 w-full cursor-pointer accent-white"
      />
    </label>
  );
}
