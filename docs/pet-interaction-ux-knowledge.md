# Desktop LiveCat Interaction UX Knowledge

Version: 0.3.1
Updated: 2026-06-05
Last reviewed: 2026-06-05
Review cadence: every 5 hours through the pet knowledge automation
Confidence: high for menu hierarchy, medium for final visual style until premium pet-specific poses exist

## Sources Read

- QQ Pet overview and retrospective:
  - https://baike.sogou.com/m/fullLemma?lid=42041
  - https://ip.people.com.cn/n1/2018/0717/c179663-30151166.html
  - https://zh.wikipedia.org/wiki/QQ%E5%AE%A0%E7%89%A9
- Virtual pet interaction model:
  - https://en.wikipedia.org/wiki/Virtual_pet
- Context menu guidance:
  - https://developer.apple.com/design/human-interface-guidelines/context-menus
  - https://learn.microsoft.com/en-us/windows/apps/design/controls/menus-and-context-menus
- Motion guidance:
  - https://m2.material.io/design/motion/understanding-motion.html
  - https://m2.material.io/design/motion/speed.html
- Pet + Pomodoro examples:
  - https://mac-pet.com/download/
  - https://mac-pet.com/pomodoro-mac/
  - https://haveanaverageday.itch.io/idle-pomodoro-pet
  - https://www.kofeflow.com/
  - https://mydeskgator.com/

## Stable Design Conclusions

1. Treat care, focus, and settings as different mental models.
   - Care is direct pet affection: petting, feeding, playing, grooming, praise.
   - Focus is task rhythm: start, pause, resume, skip, reset, completion.
   - Settings is global app configuration: pet pack, scale, low power, update, resources.
   - Do not present Pomodoro configuration as another pet-care action.

2. Context menus should stay contextual and short.
   - Right-clicking the pet may expose high-frequency actions for the pet.
   - If a focus session is active, paused, in break, or complete, right-click may expose quick timer controls.
   - Full timer setup belongs in the focus panel, not in the pet care menu.

3. A timer is integrated only when the pet visually owns it.
   - A detached timer card is a parallel app feature, not pet integration.
   - A better fit is a speech bubble, tag, collar chip, head-side badge, desk prop, or expression state that changes with focus/break/pause/complete.
   - The number should appear near the pet body and follow pet scale, not live as a separate corner dashboard.

4. Every direct interaction needs immediate and persistent feedback.
   - Immediate: motion state, prop path, reaction bubble within about 100-250 ms.
   - Persistent: care meter or bond value changes so the action has consequence.
   - Recovery: animation returns to the prior broader state without snapping.

5. QQ Pet's useful lesson is the closed loop, not its old UI.
   - It tied care actions to needs and mood: feed affects hunger/fullness, clean affects hygiene, games affect mood.
   - It also risked annoyance when the pet interrupted work too aggressively.
   - Desktop LiveCat should use gentle cues and user-triggered interactions by default.

6. Pomodoro + pet should express state transitions as character behavior.
   - Focus start: pet prepares desk/keyboard, leans in, timer bubble appears.
   - Focus running: pet works quietly; the timer is small but glanceable.
   - Last minute: pet becomes more alert; avoid alarming motion.
   - Pause: pet waits, looks back, or rings a small bell.
   - Break: pet stretches, naps, or relaxes; timer tone becomes warmer.
   - Completion: reward reaction and bond increase.

7. Motion style rules for this app.
   - Use ease-out or emphasized ease-out for reaction entry.
   - Use 180-280 ms for small UI reveals, 450-900 ms for pet reaction beats, and 1.8-5.5 s for state loops.
   - Use prop arcs and held end poses instead of fast flashes.
   - Avoid moving the whole pet + keyboard as a response to a local touch; local touch should move the pet layer, expression, prop, or overlay.

## 0.9.1 Design Decision

- Remove the always-visible detached focus companion card.
- Show the Pomodoro number as a cartoon bubble attached to the pet only when there is real timer context: running, paused, break, long break, or completion.
- Keep right-click pet menu primarily as pet care.
- Add a separate "current rhythm" quick-control section to the right-click menu only when a timer context exists.
- Keep full Pomodoro setup in the focus panel.

Confidence: high for information architecture and interaction hierarchy; medium for final visual style because richer pet-specific poses still need dedicated sprite states/assets.

## 0.9.4 Design Decision

- Keep Pomodoro setup in the focus panel, but expose context quick controls from
  right-click when the timer is active, paused, break, or completion-review.
- Make the action dock and interaction panel show the currently running care
  action until the reaction completes. This prevents the "clicked feed and it
  jumped back to the first option" failure mode.
- Use longer pet reaction windows: petting and praise are short, feeding and
  playing are medium, completion/failure are held long enough to read.
- Pet-owned focus feedback is now visible in three places: tomato prop, timer
  bubble, and persistent growth values. The panel is no longer the only place
  where focus has meaning.
- Failed or abandoned focus has a distinct mood and wilted tomato. Do not use a
  generic happy animation for failure.
- Runtime overlay props are acceptable for v0.9.4, but every prop must be
  anchored to the pet stage and must not compress the whole cat-keyboard image.

Confidence: high for interaction clarity; medium for final cuteness because the
underlying V2 sheets still lack dedicated action poses.

## 0.9.5 Layout Decision

- Opening the full control panel must not translate the whole pet layer out of
  frame. The pet remains visually grounded in the desktop window.
- The full panel owns configuration and detailed state while it is open, so
  duplicate floating action buttons, timer bubble, and tomato overlay should be
  suppressed.
- Visible tab labels do not need hover tooltips. Tooltips over the tab row create
  visual noise and can be captured as black boxes in ordinary use.
- The floating settings gear should not overlap the full panel. Put close affordance
  inside the panel instead.

Confidence: high. This was verified against a 560 x 620 viewport matching the
Tauri desktop window.

## Version Log

- 0.3.1, 2026-06-05: Added the v0.9.5 layout decision for full-panel behavior:
  no pet-layer translation, no duplicate overlays while the panel is open, and
  no tab-row tooltip clutter.
- 0.3.0, 2026-06-05: Added the v0.9.4 interaction decision for active care
  states, pet-owned tomato focus, growth rewards, and abandon/failure feedback.
- 0.2.0, 2026-06-03: Added explicit versioning and linked this document to the
  five-hour recurring knowledge review cadence. Product theory now lives in
  `docs/pet-product-design-knowledge.md`; asset contracts now live in
  `docs/pet-asset-pipeline-standards.md`.
- 0.1.0, 2026-06-02: Captured initial QQ Pet, context menu, motion, and Pomodoro
  integration conclusions for the v0.9.1 interaction pass.
