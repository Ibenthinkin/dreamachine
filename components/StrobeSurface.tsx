"use client";

import { useEffect, useRef } from "react";

interface StrobeSurfaceProps {
  /** Subscribe to visual on/off ticks; returns unsubscribe. */
  subscribe: (callback: (isOn: boolean) => void) => () => void;
}

/**
 * True full-bleed viewport color flip. Writes style directly on the node from
 * the engine's onTick — no React re-render in the frame loop.
 */
export default function StrobeSurface({ subscribe }: StrobeSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribe((isOn) => {
      if (surfaceRef.current) {
        surfaceRef.current.style.backgroundColor = isOn ? "#ffffff" : "#000000";
      }
    });
  }, [subscribe]);

  return (
    <div
      ref={surfaceRef}
      aria-hidden
      data-testid="strobe-surface"
      className="fixed inset-0 bg-black"
    />
  );
}
