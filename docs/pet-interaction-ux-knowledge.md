# Desktop LiveCat Interaction UX Knowledge

Version: 0.2.0
Updated: 2026-06-02
Last reviewed: 2026-06-03
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

## Version Log

- 0.2.0, 2026-06-03: Added explicit versioning and linked this document to the
  five-hour recurring knowledge review cadence. Product theory now lives in
  `docs/pet-product-design-knowledge.md`; asset contracts now live in
  `docs/pet-asset-pipeline-standards.md`.
- 0.1.0, 2026-06-02: Captured initial QQ Pet, context menu, motion, and Pomodoro
  integration conclusions for the v0.9.1 interaction pass.
