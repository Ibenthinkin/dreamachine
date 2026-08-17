# Dreamachine — Technical Specification

> Build-ready spec for Dreamachine. Distilled from the shaped Idea-Forge idea + project plan via the Idea Forge "Spec" stage. This is the foundation a coding agent uses to scaffold and build v1. Living doc — update as decisions land.

## 1. Overview

**Dreamachine** is a personal recreation of Brion Gysin's Dreamachine effect: a single-page website that produces a full-screen light strobe (viewed with eyes closed, the screen itself as the light source) synced to an isochronic audio tone, both driven by one manual frequency slider spanning theta through alpha brainwave ranges (~4–13Hz).

**Problem.** There's no existing simple web app that combines a full-screen synced strobe with an isochronic tone in one place — the pieces exist separately (hardware Dreamachine reimplementations, audio-only isochronic tone generators, closed-source flashlight apps like Lumenate) but nothing does both as a lightweight website.

**Scale & posture.** Personal — just the builder and friends. **Not commercial, no monetization, no accounts, no data collection.** Private GitHub repo.

### Core features

- Mandatory warning/consent gate before any strobe content is reachable (age 18+, epilepsy-history exclusion, non-medical-device disclaimer).
- One frequency slider (~4–13Hz) controlling both the visual strobe and the audio tone live.
- Full-screen visual strobe, phase-locked to the audio clock so the two never drift apart.
- Isochronic audio tone via the Web Audio API.
- Instant stop (button, tap-anywhere, or Escape key) — usable without looking at the screen.

### Tech

- **Next.js (App Router), static export** + **Bun** (runtime + package manager), **TypeScript**, **Tailwind CSS**.
- **No backend, no database, no auth, no API layer** — fully static, fully client-side. There is nothing to type-safely call, so tRPC/Drizzle/NextAuth are all out of scope for this project.
- **Vitest** (unit) + **Playwright** (e2e).
- Deploy: **Cloudflare Pages**.

## 2. Architecture

### 2.1 High-level

- One static Next.js site, entirely client-rendered — no server, no persistence beyond `localStorage` (consent record only).
- A single in-browser engine (`strobeEngine`) owns both the audio oscillator/gain graph and the visual on/off signal, driven from one clock (`AudioContext.currentTime`) so the light and tone never drift relative to each other.

### 2.2 Application layers

- **Presentation** — App Router page + components (consent gate, slider, strobe surface).
- **Domain** — `lib/strobeEngine.ts`, the phase-lock timing logic. No data-access layer; nothing is persisted server-side.

## 3. Functional requirements

### 3.1 Consent gate
- On first load (no valid consent record in `localStorage`), show a full-screen gate with: 18+ age requirement, epilepsy-history exclusion, non-medical-device disclaimer — mirroring Lumenate's app-store language.
- "I understand and accept" writes `localStorage["dreamachine_consent_accepted_at"] = <ISO timestamp>`. Subsequent visits skip straight to the main screen.
- The disclaimer text stays visible in a persistent footer on the main screen too — accepting once doesn't hide the warning permanently.

### 3.2 Frequency control
- One slider, range **4–13Hz** (theta through alpha), adjustable live while the strobe is running.
- Current Hz value shown numerically next to the slider.

### 3.3 Strobe playback
- Start/Stop toggle. On start: full-screen visual begins flashing at the slider's frequency and the isochronic tone starts at the same frequency, simultaneously.
- Stop halts both outputs immediately and together.

### 3.4 Phase-lock
- The visual on/off state is derived every animation frame from `audioContext.currentTime` and the current frequency — never from an independent timer — so visual and audio pulses stay locked over an arbitrarily long session.

### 3.5 Safety interrupt
- Space bar, tapping/clicking anywhere, or a dedicated Stop button all immediately halt both audio and visual output. Wired at the top level so it works regardless of which element has focus — deliberately easy to trigger without precise vision, since the user's eyes are closed during use.

## 4. Non-functional requirements

- **Performance** — strobe start latency under 100ms from the Start action.
- **Timing accuracy** — visual/audio phase drift budget under ~20ms over a 10-minute session (validate in Phase 0; see §12).
- **Reliability** — works fully offline once loaded (static assets only, no network calls after initial page load).
- **Privacy** — no analytics, no telemetry, no third-party requests. Nothing leaves the browser.
- **Accessibility** — large touch targets; Space (start/stop) and arrow keys (adjust Hz) work without looking at the screen, since the user's eyes are closed for most of the session.
- **Cost** — $0/mo (Cloudflare Pages free tier, no backend, no third-party services).

## 5. Core engine — strobe/tone phase-lock

The one part that *is* the product: keeping the light and the tone locked to the same clock so they never drift apart.

`lib/strobeEngine.ts`

```typescript
export interface StrobeEngine {
  start(frequencyHz: number): void;
  stop(): void;
  setFrequency(frequencyHz: number): void; // live update while running, no glitch/pop
  onTick(callback: (isOn: boolean) => void): () => void; // subscribe to visual on/off state; returns unsubscribe
}

export function createStrobeEngine(): StrobeEngine;
```

