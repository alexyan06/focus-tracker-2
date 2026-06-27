# Focus Session Tracker — Product Requirements Document

**Status:** v1 scoping complete, ready for implementation
**Owner:** Alex
**Last updated:** 2026-06-27

---

## 1. Problem Statement

Existing focus/productivity tools fall into two camps: dumb timers (Pomodoro apps with no awareness of what you're actually doing) or heavy-handed blockers (hard-block specific sites/apps, easy to circumvent, no nuance). Neither understands the actual _task_ you declared for a session, and neither can tell the difference between "on Chrome reading documentation" and "on Chrome watching YouTube."

This tool sits between those two: it knows what you said you're working on, watches lightweight signals about what you're actually doing, escalates to deeper inspection only when it's genuinely ambiguous, nudges you back on track with increasing urgency if you drift, and gives you an honest summary at the end — not just "you worked for 50 minutes" but "here's what you actually did, and here's what's logically next."

## 2. Goals

- Ship a tool Alex will actually use daily during work sessions (PNC internship work, Shopify prep, side projects, schoolwork).
- Build something portfolio-worthy that demonstrates real systems-design judgment (cost-aware AI usage, OS-level permission boundaries, sensible escalation logic) — not just "wrapped an LLM API call in a UI."
- Use this build as the vehicle for getting genuinely good at Claude Code (CLAUDE.md, skills, hooks, subagents) — see companion doc `docs/claude-code-workflow.md`.

## 3. Non-Goals (v1)

- No local/on-device model — cloud (Claude API) only for v1. On-device is an explicit, designed-for-later option (see §9), not a v1 deliverable.
- No browsers other than Chrome (extension targets Manifest V3 / Chrome first; Firefox/Safari/Arc deferred).
- No mobile companion app.
- No team/multi-user features, no shared dashboards, no manager-visible reporting.
- No historical analytics beyond the single most-recent session's summary (e.g. no "your week in focus" charts in v1).
- No nudge override/dismiss button (see §6.4 — explicit decision to gather false-positive data first).

## 4. User & Core Loop

**User:** Alex, solo developer/CS student, multiple concurrent work contexts (PNC internship, Shopify prep, schoolwork, side projects), heavy browser user, already uses voice-to-text and prefers structured/concise tools over abstract ones.

**Core loop, end to end:**

1. User opens the app, types: (a) what they're working on this session, (b) optional distraction keywords/sites (e.g. "youtube, reddit, twitter").
2. User clicks Start. App begins monitoring in the background (system tray icon, app can be minimized/hidden).
3. Every ~5–10s, the app captures a cheap signal (active app name + window title, or active browser tab URL/title via extension) and classifies it as on-task / distraction-match / ambiguous against the declared task and distraction list.
4. Ambiguous signals that persist ~60s get escalated to a screenshot + Claude vision call to resolve what's actually on screen.
5. Sustained distraction triggers an escalating nudge (in-app banner → OS notification → OS notification restating the task). Returning to task resets the nudge stage immediately; the distraction interval is still logged.
6. User clicks End Session (or closes the app). App generates an end-of-session summary via Claude: what was actually done, time on-task vs. distracted, and 2–4 concrete next-step suggestions.
7. Summary + session log saved locally (SQLite). User can review past sessions' summaries (simple list, not analytics — v1).

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Electron App (TypeScript)                                   │
│                                                               │
│  Main process (Node.js, has OS access):                     │
│   - active-win          → active app name + window title    │
│   - powerMonitor        → idle time detection                │
│   - desktopCapturer     → screenshot of active window        │
│   - local WebSocket server (port TBD) ← extension connects  │
│   - better-sqlite3      → session/event log storage          │
│   - Claude API client   → classification + vision + summary  │
│                                                               │
│  Renderer process (React + TS + Tailwind + shadcn/ui):       │
│   - Session start screen (task + distraction list input)    │
│   - Active session view (current status, elapsed time)      │
│   - Nudge banner (in-app, stage 1)                           │
│   - End-of-session summary view                              │
│   - Past sessions list                                       │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ ws://localhost:PORT
                          │
┌─────────────────────────────────────────────────────────────┐
│ Chrome Extension (Manifest V3)                              │
│  - Reads active tab URL + title on tab change/focus         │
│  - Sends to local Electron app via WebSocket                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   Claude API (cloud)   │
              │  - text classification │
              │  - vision escalation    │
              │  - end-of-session       │
              │    summary + next steps │
              └────────────────────────┘
```

**Why a desktop shell at all:** the core feature — observing the active window/app across the whole OS, not just one browser tab — is something a website is architecturally forbidden from doing (browser sandboxing). A desktop app gets OS-level permission (after explicit user consent — see §8) to ask "what's focused right now," "how long has input been idle," and "take a screenshot," which a web page categorically cannot do in the background. The Electron shell is the thing that unlocks this; everything else (React UI) is otherwise ordinary web code.

**Why Electron over Tauri:** Tauri produces smaller, more efficient binaries, but its no-Rust JS API doesn't have first-party coverage for active-window-title detection or idle detection (screenshot capture does have a usable community plugin, `tauri-plugin-screenshots`). Electron's npm ecosystem (`active-win`, built-in `powerMonitor`, built-in `desktopCapturer`) covers all three OS hooks this app needs without writing any Rust. Given the explicit constraint of staying in TypeScript end-to-end, Electron removes the one variable that could stall the build mid-way.

## 6. Feature Specification

### 6.1 Session Setup

- Text input: task description (free text)
- Text input: distraction list (comma-separated keywords/domains, optional — empty list means rely entirely on task-drift detection, no static blocklist)
- "Start Session" button → begins monitoring, starts session timer

### 6.2 Monitoring & Classification

**Signal tiers:**

1. **Cheap signal (native):** `active-win` returns `{ owner: appName, title: windowTitle }` on each tick.
2. **Cheap signal (browser):** extension pushes `{ url, tabTitle }` over WebSocket whenever the active tab changes or the browser window regains focus.
3. **Classification pass (rule-based, instant, no API call):** check cheap signal against the user's distraction list (substring/domain match). If matched → distraction, skip to §6.3. If clearly on-task (e.g. window title contains a project name matching the declared task) → on-task, no further action.
4. **Ambiguous case:** signal doesn't clearly match distraction list or task (e.g. generic "Google Chrome" with no extension data yet, or a window title that doesn't obviously relate to either). If ambiguous for ≥60 continuous seconds → escalate.
5. **Vision escalation:** capture screenshot of the active window (`desktopCapturer`, scoped to the focused window, not full screen) → send to Claude vision API along with the declared task and distraction list → get classification back (on-task / distraction / drift, with brief reasoning).

**Tick rate:** 5–10s for cheap-signal polling. Once a distraction state is active, tighten the recheck loop to 15–30s (faster recovery detection, since there's no manual override in v1 — see §6.4).

**Drift detection:** even apps/sites not on the explicit distraction list can be flagged if the vision/text classification determines the content doesn't relate to the declared task. This is the main reason classification can't be pure keyword matching — a static blocklist alone misses "technically not blocked, but not what you said you were doing."

### 6.3 Nudge / Escalation Logic

| Stage          | Trigger                                                  | Delivery                                                                                                      |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1 — Gentle     | Distraction sustained 30–60s                             | In-app banner, non-blocking, no sound                                                                         |
| 2 — Noticeable | Sustained 2–3 min, or relapse after Stage 1 reset        | OS-level notification                                                                                         |
| 3 — Direct     | Sustained 5+ min, or repeated relapse pattern in-session | OS notification, restates the literal declared task ("You said you wanted to: {task} — it's been {duration}") |

- **Reset condition:** any classification tick that resolves to on-task immediately resets stage to 0 (no decay timer — instant forgiveness in the moment).
- **Logging (independent of nudge state):** every distraction interval — start time, end time, duration, max stage reached — is written to SQLite regardless of reset, so the end-of-session summary reflects true total distracted time even though in-the-moment nudging is forgiving.

### 6.4 No Override (v1 explicit decision)

There is no dismiss/snooze button on nudges in v1. This is intentional: the goal is to gather real false-positive-rate data before designing an override UX. Known consequence to monitor: since the only way out of a flagged state is the next classification tick seeing you back on-task, a false positive can nag for the length of one check interval. The tightened 15–30s recheck loop during active distraction states exists specifically to bound how long that can last. If real usage shows this is too annoying, a v1.1 patch (not a full v2) should add a lightweight override.

### 6.5 End-of-Session Summary

- Triggered by "End Session" or app close.
- Sends session log (task, distraction list, all classification events, all distraction intervals with durations) to Claude API.
- Output: prose summary of what was actually done, total on-task vs. distracted time, and 2–4 concrete suggested next steps.
- Saved to SQLite alongside the raw session log; viewable later from a simple past-sessions list (no charts/analytics in v1).

### 6.6 Active-Session UI — Minimal and Glanceable

The active-session window must stay out of the user's way during a session. The core constraint: **any UI visible while the user is on-task is a distraction by definition.**

- **Small footprint:** once a session starts, the window shrinks to a compact status strip or retreats to the system tray entirely. It must not sit as a full-sized dashboard competing for screen real estate with the work. The session-start and summary screens can be full-size; the active-monitoring state cannot.
- **Glanceable, not readable:** if a window is visible mid-session, it shows exactly two things — current status (on-task / drifting) and elapsed time. No activity feed, no classification history, no decorative chrome.
- **Nudges must not be visually interesting:** stage-1 in-app banners and OS notifications use plain, low-contrast styling — no color gradients, no entrance animations, no icons designed to draw the eye. A nudge that's visually compelling has already failed: it competes for the attention it's supposed to redirect.
- **Silence is the default:** the vast majority of session time should produce zero visible output. The UI earns attention only when the user is actually drifting. If it looks "active" or "busy" while the user is on-task, something is wrong.

## 7. Data Model (SQLite, local only)

```
sessions
  id, started_at, ended_at, declared_task, distraction_list (json), summary_text

classification_events
  id, session_id, timestamp, signal_type (native|browser|vision),
  raw_signal (json), classification (on_task|distraction|drift|ambiguous),
  reasoning (nullable, populated on vision escalation)

distraction_intervals
  id, session_id, started_at, ended_at, max_stage_reached
```

## 8. Privacy & Permissions

- First launch: explicit OS permission prompts (macOS: Screen Recording, Accessibility) — must be a designed onboarding step, not an afterthought, since the OS will block screenshot/window-title access until granted.
- Visible on/off toggle for monitoring at all times; a paused state the user fully controls.
- Screenshots are taken of the **active window only**, never full-desktop, and are not persisted after a classification call resolves (only the textual classification result + reasoning is stored, not the image).
- Data sent to Claude API is limited to: window titles, tab URLs/titles, and — only on vision escalation — a single active-window screenshot. No raw keystroke or full-screen data ever leaves the device.

## 9. Deferred / v2+ Ideas (explicitly out of scope now)

- On-device/local model option for classification (privacy + cost), once the local boundary in the architecture (§5) is already designed to support swapping the classification backend.
- Other browsers (Firefox, Safari, Arc).
- Override/snooze button on nudges, if v1 usage data shows it's needed.
- Historical analytics across multiple sessions (trends, weekly views).
- Mobile companion / remote session viewing.

## 10. Open Risks to Watch During Build

- False-positive rate on drift detection without an override — primary thing to monitor once using it daily.
- Vision API cost per session if ambiguous cases (e.g. unrecognized apps) are more common than expected — worth instrumenting token/cost-per-session from day one.
- Extension ↔ Electron WebSocket reliability (reconnect logic if the Electron app restarts while the browser stays open).
