/**
 * Dreamachine core engine (SPEC §5).
 *
 * One clock — `AudioContext.currentTime` — drives both outputs:
 *  - Audio: 200Hz sine carrier gated on/off by a GainNode, events scheduled in a
 *    ~100ms lookahead window (never setTimeout for the gating itself).
 *  - Visual: a requestAnimationFrame loop reads the same currentTime, derives
 *    on/off via the pure phase function, and notifies onTick subscribers.
 */

/**
 * Frequency range — a safety ceiling, not a preference (SPEC §8).
 *
 * 4–13Hz spans theta through alpha, and stops deliberately short of the ~15–25Hz
 * band where photosensitive response peaks. `clampFrequency` is applied inside
 * `start` and `setFrequency`, so the cap holds at the engine boundary rather than
 * depending on the slider's min/max. Widening MAX_FREQUENCY_HZ is a safety
 * decision, not a tuning one.
 */
export const MIN_FREQUENCY_HZ = 4;
export const MAX_FREQUENCY_HZ = 13;
export const DEFAULT_FREQUENCY_HZ = 8;

const CARRIER_FREQUENCY_HZ = 200;
const LOOKAHEAD_S = 0.1;
const SCHEDULER_INTERVAL_MS = 25;
const GATE_RAMP_S = 0.003; // short ramp on gate edges & freq changes — no clicks/pops
const ON_GAIN = 0.5;

/** Phase within the current cycle, [0, 1). Pure — the main unit-test target. */
export function strobePhase(currentTime: number, frequencyHz: number): number {
  return (currentTime * frequencyHz) % 1;
}

/** 50% duty cycle: on for the first half of every cycle. Pure. */
export function isStrobeOn(currentTime: number, frequencyHz: number): boolean {
  return strobePhase(currentTime, frequencyHz) < 0.5;
}

/**
 * Half-cycle boundaries sit at t = j / (2f) for integer j; even j switches the
 * gate ON, odd j OFF — the same 50%-duty grid `isStrobeOn` reads, so audio and
 * visual can never disagree about where the edges are.
 */
export function nextHalfCycleIndex(currentTime: number, frequencyHz: number): number {
  return Math.ceil(currentTime * 2 * frequencyHz);
}

export interface GateEvent {
  time: number;
  on: boolean;
}

/**
 * Gate events from half-cycle index `fromHalfIndex` up to (excluding) `untilTime`.
 * Pure helper behind the audio scheduler's lookahead fill.
 */
export function gateEventsInWindow(
  frequencyHz: number,
  fromHalfIndex: number,
  untilTime: number,
): GateEvent[] {
  const events: GateEvent[] = [];
  let j = fromHalfIndex;
  while (j / (2 * frequencyHz) < untilTime) {
    events.push({ time: j / (2 * frequencyHz), on: j % 2 === 0 });
    j++;
  }
  return events;
}

export function clampFrequency(frequencyHz: number): number {
  return Math.min(MAX_FREQUENCY_HZ, Math.max(MIN_FREQUENCY_HZ, frequencyHz));
}

export interface StrobeEngine {
  start(frequencyHz: number): void;
  stop(): void;
  /** Live update while running, no glitch/pop. */
  setFrequency(frequencyHz: number): void;
  /** Subscribe to visual on/off state; returns unsubscribe. */
  onTick(callback: (isOn: boolean) => void): () => void;
}

export function createStrobeEngine(): StrobeEngine {
  let ctx: AudioContext | null = null;
  let osc: OscillatorNode | null = null;
  let gateGain: GainNode | null = null;
  let frequencyHz = DEFAULT_FREQUENCY_HZ;
  let running = false;
  let schedulerId: ReturnType<typeof setInterval> | null = null;
  let rafId: number | null = null;
  let nextHalfIndex = 0;
  let lastNotified: boolean | null = null;
  const subscribers = new Set<(isOn: boolean) => void>();

  const notify = (isOn: boolean) => {
    if (isOn === lastNotified) return;
    lastNotified = isOn;
    for (const cb of subscribers) cb(isOn);
  };

  const scheduleWindow = () => {
    if (!running || !ctx || !gateGain) return;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    const events = gateEventsInWindow(frequencyHz, nextHalfIndex, horizon);
    for (const { time, on } of events) {
      // Anchor at the boundary, then a ~3ms ramp to the new level — click-free
      // while keeping the audible edge on the shared half-cycle grid.
      gateGain.gain.setValueAtTime(on ? 0 : ON_GAIN, time);
      gateGain.gain.linearRampToValueAtTime(on ? ON_GAIN : 0, time + GATE_RAMP_S);
    }
    nextHalfIndex += events.length;
  };

  const frame = () => {
    if (!running || !ctx) return;
    notify(isStrobeOn(ctx.currentTime, frequencyHz));
    rafId = requestAnimationFrame(frame);
  };

  return {
    start(startFrequencyHz: number) {
      if (running) return;
      frequencyHz = clampFrequency(startFrequencyHz);
      if (!ctx) ctx = new AudioContext();
      if (ctx.state === "suspended") void ctx.resume();

      osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = CARRIER_FREQUENCY_HZ;
      gateGain = ctx.createGain();
      osc.connect(gateGain);
      gateGain.connect(ctx.destination);

      const now = ctx.currentTime;
      const on = isStrobeOn(now, frequencyHz);
      gateGain.gain.setValueAtTime(on ? ON_GAIN : 0, now);
      nextHalfIndex = nextHalfCycleIndex(now, frequencyHz);
      osc.start();

      running = true;
      lastNotified = null;
      notify(on);
      scheduleWindow();
      schedulerId = setInterval(scheduleWindow, SCHEDULER_INTERVAL_MS);
      rafId = requestAnimationFrame(frame);
    },

    stop() {
      if (!running) return;
      running = false;
      if (schedulerId !== null) clearInterval(schedulerId);
      schedulerId = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;

      if (ctx && gateGain && osc) {
        const now = ctx.currentTime;
        const stoppingOsc = osc;
        const stoppingGain = gateGain;
        stoppingGain.gain.cancelScheduledValues(now);
        stoppingGain.gain.setValueAtTime(stoppingGain.gain.value, now);
        stoppingGain.gain.linearRampToValueAtTime(0, now + GATE_RAMP_S);
        stoppingOsc.stop(now + GATE_RAMP_S + 0.005);
        stoppingOsc.onended = () => {
          stoppingOsc.disconnect();
          stoppingGain.disconnect();
        };
      }
      osc = null;
      gateGain = null;
      notify(false);
    },

    setFrequency(newFrequencyHz: number) {
      frequencyHz = clampFrequency(newFrequencyHz);
      if (!running || !ctx || !gateGain) return;
      const now = ctx.currentTime;
      // Drop events scheduled on the old grid, ramp to where the new grid says
      // we should be right now, then resume filling on the new grid.
      gateGain.gain.cancelScheduledValues(now);
      gateGain.gain.setValueAtTime(gateGain.gain.value, now);
      const on = isStrobeOn(now, frequencyHz);
      gateGain.gain.linearRampToValueAtTime(on ? ON_GAIN : 0, now + GATE_RAMP_S);
      nextHalfIndex = nextHalfCycleIndex(now + GATE_RAMP_S, frequencyHz);
      scheduleWindow();
    },

    onTick(callback: (isOn: boolean) => void) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}
