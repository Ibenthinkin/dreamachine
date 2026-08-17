Running log for Dreamachine. Newest entries at the top, under the latest `## YYYY-MM` header.

## 2026-08

### [[08-17-26 Mon]] — Log migrated repo-side; prepped for going public

**Going public — the pre-flight list.** Repo is being flipped from private to public, and three things landed first:

- **Apache-2.0 `LICENSE` added.** The repo had no license at all, which technically made it all-rights-reserved — nobody could legally fork it. Apache-2.0 over MIT specifically for §7 (warranty disclaimer) and §8 (limitation of liability): for a project whose entire function is flashing lights at people, that language is the closest thing to a real shield, and it's worth more than the brevity MIT buys. Text taken verbatim from the copy shipped in `node_modules/@playwright/test`, CRLF stripped, copyright line replaced; body diffed against the source to confirm it's unmodified.
- **The 4–13Hz cap is now documented as a safety decision, not a spec detail.** This is the strongest safety argument the project has and it was previously invisible — the range sat in the spec looking like a taste call. A device that *cannot reach* the ~15–25Hz photosensitive-response peak is safer than one that can and merely warns; that's a design-level argument worth more than another paragraph of disclaimer copy. Written up in SPEC §8.1 (with the honest caveat that it narrows risk rather than eliminating it — sub-15Hz can still provoke, which is why the cap is layered with the gate/disclaimer/interrupt rather than replacing them), and mirrored into README, `CLAUDE.md`'s non-negotiables, and a comment over the constants in `lib/strobeEngine.ts`. The load-bearing detail in all four: `clampFrequency` runs inside `start`/`setFrequency`, so the bound holds at the **engine boundary**, not just as the slider's `min`/`max`. Framed everywhere as "raising `MAX_FREQUENCY_HZ` reopens SPEC §8.1" so a future session can't treat it as a tuning tweak.
- **Demo link pulled from the README.** Publishing source and handing strangers a one-click strobe are separable decisions, and Ben split them: source public, deployed URL not advertised from the repo. He's changing the Cloudflare URL separately so the link sitting in commit `cd21b52` dies with it — which is why no history rewrite was needed. README now says the omission is deliberate rather than leaving a silent gap; recorded as posture in SPEC §8.3.

Also swept while in here: SPEC §12's two open questions are closed (slider range settled *as a safety decision*; iOS Safari smoke test passed 07-08), `private GitHub repo` references updated across SPEC/`CLAUDE.md`, and `license: "Apache-2.0"` added to `package.json` (kept `private: true` — that's npm-publish protection, unrelated to repo visibility).

**Checked before flipping visibility:** `.env` was never committed (gitignored from the initial commit); a secret scan across all of `git rev-list --all` came back with only false positives (bun.lock integrity hashes, the word "spend" in `CLAUDE.md`). 20 Vitest tests green, lint clean.

**Next:** flip repo visibility on GitHub, change the Cloudflare Pages URL.

---

**Changed:** this file replaces the vault-side log at `05 Projects/Dreamachine/log.md`, which was bridged in via a `VAULT_LOG_PATH` env var in `.env`. Dreamachine was the last project still on that retired pattern; the vault's `/brief` now reads this file directly through the project root note's `repo:` field. The `VAULT_LOG_PATH` references in `CLAUDE.md`, `SPEC.md`, `PLAN.md`, and `.env.example` were removed in the same pass, and the vault-side log carries a retirement banner pointing here.

**Why:** the env-var bridge required a human or a session to copy a line into the vault by hand at milestone beats, and it went stale — this log's last entry was 07-08 despite the repo being live. A log that lives in git next to the code it describes can't drift from it.

Entries below 07-08 are carried over verbatim from the vault-side log.

*Session spend: 3.37M tok (in 94 · out 27.0k · cache r 3.21M / w 134.1k) · ~$3.62 · opus-5 · 11:20→11:47*
*Session spend: 337.3k tok (in 8 · out 3.3k · cache r 331.1k / w 2.9k) · ~$0.28 · opus-5 · 11:47→11:48*

## 2026-07

- [[07-08-26 Wed]] — **Release check passed — v1 is fully shipped.** iPhone Safari smoke test and an offline/no-network check on the live Cloudflare Pages URL both came back clean. Closes out the last item from the 07-06 deploy.
- [[07-06-26 Mon]] — **Deployed.** Private repo pushed to GitHub (`Ibenthinkin/dreamachine`), connected to Cloudflare Pages (build `bun run build`, output `out`), push-to-deploy live and desktop-verified. One build fix along the way: Bun-typed e2e helpers excluded from Next's typecheck sweep. **Remaining:** iPhone Safari smoke test + offline/no-network check on the live URL.
- [[07-06-26 Mon]] — **v1 built: Phases -1→5 complete.** Claude Code scaffolded Next.js 16 + Tailwind v4 via Bun (static export), built `lib/strobeEngine.ts` (gain-gated 200Hz carrier scheduled in a 100ms lookahead window + rAF visual loop, both off one `AudioContext.currentTime` clock; pure phase function exported for tests), consent gate with no-bypass SSR default, live 4–13Hz slider, window-level interrupts (Space/Esc/tap-anywhere/Stop), full-bleed strobe surface + persistent footer disclaimer. 20 Vitest unit + 13 Playwright e2e tests green against the static export. Headless 10-min drift validation at 8Hz: max edge deviation 18.2ms, mean 6.5ms, 0 of 9,598 flips over the 20ms budget; start latency ~85–90ms (<100ms). **Next:** Phase 6 — private GitHub repo push, Cloudflare Pages connect, iPhone Safari smoke test.
- [[07-05-26 Sun]] — **`SPEC.md` generated + handed off.** Hosting decided: **Cloudflare Pages** (static export, no backend needed at all — no DB/auth/API layer, so tRPC/Drizzle/NextAuth are all out of scope). Wrote `SPEC.md` covering the strobe/tone phase-lock engine (`lib/strobeEngine.ts`, driven off `AudioContext.currentTime`), the consent-gate + escape-hatch safety requirements, and a 6-phase build order starting with a Phase 0 drift-validation prototype. **Next:** Ben installs packages + runs `/init` in the code repo, then Phase 0 build via plan mode referencing `@SPEC.MD`.
- [[07-04-26 Sat]] — **Project created.** Graduated from the Idea-Forge idea *Dreamachine* after a full capture → refine → evaluate → decide pass. Refine surfaced Ben's history with Mitch Altman's Make Magazine brain-machine kit and current use of Lumenate as the reference points; TV version explored and descoped. Viability research confirmed the technical approach (Web Audio API isochronic tones + `AudioContext.currentTime`-locked strobe timing), found no existing open-source project combining full-screen strobe + synced tone in one web app, and surfaced real photosensitive-epilepsy risk data (original Dreamachine's ~1-in-10,000 adult seizure rate) — making a Lumenate-style warning/consent screen required MVP scope, not optional. Scored 🔥4 · 💰4 · ⚙️2 · ✅5 (priority 6). Set up as a **hybrid** project following the Ambit pattern: planning notes live privately in the vault; code has its own private repo here. **Next:** Phase 0 — core strobe + tone prototype.
