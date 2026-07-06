import { describe, expect, it } from "vitest";
import {
  clampFrequency,
  gateEventsInWindow,
  isStrobeOn,
  nextHalfCycleIndex,
  strobePhase,
} from "@/lib/strobeEngine";

// f = 8Hz keeps times exactly representable in binary floating point
// (period 0.125s, half-cycle 0.0625s) so boundary tests are exact.
const F = 8;

describe("strobePhase", () => {
  it("is 0 at t=0", () => {
    expect(strobePhase(0, F)).toBe(0);
  });

  it("wraps to 0 at exact cycle boundaries", () => {
    expect(strobePhase(0.125, F)).toBe(0);
    expect(strobePhase(1.25, F)).toBe(0);
  });

  it("is 0.5 exactly at the half-cycle", () => {
    expect(strobePhase(0.0625, F)).toBe(0.5);
  });

  it("stays in [0, 1) for long session times (10+ minutes)", () => {
    const t = 700; // seconds
    const phase = strobePhase(t, 7.3);
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });
});

describe("isStrobeOn (50% duty cycle)", () => {
  it("is on at phase 0", () => {
    expect(isStrobeOn(0, F)).toBe(true);
  });

  it("is on just before the half-cycle boundary", () => {
    expect(isStrobeOn(0.0625 - 1e-6, F)).toBe(true);
  });

  it("switches off exactly at phase 0.5", () => {
    expect(isStrobeOn(0.0625, F)).toBe(false);
  });

  it("is off just before the next cycle and on again at it", () => {
    expect(isStrobeOn(0.125 - 1e-6, F)).toBe(false);
    expect(isStrobeOn(0.125, F)).toBe(true);
  });

  it("responds to frequency changes at the same instant", () => {
    const t = 0.09;
    expect(isStrobeOn(t, 4)).toBe(true); // phase 0.36
    expect(isStrobeOn(t, 8)).toBe(false); // phase 0.72
  });
});

describe("gate scheduling helpers", () => {
  it("nextHalfCycleIndex returns the boundary index at or after t", () => {
    expect(nextHalfCycleIndex(0, F)).toBe(0);
    expect(nextHalfCycleIndex(0.0625, F)).toBe(1); // exactly on boundary 1
    expect(nextHalfCycleIndex(0.07, F)).toBe(2);
  });

  it("emits alternating on/off events on the half-cycle grid", () => {
    const events = gateEventsInWindow(F, 0, 0.25);
    expect(events).toEqual([
      { time: 0, on: true },
      { time: 0.0625, on: false },
      { time: 0.125, on: true },
      { time: 0.1875, on: false },
    ]);
  });

  it("preserves on/off parity when starting mid-stream", () => {
    const events = gateEventsInWindow(F, 3, 0.3);
    expect(events[0]).toEqual({ time: 0.1875, on: false });
    expect(events[1]).toEqual({ time: 0.25, on: true });
  });

  it("returns no events when the window is already filled", () => {
    expect(gateEventsInWindow(F, 4, 0.25)).toEqual([]);
  });

  it("agrees with isStrobeOn about state between boundaries", () => {
    for (const f of [4, 7.3, 13]) {
      const events = gateEventsInWindow(f, 0, 2);
      for (const { time, on } of events) {
        // Just after each gate edge the pure visual function must agree.
        expect(isStrobeOn(time + 1e-9, f)).toBe(on);
      }
    }
  });
});

describe("clampFrequency", () => {
  it("clamps below 4 and above 13, passes values in range", () => {
    expect(clampFrequency(3)).toBe(4);
    expect(clampFrequency(14)).toBe(13);
    expect(clampFrequency(8.4)).toBe(8.4);
  });
});
