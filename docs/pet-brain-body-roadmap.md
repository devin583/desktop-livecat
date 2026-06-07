# Desktop LiveCat Pet Brain And Body Roadmap

Version: 0.1.0
Created: 2026-06-07
Confidence: high for architecture direction, medium for final AI provider choice

This document turns the desktop-pet direction into implementation layers. The
target is not "a timer with a cat skin." The target is a pet-owned companion
whose body, speech, memory, focus loop, and growth loop reinforce each other.

## Current Gap

Desktop LiveCat v0.9.6 has useful foundations:

- validated V2 cat spritesheets;
- local care actions;
- pet-owned Pomodoro props and rewards;
- context menu and panel separation;
- document-level asset standards.

It is still behind strong desktop companions because it lacks:

- a Pet Brain abstraction that chooses speech, emotion, motion, and memory;
- real chat entry and conversation history;
- long-term pet memory and diary;
- Live2D or equivalent layered body control;
- a visible automation loop that makes five-hour design review outputs land in
  the main repository.

## System Layers

### Pet Body

The Pet Body owns visual state and motion:

- renderer: spritesheet, Live2D, Spine, Rive, or hybrid;
- action queue: idle, petting, feeding, playing, focus, break, dragged, failed;
- local body response: head, paw, ear, tail, gaze, prop, and bubble;
- motion timing: anticipation, main action, settle;
- composition contract: keyboard baseline stable, overlays anchored to pet.

Short-term body work can keep spritesheets. Premium body work should move to
Live2D first for the current painterly/raster cats, with Spine as the strongest
skeletal alternative and Rive reserved for vector-first variants.

### Pet Brain

The Pet Brain converts events into structured companion responses:

```json
{
  "speech": "I am holding the tomato. Focus starts now.",
  "emotion": "focused",
  "motion": "focus",
  "bubbleDurationMs": 4600,
  "memoryHints": ["focus:intent", "pet:orange-tabby-keyboard-v2"]
}
```

The first implementation is local and deterministic. That is intentional: the
app needs a stable event contract before it adds cloud or local LLM calls.

Future AI-backed replies must return the same shape. Raw model text must not
directly mutate UI state.

### Pet Memory

Memory should start local and small:

- user name and preferences;
- selected pet identity;
- recent care events;
- focus sessions, completions, skips, and streaks;
- relationship signals such as praise, petting, feeding, and ignored nudges;
- pet diary summaries.

Memory writes should be event-based. Do not store arbitrary full desktop
content unless a later explicit screen-aware mode is added.

### Pet Tools

Tools are commands the pet can explain and emotionally frame:

- Pomodoro controls;
- focus summary;
- local release/update status;
- task reminder;
- later: news summary, Codex task status, file/page summary.

The pet should speak tool results in short bubbles first. Long outputs should
open a chat or detail panel.

## Chat Product Shape

Chat should have two surfaces:

- Bubble chat: short pet speech attached to the character.
- Full chat panel: multi-turn history, longer answers, memory controls, and
  explicit tool calls.

Right-click should expose "Talk" or "Ask pet" as a command, not become a chat
window. The full chat panel owns history and long-form interaction.

## Milestones

### Milestone 1: Local Pet Brain Foundation

Acceptance:

- care/focus events use a shared Pet Brain response object;
- response includes speech, emotion, motion, bubble duration, memory hints;
- no network dependency;
- TypeScript build passes;
- bubble remains anchored to the pet.

### Milestone 2: Visible Five-Hour Review Loop

Acceptance:

- every recurring review has a main-repository-visible artifact;
- automation memory and source worktree diff/status are importable;
- product docs and changelog are updated intentionally, not silently stranded in
  an isolated worktree.

### Milestone 3: Chat Entry

Acceptance:

- pet has a compact "Talk" entry;
- short replies can stay in bubbles;
- long replies open a panel;
- replies map to emotion and motion;
- no model output directly controls runtime state without schema validation.

### Milestone 4: Memory And Diary

Acceptance:

- local memory captures focus/care events;
- pet can summarize today;
- pet diary records focus, care, mood, and streak;
- user can clear memory from settings.

### Milestone 5: Premium Body

Acceptance:

- one cat has a layered source package;
- body parts have stable pivots;
- petting moves head/ears/eyes without moving the keyboard;
- dragging has grab, follow, release, and settle;
- focus completion has an authored celebration or tomato-eat beat.

## QQ Pet Bar

QQ Pet's useful bar is not its old chrome. The bar is:

- closed care loop;
- persistent needs and mood;
- visible growth;
- playful interruptions with restraint;
- enough authored behavior that the pet feels like a character, not a widget.

Desktop LiveCat reaches this bar only when focus, care, chat, memory, and growth
share one state model. Separate panels and disconnected animations do not count.

## Version Log

- 0.1.0, 2026-06-07: Created the Pet Brain and Body implementation roadmap and
  defined acceptance gates for local brain, visible automation, chat, memory,
  and premium body work.
