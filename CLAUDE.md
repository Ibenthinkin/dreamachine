# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Not yet scaffolded.** The repo currently contains only `SPEC.md` — the build-ready technical specification. Read `SPEC.md` in full before any implementation work; it is the source of truth for requirements, architecture, and build order (§11: Phase 0 core engine prototype first, then consent gate, slider, safety interrupts, styling, tests, deploy).

## What this is

Dreamachine: a single-page, fully static, client-only web app producing a full-screen light strobe phase-locked to an isochronic audio tone, driven by one frequency slider (4–13Hz). Personal project — no backend, no database, no auth, no analytics, no accounts.

## Stack & commands

Next.js (App Router, static export via `output: "export"`) + Bun + TypeScript + Tailwind CSS. Vitest for unit tests, Playwright for e2e. Deploys to Cloudflare Pages.

```sh
bun run dev        # bun run --bun next dev
bun run build      # bun run --bun next build (static export to out/)
bun run preview    # bunx wrangler pages dev out
bun run vitest     # unit tests (single test: bunx vitest run path/to/file.test.ts)
bunx playwright test
```

## Architecture

The whole product is one invariant: **light and tone must never drift apart.** A single engine (`lib/strobeEngine.ts`) owns both outputs, driven by one clock — `AudioContext.currentTime`:

- **Audio path:** OscillatorNode carrier (~200Hz sine) → GainNode, gated on/off via `gain.setValueAtTime` scheduled ~100ms ahead of `currentTime`. Never `setTimeout`/`setInterval`.
- **Visual path:** a `requestAnimationFrame` loop reads the *same* `audioContext.currentTime`, computes `phase = (currentTime * frequencyHz) % 1`, `isOn = phase < 0.5`, and notifies `onTick` subscribers. Never an independent timer.
- `setFrequency` updates one value read by both paths; ramp gain a few ms on changes to avoid clicks.

The phase calculation should be a pure function (`currentTime` + `frequencyHz` → `isOn`) so it's unit-testable — it's the highest-risk logic in the app.

UI layer: `app/page.tsx` renders `ConsentGate` (no consent record in `localStorage`) or `DreamachineScreen` (slider + Start/Stop + `StrobeSurface` + persistent footer disclaimer). `hooks/useStrobeEngine.ts` wraps the engine and wires safety interrupts.

## Non-negotiable safety constraints

- **Consent gate cannot be bypassed.** `DreamachineScreen` never renders without `localStorage["dreamachine_consent_accepted_at"]` set. The 18+/epilepsy/non-medical disclaimer also stays visible in a footer during use.
- **Safety interrupt is load-bearing.** Space bar, tap/click anywhere, and a dedicated Stop button must each immediately halt both audio and visual output, wired at the top level independent of focus — the user's eyes are closed during use.
- Strobe start latency < 100ms; audio/visual drift budget < ~20ms over 10 minutes.
- No network calls after initial load; nothing leaves the browser.

## Rollup to planning vault

At the end of any session that made real progress, read `VAULT_LOG_PATH` from `.env` and append a one-line milestone entry to that file — format `- [[MM-DD-YY ddd]] — <what changed>`, newest under the latest `## YYYY-MM` header. Commits are pulled into the Daily Brief automatically; this log is for the narrative beats worth reading later. (Reference the env var, never the literal path — it must stay out of git.)
