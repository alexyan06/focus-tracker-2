---
name: ui-voice
description: Use alongside frontend-design for any UI copy or interaction tone in this app — nudge banners, notifications, summaries, empty states, error messages. Defines this specific product's voice so it doesn't read as generic or alarming.
---

# UI Voice — Focus Tracker

This is a tool that's supposed to feel like a calm coworker glancing over, not a scolding app or a gamified guilt machine. Every piece of copy and every interaction should be checked against that bar.

## Tone rules

**Never moralize, never guilt.** A nudge reports a fact and restates the user's own stated intent back to them — it does not editorialize about willpower, productivity, or worth. "It's been 6 minutes since you said you wanted to: {task}" is the voice. "You're getting distracted again!" or "Stay focused!" is not — it's not this app's job to motivate through pressure.

**The app reports state, the user decides what to do with it.** Nudges inform; they don't command. Avoid imperative phrasing on nudges themselves ("Stop browsing Reddit") — restate the task, not the behavior to stop.

**Active voice, plain verbs, sentence case.** A button that starts a session says "Start session," not "Begin Focus Mode™." The end-of-session view that produces a summary calls it a "summary," consistently, in every place it's referenced — don't let the renderer call it a "summary" while the IPC contract or the Claude prompt calls it a "report."

**Errors and failures are calm and specific, not apologetic and not vague.** If the Claude API call fails during classification, the user (if they ever see anything about it at all — most classification failures should be silent, falling back to `ambiguous` per the activity-classification skill) should see something like "Couldn't check in just now — will try again shortly," not "Oops! Something went wrong 😅" and not a raw error stack.

**Empty states are invitations, not dead ends.** The pre-session screen with empty task/distraction inputs should read as ready-to-go, not as a blank form waiting to be filled out. "What are you working on?" as the task field's placeholder does more work than a label that just says "Task."

## Specific copy patterns to reuse

- Session start prompt: **"What are you working on?"** (task field), **"Anything you want to avoid? (optional)"** (distraction list field) — both phrased as the kind of thing a focused friend would actually ask, not a form.
- Nudge stage 1 (gentle): a short, neutral restatement — no exclamation points, no questions.
- Nudge stage 3 (direct): restates the literal task and elapsed time, per the IPC contract's `nudge:trigger` payload — still flat and factual, just less ignorable (this is the OS notification tier, so the _delivery_ carries the added urgency; the _copy_ doesn't need to also shout).
- End-of-session summary heading: **"Here's how it went"** — not "Your Productivity Report" or anything that sounds like a performance review.

## What to avoid entirely

- Streaks, scores, gamification language ("3-day streak!", "Focus Score: 87")
- Exclamation points anywhere in system-generated copy (nudges, notifications, errors)
- Referring to distraction as "failure," "slipping up," or similar — the data model logs it neutrally as a `distraction_interval`; the copy should match that neutrality
- Any copy that assumes why the user got distracted — the app doesn't know, and shouldn't guess
