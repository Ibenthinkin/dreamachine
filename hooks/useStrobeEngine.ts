"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampFrequency,
  createStrobeEngine,
  DEFAULT_FREQUENCY_HZ,
  type StrobeEngine,
} from "@/lib/strobeEngine";

const ARROW_STEP_HZ = 0.1;

/**
 * Wraps a StrobeEngine and wires the safety interrupts at window level so they
 * work regardless of focus (SPEC §3.5): Space toggles, Escape stops, and any
 * pointer-down outside a [data-stop-exempt] control stops while running.
 */
export function useStrobeEngine() {
  const engineRef = useRef<StrobeEngine | null>(null);
  const getEngine = useCallback(
    () => (engineRef.current ??= createStrobeEngine()),
    [],
  );

  const [isRunning, setIsRunning] = useState(false);
  const [frequencyHz, setFrequencyHz] = useState<number>(DEFAULT_FREQUENCY_HZ);

  const start = useCallback(() => {
    getEngine().start(frequencyHz);
    setIsRunning(true);
  }, [getEngine, frequencyHz]);

  const stop = useCallback(() => {
    getEngine().stop();
    setIsRunning(false);
  }, [getEngine]);

  const setFrequency = useCallback(
    (hz: number) => {
      const clamped = clampFrequency(Math.round(hz * 10) / 10);
      setFrequencyHz(clamped);
      getEngine().setFrequency(clamped);
    },
    [getEngine],
  );

  /** Subscribe to the engine's visual on/off ticks; returns unsubscribe. */
  const subscribe = useCallback(
    (callback: (isOn: boolean) => void) => getEngine().onTick(callback),
    [getEngine],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        // preventDefault also stops a focused button from re-firing via Space.
        event.preventDefault();
        if (isRunning) stop();
        else start();
      } else if (event.key === "Escape") {
        stop();
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        // If the slider itself has focus its native arrow handling already
        // drives onChange — don't double-step.
        if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
        event.preventDefault();
        const direction = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
        setFrequency(frequencyHz + direction * ARROW_STEP_HZ);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isRunning) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-stop-exempt]")) return;
      stop();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isRunning, frequencyHz, start, stop, setFrequency]);

  // Never leave the strobe running after unmount.
  useEffect(() => {
    return () => engineRef.current?.stop();
  }, []);

  return { subscribe, isRunning, frequencyHz, start, stop, setFrequency };
}
