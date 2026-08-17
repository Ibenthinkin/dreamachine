# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Built and deployed.** All PLAN.md phases done: private GitHub repo (`Ibenthinkin/dreamachine`) auto-deploys to Cloudflare Pages on push to `main` (build `bun run build`, output `out`). Desktop verified live. Outstanding: iOS Safari smoke test on a real iPhone (SPEC §12). `SPEC.md` remains the source of truth for requirements and architecture.

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

## Project log (`log.md`)

`log.md` at the repo root is this project's running log — the decisions, findings, and dead-ends that don't live in commit messages. It **complements** commits (which record *what changed in code*); don't duplicate what a commit already says.

Ben's planning vault resolves this repo through the project root note's `repo:` field and reads this file directly for his Daily Brief. **A session that isn't logged here is invisible to him** — there are no hooks backing this up.

**Format** — newest entry at the **top**, prepended. Never append to the bottom:

- `## YYYY-MM` month groupers, newest month first.
- `### [[MM-DD-YY ddd]] — <title>` day headings (wikilink form; one entry per day — a second write the same day *extends* that entry, never adds a duplicate heading).
- Record the *why* — the reasoning, the alternatives rejected, what's next — not a line per commit.

**Session spend** — every entry ends with a line recording the token spend of the work it covers. **Never estimate it**; get it from the shared script:

```sh
python3 ~/.claude/scripts/session-spend.py --session <session-uuid>
```

The session UUID is the second-to-last path component of the scratchpad path in your system prompt. Paste the script's stdout **verbatim**. **If it exits non-zero** (no transcript found, or nothing new since the last entry), **omit the line entirely** — don't substitute a guess.

**Write triggers:** on demand; at commit checkpoints; and at the end of any session that made real progress, as a backstop for sessions that end without a commit.

> [!note] **Superseded pattern.** This repo previously bridged its log into the vault via a `VAULT_LOG_PATH` env var in `.env`. That pattern is retired vault-wide — it required a human to copy lines over by hand and reliably went stale. The log now lives here, in git, and the vault reads it directly. If you find a lingering `VAULT_LOG_PATH` reference anywhere in this repo, remove it.
