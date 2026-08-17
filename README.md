# Dreamachine

A single-page, fully static, client-only recreation of Brion Gysin's Dreamachine:
a full-screen light strobe phase-locked to an isochronic audio tone, driven by one
frequency slider (4–13Hz, theta through alpha). Experienced with eyes closed — the
screen is the light source.

**Safety:** 18+ only. Not for anyone with epilepsy, a history of seizures, or
photosensitivity. Not a medical device. A mandatory consent gate fronts the app and
every interrupt (Stop button, Space, Escape, tap anywhere) halts both outputs
instantly.

There is no hosted demo linked here, and that is deliberate — publishing the source
and handing strangers a one-click strobe are separate decisions. Build it yourself
if you want to try it.

See `SPEC.md` for the full technical specification and `PLAN.md` for the build plan.

## Why it stops at 13Hz

The 4–13Hz range is a safety ceiling, not a taste decision. Photosensitive response
peaks in roughly the **15–25Hz** band, and the slider's maximum stops deliberately
short of it — a device that can't reach the most provocative frequencies is safer
than one that can and merely warns about it.

The bound is enforced in the engine, not the UI: `clampFrequency` runs inside both
`start` and `setFrequency`, so it holds no matter who calls them. Raising
`MAX_FREQUENCY_HZ` is a safety change, not a tuning one.

This narrows the risk; it doesn't eliminate it. Photosensitive individuals can be
provoked below 15Hz, which is why the cap is layered with the consent gate, the
persistent disclaimer, and the interrupt rather than replacing them. See `SPEC.md`
§8 for the full safety argument.

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

## License

[Apache-2.0](LICENSE). Chosen over a shorter permissive license specifically for its
explicit warranty disclaimer (§7) and limitation of liability (§8) — this project
flashes lights at people, and that language should be attached to it.

**No warranty of any kind.** Use it, fork it, and run it at your own risk.
