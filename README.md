# Dreamachine

A single-page, fully static, client-only recreation of Brion Gysin's Dreamachine:
a full-screen light strobe phase-locked to an isochronic audio tone, driven by one
frequency slider (4–13Hz, theta through alpha). Experienced with eyes closed — the
screen is the light source.

**Safety:** 18+ only. Not for anyone with epilepsy, a history of seizures, or
photosensitivity. Not a medical device. A mandatory consent gate fronts the app and
every interrupt (Stop button, Space, Escape, tap anywhere) halts both outputs
instantly.

See `SPEC.md` for the full technical specification and `PLAN.md` for the build plan.

## Commands

```sh
bun install
bun run dev        # dev server
bun run build      # static export to out/
bun run preview    # serve out/ via wrangler pages dev
bun run test       # Vitest unit tests
bun run test:e2e   # build + Playwright e2e against the static export
```

## Architecture in one paragraph

`lib/strobeEngine.ts` owns both outputs, driven by a single clock —
`AudioContext.currentTime`. The audio path gates a 200Hz sine carrier with gain
events scheduled in a ~100ms lookahead window; the visual path is a
`requestAnimationFrame` loop deriving on/off from the same `currentTime` via a pure
phase function. Light and tone cannot drift apart because neither has its own timer.

Deploys as a static export (`out/`) to Cloudflare Pages. No backend, no analytics,
nothing leaves the browser.
