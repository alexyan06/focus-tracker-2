# First Claude Code Session — Task Order

Work through these roughly in order. Use plan mode for every item marked (plan) — read the plan before approving execution. Run `npm run typecheck` (or the pnpm equivalent) after each item before moving to the next.

1. **(plan) Scaffold `app/` as a real electron-vite + React + TypeScript + Tailwind project**, replacing the placeholder `app/package.json` scripts with real ones. Keep the existing `src/main`, `src/renderer`, `src/preload` split — don't let the scaffolder flatten it.
2. **Wire up shadcn/ui** in the renderer (Tailwind config, component setup) — no components yet, just the working pipeline.
3. **(plan) Implement the typed IPC bridge** (`preload/index.ts`) covering every channel in `docs/ipc-contract.md` — stub the main-process handlers to return fake data for now, just get the renderer ↔ main wiring type-safe and working end to end.
4. **Add `better-sqlite3`**, create the schema from `docs/PRD.md` §7 (`sessions`, `classification_events`, `distraction_intervals`), confirm the main process can read/write it.
5. **(plan) Implement `active-win` + `powerMonitor` polling** in the main process, on a 5–10s tick, logging raw signals to console (not yet wired to classification) — confirm you're actually getting real window titles before building logic on top of it.
6. **Build the session-start UI** (task + distraction list inputs) wired to the real `session:start` IPC channel, writing a real row to `sessions`.
7. **(plan) Implement tier 1 (rule-based) classification** per `.claude/skills/activity-classification/SKILL.md` — no API calls yet, just the matching logic against the live polling signal from step 5.
8. **Scaffold `extension/`** as a Manifest V3 project using the existing `extension/src/manifest.json`, implement the WebSocket client per `docs/ipc-contract.md`, confirm it connects to a simple echo server in `app/` first before wiring real data.
9. **(plan) Wire the extension's real tab data into tier 1 classification**, replacing/supplementing the native-only signal from step 7.
10. **(plan) Implement tier 2 (dwell timer) + tier 3 (vision escalation)**, including the Claude API client wrapper mentioned in `CLAUDE.md`'s architecture rules — this is the first real external API cost, test it deliberately with a couple of manual ambiguous cases before trusting it in a live loop.
11. Everything past this point (nudge state machine, end-of-session summary, past-sessions view) — revisit this list once 1–10 are solid; don't plan further ahead than that, since steps 7–10 will likely surface adjustments worth making before continuing.

Notes for whoever (you, future-you) is running this:

- Don't skip straight to step 10 because "that's the interesting part." Steps 1–9 are what make step 10 trustworthy instead of guesswork.
- If Claude Code goes sideways twice on the same step, `/clear` and restart with a sharper prompt rather than patching a derailed session — see CLAUDE.md workflow notes.
