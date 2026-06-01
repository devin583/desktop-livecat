# Focus Loop

Desktop LiveCat uses a local-first focus loop inspired by TickTick's Focus/Pomo
workflow. The implementation is intentionally offline-only: no TickTick account,
cloud sync, task API, app whitelist, or white-noise service is required.

References:

- TickTick Focus overview: https://help.ticktick.com/articles/7055782010496745472
- TickTick Pomodoro FAQ: https://help.ticktick.com/articles/7055792921664028672
- TickTick focus update note: https://blog.ticktick.com/2020/05/06/brand-new-focus-experience-ticktick/

## Runtime Modes

- `pomo`: countdown focus sessions with short and long breaks.
- `stopwatch`: count-up focus sessions for open-ended work.

Both modes bind to `currentTask`, keep local records, and can run fully offline.
The pet reacts through the shared activity protocol: focus, break, happy, and
typing states all work with Live2D fallback rendering and spritesheet packs.

## Local State

The persisted `pomodoro` object contains:

- Timer settings: `focusMinutes`, `breakMinutes`, `longBreakMinutes`,
  `longBreakEvery`, `longBreakEnabled`, and `autoFlow`.
- Session state: `focusMode`, `mode`, `remainingSeconds`, `running`,
  `activeStartedAt`, `activePlannedSeconds`, `pauseCount`, and `extraSeconds`.
- Planning fields: `currentTask`, `estimatedPomos`, and `estimatedMinutes`.
- Daily counters: `completedToday`, `focusSecondsToday`, and
  `breakSecondsToday`.
- History: `records`, trimmed to the latest 500 entries.
- Completion UI: `completionReview`, which powers the lightweight review card.

`records` are static JSON entries. They never contain keystrokes, window titles,
URLs, or input text beyond the task title typed directly into the app.

## Completion Review

When a focus session completes, the app creates a local record and shows a small
review card instead of a large modal. Supported actions:

- Done/rest: dismiss the review and keep the next timer state.
- Continue +5: start a short follow-up focus session.
- Adjust +5: add five minutes to the latest record and mark it adjusted.
- Skip break: return to the next focus timer without starting the break.

Stopwatch sessions are saved manually through the finish button and use the same
record and review path.

## Stats

The control strip has three focus tabs:

- Timer: mode switch, task binding, presets, estimates, and auto-flow controls.
- Stats: today and seven-day summaries.
- Records: the most recent local focus records.

Daily counters are reset by local date. Historical records remain in the local
state file so they can be copied with the `data/` directory for migration.
