# Dreamachine — Build Plan & Checklist

Work top to bottom. Each phase ends with **✅ Done when** acceptance checks — don't move on until they pass. Source of truth for requirements: `SPEC.md`.

## Phase -1 — Repo & project setup

- [ ] `git init` (repo is not yet a git repo); confirm `.gitignore` covers `.env`
- [x] Verify `log.md` exists at the repo root (the vault reads it directly for the Daily Brief)
- [ ] Scaffold: `bunx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"` (accept overwrite prompts carefully — keep `SPEC.md`, `CLAUDE.md`, `PLAN.md`, `.env*`)
- [ ] `next.config.ts`: set `output: "export"`
- [ ] Replace scripts in `package.json` with the SPEC §10 set: `dev` = `bun run --bun next dev`, `build` = `bun run --bun next build`, `preview` = `bunx wrangler pages dev out`
- [ ] `bun run dev` boots; `bun run build` emits `out/`
- [ ] First commit

**✅ Done when:** clean build + dev server, `.env` untracked, initial commit exists.

## Phase 0 — Core engine prototype (the real risk)

Build `lib/strobeEngine.ts` + a bare `StrobeSurface` in isolation before anything else.

- [ ] Write the **pure phase function** first: `(currentTime: number, frequencyHz: number) => boolean` — `phase = (currentTime * frequencyHz) % 1`, `isOn = phase < 0.5`. Export it separately (it's the main unit-test target)
- [ ] `createStrobeEngine()` per SPEC §5 interface: `start`, `stop`, `setFrequency`, `onTick`
- [ ] Audio path: one `AudioContext` per engine; `OscillatorNode` (200Hz sine) → `GainNode` → destination; gate gain on/off with `gain.setValueAtTime` scheduled in a ~100ms lookahead window ahead of `audioContext.currentTime` (re-fill the window on a short interval). Never `setTimeout` for the gating itself
- [ ] Visual path: `requestAnimationFrame` loop reads the **same** `audioContext.currentTime`, calls the pure phase function, invokes `onTick` subscribers. No second timer, ever
- [ ] `setFrequency` writes one shared value read by both paths; apply on next cycle boundary; ramp gain over a few ms on change (no clicks/pops)
- [ ] Throwaway test page: full-viewport div flipping black/white via `onTick`, hardcoded Start button + freq
- [ ] **Drift validation:** run 10+ minutes at ~8Hz; audio pulse and visual flash must stay perceptibly locked (also eyeball a logged `currentTime`-vs-frame-phase delta; budget < ~20ms). If rAF drifts: fall back to AudioWorklet-driven visual tick (SPEC §12)
- [ ] Start latency from click to first flash/tone < 100ms

**✅ Done when:** 10-minute session with no perceptible audio/visual drift; latency < 100ms.

## Phase 1 — Consent gate

- [ ] `components/ConsentGate.tsx`: 18+ requirement, epilepsy-history exclusion, non-medical-device disclaimer, "I understand and accept" button
- [ ] Accept writes `localStorage["dreamachine_consent_accepted_at"] = <ISO timestamp>`
- [ ] `app/page.tsx`: renders `ConsentGate` when no valid record, else `DreamachineScreen`; **no code path renders `DreamachineScreen` without consent**
- [ ] Reload after accepting skips straight to main screen

**✅ Done when:** gate blocks first visit, acceptance persists across reload, no bypass path.

## Phase 2 — Frequency slider

- [ ] `components/FrequencySlider.tsx`: range input 4–13Hz (pick a step, e.g. 0.1), current Hz shown numerically
- [ ] `hooks/useStrobeEngine.ts`: wraps `createStrobeEngine()`; exposes `{ isRunning, frequencyHz, start, stop, setFrequency }`
- [ ] Slider `onChange` → `engine.setFrequency` live while running — no glitch/pop, no restart
- [ ] Arrow keys adjust Hz (works eyes-closed)

**✅ Done when:** dragging the slider mid-session audibly/visibly changes tempo smoothly.

## Phase 3 — Safety interrupts (load-bearing)

- [ ] Start/Stop toggle button (large target); Start fires both outputs simultaneously
- [ ] **All** of these immediately halt both outputs: Stop button, Space bar, Escape key, tap/click anywhere on the strobe surface
- [ ] Wired at top level (document/window listeners in `useStrobeEngine`) — works regardless of focus
- [ ] Stop halts audio and visual **together**, instantly (no fade-out lag)

**✅ Done when:** every interrupt path works with eyes closed, even after clicking random elements first.

## Phase 4 — Styling pass

- [ ] `components/StrobeSurface.tsx`: true full-bleed viewport color flip (fixed inset-0 div, black ↔ white), nothing else visible while running
- [ ] Persistent footer disclaimer on `DreamachineScreen` (same 18+/epilepsy/non-medical copy — visible during use, not just at the gate)
- [ ] Large tap targets; slider + Start/Stop operable by feel/glance before closing eyes
- [ ] Minimal Tailwind chrome — the strobe IS the product

**✅ Done when:** usable comfortably on phone + desktop with eyes closed after start.

## Phase 5 — Testing

- [ ] Vitest setup: `bun add -d vitest`; `bunx vitest run path/to/file.test.ts` for a single file
- [ ] Unit: pure phase function (boundaries: phase 0, 0.4999, 0.5, freq changes), gain-scheduling helper, consent read/write
- [ ] Playwright setup: `bun add -d @playwright/test && bunx playwright install`
- [ ] E2e: gate blocks main screen until accepted → persists across reload → Start runs both outputs (`AudioContext.state === "running"` + surface toggling) → Stop/Escape/tap halts both → slider changes live frequency

**✅ Done when:** all unit + e2e tests green.

## Phase 6 — Deploy

- [ ] Create **private** GitHub repo, push
- [ ] Cloudflare Pages: connect repo; build command `bun run build`, output dir `out`
- [ ] Verify deployed site: consent gate → strobe works → works offline after load (no network requests after initial load — check devtools Network tab)
- [ ] **iOS Safari smoke test on a real iPhone** (SPEC §12 flags this as unvalidated): audio starts on user gesture, strobe fullscreen, interrupts work

**✅ Done when:** live URL works end-to-end on desktop + iPhone.

## Parked (do not build in v1)

Color/pattern variation, guided/ramping frequency presets, TV version.

## Session rollup

At the end of any session with real progress: add an entry at the **top** of `log.md` at this repo's root, under the latest `## YYYY-MM` header. Ben's vault reads that file directly for his Daily Brief. See `CLAUDE.md` → "Project log" for the format and the session-spend line.