Implementation notes:
- One `AudioContext` per engine instance. Audio path: `OscillatorNode` (carrier, e.g. 200Hz sine) → `GainNode`, gated on/off at the target frequency via `gain.setValueAtTime` calls scheduled a short lookahead window (~100ms) ahead of `audioContext.currentTime` — the standard Web Audio scheduling pattern, avoids `setTimeout`/`setInterval` drift.
- Visual path: a `requestAnimationFrame` loop reads `audioContext.currentTime`, computes `phase = (currentTime * frequencyHz) % 1`, derives `isOn = phase < 0.5` (50% duty cycle), and invokes subscribers via `onTick`. This is the same clock driving the audio scheduler — never a second, independent timer.
- `setFrequency` updates a value read by both the audio scheduler and the visual phase calculation; takes effect on the next cycle boundary. Ramp the gain briefly (a few ms) on frequency changes to avoid audio clicks/pops.

## 6. Frontend — routes & components

### 6.1 Routes (App Router, static export)
- `/` — the entire app. Renders `ConsentGate` (no valid consent record) or `DreamachineScreen` (consent already accepted).

### 6.2 Components
- `app/page.tsx` — top-level; checks `localStorage` for consent, renders `ConsentGate` or `DreamachineScreen`.
- `components/ConsentGate.tsx` — age/epilepsy/disclaimer copy + accept button; writes the consent record.
- `components/DreamachineScreen.tsx` — hosts the slider, Start/Stop button, `StrobeSurface`, and the persistent footer disclaimer.
- `components/StrobeSurface.tsx` — full-viewport surface (canvas or absolutely-positioned div) toggled black/white via the engine's `onTick` callback.
- `components/FrequencySlider.tsx` — range input, 4–13Hz, live `onChange` → `engine.setFrequency`.
- `hooks/useStrobeEngine.ts` — React hook wrapping `createStrobeEngine()`; exposes `{ isRunning, frequencyHz, start, stop, setFrequency }` and wires the Space/tap/Escape safety interrupt.

## 7. Styling

- Tailwind, minimal. The strobe surface is a true full-bleed viewport color flip — not styled chrome, since it *is* the product.
- Large tap targets throughout; slider and Start/Stop are positioned and sized to be operable by feel/glance before the user closes their eyes.

## 8. Security & safety considerations

- No user data collected and nothing persisted server-side (there is no server) — no traditional attack surface.
- **Consent gate cannot be bypassed** — `DreamachineScreen` never renders without a valid consent record in `localStorage`.
- **Escape hatch is load-bearing, not optional** — Space bar, tap-anywhere, and a dedicated Stop button must all halt both engine outputs immediately, wired independent of focus state.
- Disclaimer text (18+, epilepsy-history exclusion, non-medical-device notice) stays visible during active use, not just at the gate.

## 9. Testing strategy

- **Vitest (unit):** `strobeEngine`'s phase-calculation function (pure — given `currentTime` + `frequencyHz`, returns `isOn`) is the highest-risk logic in the app, since a bug here defeats the entire premise; also the gain-scheduling helper and the consent-record read/write.
- **Playwright (e2e):** consent gate blocks the main screen until accepted; acceptance persists across reload; Start actually starts both outputs (assert `AudioContext.state === "running"` and the strobe surface toggling); Stop/Escape/tap-anywhere halts both; moving the slider changes the engine's live frequency.

## 10. Deployment

- **Cloudflare Pages**, static export (`next.config.ts` → `output: "export"`). No server runtime required.
- Repo: private GitHub repo at `~/Dev/dreamachine`; Cloudflare Pages connects directly to it for git-push deploys.
- Scripts:
  ```json
  "scripts": {
    "dev": "bun run --bun next dev",
    "build": "bun run --bun next build",
    "preview": "bunx wrangler pages dev out"
  }
  ```

## 11. Development workflow (build order)

0. **Phase 0 — core strobe + tone prototype.** Build `strobeEngine` + `StrobeSurface` in isolation; confirm phase-lock holds with no perceptible drift over a multi-minute manual test. Settles the one real technical risk before anything else is built.
1. Consent gate + `localStorage` persistence.
2. Frequency slider wired live to the engine.
3. Escape-hatch / Stop wiring (Space, tap-anywhere, button).
4. Styling pass (full-bleed strobe surface, footer disclaimer, tap targets).
5. Testing per §9.
6. Deploy to Cloudflare Pages via the private GitHub repo.

## 12. Open questions / risks

- **Phase-lock drift over long sessions** — validate empirically in Phase 0. If `requestAnimationFrame`-derived phase drifts perceptibly, consider driving the visual toggle from an `AudioWorklet` clock tick instead of `rAF`.
- **Slider range** — 4–13Hz (theta + alpha) is the starting span; confirm by ear/eye once built whether it's the right range or needs narrowing/widening.
- **Mobile Safari behavior untested** — continuous audio + fullscreen strobe on iOS Safari wasn't confirmed against a directly relevant source during idea evaluation; smoke-test on an iPhone before considering this done.
- **Parked for later:** color/pattern variation (closer to the true "shapes and colors" visual effect), guided/ramping frequency presets (like Lumenate's sessions), a TV version.

## 13. Project setup — rollup to planning vault

This project rolls progress back to a private planning vault so it surfaces in Ben's Daily Brief. The mechanism is a **repo-side running log**: `log.md` at this repo's root, committed to git like any other file. The vault resolves this repo through its project root note's `repo:` field and reads `log.md` directly — no path from this repo into the vault, and nothing to keep in sync by hand.

`CLAUDE.md` carries the full format and session-spend contract; see its "Project log" section.

> [!note] **Superseded.** This section previously specified an env-var bridge — `VAULT_LOG_PATH` in a gitignored `.env`, pointing at a *vault-side* log that a session had to write into by hand. That pattern is retired vault-wide: it went stale in practice, here and elsewhere. Don't reintroduce it, and remove `VAULT_LOG_PATH` from any project that still references it.
