# AI 猫猫桌宠素材生成规格书

## 0. 结论

不要让 AI 直接一次性生成“整张 7 x 9 spritesheet 并希望它自然流畅”。这是最容易失败的路线：AI 很容易出现猫脸漂移、键盘底线不齐、每格比例变化、边缘脏像素、动作没有 anticipation 和 settle。

推荐路线是先生成“标准角色设定 + 分层静态主图 + 动作关键帧”，再由程序或动画工具做运动。真正想要可爱、真实、流畅，必须把猫、键盘、阴影、道具拆开。扁平 spritesheet 只能做中等效果；分层 rig 才能做“猫动、键盘稳、尾巴有惯性、眼睛会跟随、摸头有回弹”。

本项目建议采用两级交付：

1. **短期可接入版：Enhanced Spritesheet Pack**
   - 每只猫一张透明 spritesheet。
   - 键盘底线固定，动作通过多帧表现。
   - 适合快速替换现有 `orange-tabby-keyboard-v2` / `gray-british-keyboard-v2`。

2. **最终推荐版：Layered Rig Pack**
   - 每只猫一套分层 PNG/PSD/SVG。
   - 猫、键盘、尾巴、爪子、眼睛、耳朵、道具、阴影全部拆层。
   - 后续可接 Live2D、Spine、Rive，或我们自己的 2D 参数动画。

## 1. 动效原则

桌宠不是普通 UI 按钮。它需要三类运动叠加：

- **生命感 idle**：呼吸、眨眼、尾巴慢摆、耳朵偶发抖动，周期不能完全规律。
- **输入反馈**：打字、点击、摸头必须响应快，但不能一帧切走；动作要有下压、回弹、余韵。
- **情绪表演**：开心、困、被夸、被喂、被逗，需要表情、身体、尾巴、道具联动。

每个动作都按三段设计：

| 阶段 | 作用 | 时间参考 |
| --- | --- | --- |
| Anticipation | 预备动作，例如耳朵先动、头先轻微下沉、眼睛先看向目标 | 80-250ms |
| Main Action | 主动作，例如爪子拍键、头蹭、尾巴甩、身体探出 | 250-900ms |
| Settle | 回弹和稳定，例如尾巴延迟停下、身体轻微回正 | 400-2400ms |

曲线建议：

| 用途 | CSS / 插值曲线 |
| --- | --- |
| 标准温和移动 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 快速响应后慢停 | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 可爱回弹 | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| 重量感下沉 | `cubic-bezier(0.65, 0, 0.35, 1)` |
| 机械式禁止 | `linear`，除非用于匀速漂浮特效 |

## 2. 角色设定素材

每只猫都先生成一份角色设定图，不要直接跳到动作。

### 2.1 必需输出

每只猫一个 `character_reference.png`，透明或浅中性背景，至少 2048 x 2048，包含：

- 正面坐姿。
- 3/4 视角坐姿。
- 趴在键盘前姿态。
- 开心表情。
- 困倦表情。
- 被摸头表情。
- 生气/不满表情。
- 尾巴形态参考。
- 毛色、花纹、眼睛、鼻口的局部放大。

### 2.2 AI 生成提示词模板

```text
Create a polished 2D character reference sheet for a desktop pet cat.
Subject: [describe the real cat: breed, coat color, markings, eye color, body shape].
Style: cute but not childish, premium desktop companion, soft painterly cartoon, clean silhouette, expressive face, consistent proportions.
Include: front sitting pose, 3/4 sitting pose, lying on a computer keyboard, happy face, sleepy face, petting face, mildly annoyed face, tail shape, close-up details for fur pattern and eyes.
Rules: same cat identity in every pose, same keyboard scale, no text, no labels, no background clutter, transparent or plain light background, crisp edges, no cropped ears or tail.
Output: high-resolution PNG, 2048x2048 or higher.
```

负面提示词：

```text
multiple cats, inconsistent face, different fur markings, extra limbs, deformed paws, broken keyboard, random letters, cropped ears, cropped tail, heavy shadow baked into character, blurry edges, noisy background, text, watermark, logo
```

## 3. Enhanced Spritesheet Pack 短期规格

这是当前项目最容易接入的版本。

### 3.1 画布

每只猫一张透明 PNG 或 WebP：

- 网格：`9 rows x 8 columns`，建议比当前 7 列更宽，给动作留过渡帧。
- 单格：`256 x 224 px` 最低，推荐 `384 x 336 px`。
- 整图：如果单格 256 x 224，则整图 `2048 x 2016 px`。
- 每格安全留白：上 20px，下 20px，左右 20px。
- 格间 gutter：至少 8px。更理想是每格包含透明留白，不让相邻帧贴边。
- 背景：透明。禁止黑底、白底、灰底。
- Alpha：边缘干净，不要半透明脏边。

### 3.2 网格定义

| Row | 状态 | 说明 |
| --- | --- | --- |
| 0 | idle | 呼吸、眨眼、尾巴慢摆 |
| 1 | tap_left | 左爪敲键 |
| 2 | tap_right | 右爪敲键 |
| 3 | typing_loop | 双爪准备/连续打字循环 |
| 4 | focus | 专注，眼神集中，动作少 |
| 5 | break_attention | 休息、提醒、抬头 |
| 6 | happy_petting | 开心、被摸、被夸 |
| 7 | sleepy | 困、打哈欠、趴下 |
| 8 | annoyed_dragged_failed | 被拖拽、不满、失败提示 |

### 3.3 每行动作要求

#### Row 0 idle

- 8 帧。
- 键盘底边完全不动。
- 猫身体只做很轻的呼吸，不能整只上下弹。
- 至少包含一次眨眼。
- 尾巴慢摆，尾巴尖延迟最大。

建议帧时长：

```json
[2200, 180, 140, 180, 2600, 240, 420, 900]
```

#### Row 1 / Row 2 tap_left / tap_right

- 每边 5 到 8 帧。
- 第 1 帧：爪子略抬。
- 第 2-3 帧：快速下压。
- 第 4-6 帧：回弹，爪子回到键盘。
- 键盘主体不能移动，只允许被按的键帽有轻微下沉。

建议总时长：360-520ms。

#### Row 3 typing_loop

- 8 帧。
- 左右爪交替，小幅动作。
- 眼睛可以看键盘或看屏幕。
- 不能每帧都大笑，打字状态应该稳定。

#### Row 4 focus

- 8 帧。
- 表情认真，呼吸更慢。
- 偶尔眨眼、耳朵动。
- 不要剧烈移动。

#### Row 5 break_attention

- 8 帧。
- 包含抬头、提醒、看向用户。
- 可以有小铃铛或提示符号，但符号不能贴边。
- 总时长 2.5-5 秒循环。

#### Row 6 happy_petting

- 8 帧。
- 被摸头：头/耳朵/眼睛变化最大，键盘不动。
- 开心：眼睛眯起、嘴角上扬、尾巴慢摆。
- 不要整只猫弹跳。可爱不是上下震动。

#### Row 7 sleepy

- 8 帧。
- 头逐步下沉，眼皮变重，最后趴在键盘上。
- 呼吸慢。
- 不要突然切换体型。

#### Row 8 annoyed_dragged_failed

- 8 帧。
- 前 3 帧：不满/失败。
- 中间 3 帧：拖拽中的身体倾斜和尾巴跟随。
- 后 2 帧：回正。

### 3.4 spritesheet AI 提示词模板

```text
Create a transparent 9-row x 8-column spritesheet for a cute desktop pet cat sitting behind a computer keyboard.
Character identity: [paste cat identity from reference sheet].
Style: premium 2D cartoon desktop companion, soft painterly shading, crisp clean alpha edges, consistent proportions, expressive but stable.
Canvas: each frame is 256x224 px, 9 rows and 8 columns, transparent background, no grid lines, no text, no labels.
Important: the keyboard bottom baseline must be perfectly aligned in every frame. The keyboard body must not jump, squash, stretch, rotate, or move between frames. Only the cat body parts, paws, face, ears, tail, and small props may animate.
Rows:
0 idle breathing blink tail slow sway.
1 left paw key tap, quick press and soft rebound.
2 right paw key tap, quick press and soft rebound.
3 typing loop with alternating paws.
4 focus mode, calm serious eyes, slow breathing.
5 break attention, looks up and gently reminds user.
6 happy petting praise, squinting eyes, relaxed ears, tail swish.
7 sleepy, head lowers, slow blink, rests on keyboard.
8 annoyed dragged failed, mild grumpy expression and body tilt.
Rules: same cat in every frame, same size in every frame, no cropped ears/tail/props, no background, no baked top shadow, no black outline artifacts, no random text, no watermark.
```

## 4. Layered Rig Pack 推荐规格

这是最终要做出“更动态”的版本。AI 不一定能一次直接输出 PSD，但可以生成分层 PNG 组，或者让支持 PSD 的工具输出 PSD。

### 4.1 文件结构

```text
pet-assets/
  orange-tabby/
    reference/character_reference.png
    layered/source.psd
    layers/
      000_keyboard_shadow.png
      010_keyboard_body.png
      011_keyboard_keys_base.png
      012_key_left_press.png
      013_key_right_press.png
      020_body.png
      021_chest.png
      030_head.png
      031_muzzle.png
      032_nose.png
      033_mouth_neutral.png
      034_mouth_happy.png
      035_mouth_yawn.png
      040_eye_left_white.png
      041_eye_right_white.png
      042_iris_left.png
      043_iris_right.png
      044_eyelid_left_top.png
      045_eyelid_right_top.png
      050_ear_left.png
      051_ear_right.png
      060_paw_left_upper.png
      061_paw_left_lower.png
      062_paw_right_upper.png
      063_paw_right_lower.png
      070_tail_base.png
      071_tail_mid.png
      072_tail_tip.png
      080_whiskers_left.png
      081_whiskers_right.png
      090_prop_fish.png
      091_prop_wand.png
      092_prop_brush.png
      093_prop_heart.png
      094_prop_bell.png
    rig/pivots.json
    rig/actions.json
```

英短同样一份。

### 4.2 分层规则

所有 PNG：

- 同一画布尺寸：推荐 `1024 x 1024` 或 `1536 x 1536`。
- 所有层必须同画布对齐，不要裁成各自小图，除非同时提供位置 JSON。
- 透明背景。
- 每个部件边缘要补画被遮挡区域。例如头转动时，脖子后面不能露空。
- 左右眼、左右耳、左右爪必须拆开。
- 尾巴至少 3 段；如果想更自然，拆 5 段。
- 键盘必须单独一层；键帽高亮/按下状态也单独层。
- 地面阴影单独层，不能烘焙在猫身或键盘边缘。

### 4.3 pivot 标准

`rig/pivots.json` 示例：

```json
{
  "canvas": { "width": 1024, "height": 1024 },
  "pivots": {
    "head": { "x": 512, "y": 468 },
    "ear_left": { "x": 438, "y": 318 },
    "ear_right": { "x": 586, "y": 318 },
    "paw_left_lower": { "x": 430, "y": 665 },
    "paw_right_lower": { "x": 594, "y": 665 },
    "tail_base": { "x": 668, "y": 622 },
    "tail_mid": { "x": 738, "y": 566 },
    "tail_tip": { "x": 808, "y": 510 },
    "keyboard_body": { "x": 512, "y": 760 }
  }
}
```

### 4.4 动作参数

每只猫需要支持这些参数：

| 参数 | 范围 | 用途 |
| --- | --- | --- |
| `look_x` | -1..1 | 眼睛和头看向鼠标 |
| `look_y` | -1..1 | 上下看 |
| `blink` | 0..1 | 眨眼 |
| `sleepiness` | 0..1 | 眼皮、头部下沉 |
| `mood_happy` | 0..1 | 嘴角、眼睛、尾巴 |
| `mood_annoyed` | 0..1 | 眉眼、不满嘴型、耳朵 |
| `paw_left_press` | 0..1 | 左爪敲键 |
| `paw_right_press` | 0..1 | 右爪敲键 |
| `keyboard_left_press` | 0..1 | 左键帽反馈 |
| `keyboard_right_press` | 0..1 | 右键帽反馈 |
| `tail_sway` | -1..1 | 尾巴摆动 |
| `ear_relax` | 0..1 | 被摸/睡觉时耳朵放松 |
| `body_breathe` | 0..1 | 呼吸 |
| `drag_tilt` | -1..1 | 拖拽倾斜 |

## 5. actions.json 标准

```json
{
  "idle": {
    "loop": true,
    "durationMs": 6800,
    "layers": ["body_breathe", "blink", "tail_sway", "ear_micro_twitch"],
    "curve": "cubic-bezier(0.4, 0, 0.2, 1)"
  },
  "petting": {
    "loop": false,
    "durationMs": 1800,
    "phases": [
      { "name": "anticipation", "durationMs": 180 },
      { "name": "nuzzle", "durationMs": 620 },
      { "name": "settle", "durationMs": 1000 }
    ],
    "doNotMove": ["keyboard_body", "keyboard_keys_base", "keyboard_shadow"],
    "curve": "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  "tap_left": {
    "loop": false,
    "durationMs": 420,
    "doNotMove": ["keyboard_body", "keyboard_shadow"],
    "curve": "cubic-bezier(0.34, 1.56, 0.64, 1)"
  }
}
```

## 6. 交互动作清单

必须生成或支持这些动作：

| 动作 | 触发 | 表现标准 |
| --- | --- | --- |
| idle | 无输入 | 慢呼吸、随机眨眼、尾巴慢摆 |
| watching_mouse | 鼠标靠近 | 眼睛先跟，头后跟，幅度小 |
| petting | 鼠标在头部区域轻扫 | 头迎向触摸、眯眼、耳朵放松、尾巴慢摆；键盘不动 |
| tap_left | 键盘左侧输入 | 左爪下压、键帽反馈、回弹 |
| tap_right | 键盘右侧输入 | 右爪下压、键帽反馈、回弹 |
| typing_loop | 连续输入 | 左右爪交替，表情专注 |
| feeding | 点击喂食 | 先闻、再吃、满足眯眼 |
| playing | 点击玩耍 | 眼睛追道具，头/尾巴延迟跟随 |
| cleaning | 点击整理 | 梳子/毛发高光动，猫舒服 |
| praised | 点击夸奖 | 表情开心，尾巴扬起，不要大幅跳 |
| attention_call | 休息提醒 | 抬头看用户，铃铛/提示符出现 |
| focus | 专注计时 | 动作更少，呼吸更慢 |
| break | 休息 | 放松、伸展、眨眼 |
| sleepy | 长时间无输入 | 眼皮重、趴下、呼吸慢 |
| dragged | 真拖拽 | 身体倾斜、尾巴滞后，释放后回弹 |
| failed | 素材/状态异常 | 轻微不满，不要吓人 |

## 7. 质量验收标准

### 7.1 视觉一致性

- 同一只猫每帧脸型、毛色、眼睛、花纹不能漂移。
- 键盘宽度、高度、底线必须稳定。
- 角色不能在不同动作里忽胖忽瘦。
- 不能出现额外爪子、断尾、融化键帽。

### 7.2 动画可用性

- 普通点击不应该触发 dragged。
- 摸猫只让猫有反应，键盘不能整体压缩或上跳。
- 每个动作必须有回落状态。
- 不要所有动作都靠上下跳；至少要有眼睛、耳朵、尾巴、爪子参与。
- 互动动作总时长不小于 900ms；敲键动作不小于 300ms，不大于 550ms。

### 7.3 技术质量

- PNG 必须透明。
- Alpha 边缘不能有黑/白脏边。
- 所有帧不能贴边。
- 道具不能被裁切。
- 图片不能带文字、水印、签名、logo。
- 如果是分层包，所有层必须同画布尺寸并对齐。

## 8. 最推荐给 AI 的生成流程

### Step 1：每只猫生成角色设定图

先生成 `character_reference.png`。如果这一步不稳定，后面动作必崩。

### Step 2：生成分层主图

让 AI 按 Layered Rig Pack 输出“同画布透明 PNG layer set”。如果 AI 不能输出多文件，就让它输出一张分层说明图，再拆分生成每个部件。

### Step 3：生成 6 张关键姿态图

每只猫至少：

- neutral_keyboard_pose.png
- petting_pose.png
- typing_left_pose.png
- typing_right_pose.png
- happy_pose.png
- sleepy_pose.png

### Step 4：生成 spritesheet

只有在角色和关键姿态稳定后，再生成完整 spritesheet。

### Step 5：给我接入

交付以下压缩包：

```text
orange-tabby-assets.zip
gray-british-assets.zip
```

每包至少包含：

```text
manifest.json
reference/character_reference.png
spritesheet/avatar.png
spritesheet/states.json
artist/notes.md
```

推荐额外包含：

```text
layers/*.png
rig/pivots.json
rig/actions.json
```

## 9. manifest.json 模板

```json
{
  "id": "orange-tabby-keyboard-v2",
  "name": "橘猫键盘 Orange Tabby v2",
  "version": "1.0.0",
  "artist": "AI generated, user directed",
  "description": "Enhanced animated keyboard cat desktop pet.",
  "preview": "preview/preview.png",
  "renderMode": "spritesheet",
  "tags": ["spritesheet", "keyboard", "cat", "desktop-pet", "user-supplied"],
  "spritesheet": {
    "image": "spritesheet/avatar.png",
    "columns": 8,
    "rows": 9,
    "frameWidth": 256,
    "frameHeight": 224,
    "statesFile": "spritesheet/states.json"
  },
  "artistWorkflow": {
    "status": "runtime-ready",
    "brief": "artist/notes.md",
    "checklist": "artist/checklist.md",
    "primarySource": "reference/character_reference.png"
  }
}
```

## 10. states.json 模板

```json
{
  "idle": {
    "frames": [
      { "row": 0, "column": 0, "durationMs": 2200 },
      { "row": 0, "column": 1, "durationMs": 180 },
      { "row": 0, "column": 2, "durationMs": 140 },
      { "row": 0, "column": 3, "durationMs": 180 },
      { "row": 0, "column": 4, "durationMs": 2600 },
      { "row": 0, "column": 5, "durationMs": 240 },
      { "row": 0, "column": 6, "durationMs": 420 },
      { "row": 0, "column": 7, "durationMs": 900 }
    ],
    "loopStartIndex": 0
  },
  "tap_left": {
    "frames": [
      { "row": 1, "column": 0, "durationMs": 72 },
      { "row": 1, "column": 1, "durationMs": 88 },
      { "row": 1, "column": 2, "durationMs": 118 },
      { "row": 1, "column": 3, "durationMs": 170 },
      { "row": 1, "column": 4, "durationMs": 110 }
    ],
    "loopStartIndex": null,
    "fallback": "typing"
  },
  "tap_right": {
    "frames": [
      { "row": 2, "column": 0, "durationMs": 72 },
      { "row": 2, "column": 1, "durationMs": 88 },
      { "row": 2, "column": 2, "durationMs": 118 },
      { "row": 2, "column": 3, "durationMs": 170 },
      { "row": 2, "column": 4, "durationMs": 110 }
    ],
    "loopStartIndex": null,
    "fallback": "typing"
  }
}
```

## 11. 最小交付和理想交付

### 最小交付

每只猫：

- `reference/character_reference.png`
- `spritesheet/avatar.png`
- `preview/preview.png`
- `manifest.json`
- `spritesheet/states.json`

### 理想交付

每只猫：

- 上面全部。
- `layered/source.psd`
- `layers/*.png`
- `rig/pivots.json`
- `rig/actions.json`
- 6 张关键姿态图。
- 每个动作一张单独预览 GIF 或 MP4。

## 12. 直接复制给 AI 的总提示词

```text
I need production-ready assets for a desktop pet app. Create two separate cat asset packs: Orange Tabby Keyboard Cat and Gray British Keyboard Cat.

Goal: cute, premium, smooth, expressive desktop companion. The cat sits behind a computer keyboard. The keyboard must remain stable while the cat reacts. Motions should feel alive: breathing, blinking, tail delay, ear twitch, paw taps, petting reaction, feeding, playing, cleaning, praise, attention call, focus, break, sleepy, dragged.

Deliverables for each cat:
1. character_reference.png, 2048x2048 or higher.
2. Transparent 9-row x 8-column spritesheet avatar.png. Each frame 256x224 px. Transparent background. No grid lines. No labels. No watermark.
3. preview.png.
4. Optional but preferred: separate transparent layers for head, body, ears, eyes, eyelids, mouth shapes, left paw, right paw, tail base/mid/tip, keyboard body, keyboard keys, props, and shadow.

Spritesheet rows:
0 idle breathing blink tail slow sway.
1 left paw key tap.
2 right paw key tap.
3 typing loop.
4 focus calm.
5 break attention reminder.
6 happy petting praise.
7 sleepy.
8 annoyed dragged failed.

Strict rules:
- Same cat identity in every frame.
- Same face, markings, fur colors, and proportions across all frames.
- Keyboard bottom baseline perfectly aligned across all frames.
- Keyboard body must not jump, squash, stretch, rotate, or move.
- Only cat parts, keycaps, tail, ears, eyes, and small props may animate.
- Leave at least 20 px transparent padding inside every frame.
- No cropped ears, tail, hearts, bell, fish, brush, wand, or whiskers.
- No baked top shadow. Ground shadow should be below keyboard only or provided separately.
- Clean alpha edges, no black/white halos, no background, no text, no logo, no watermark.

Style:
soft painterly 2D cartoon, crisp silhouette, adorable but not babyish, polished app mascot, expressive eyes, stable keyboard, readable at small desktop size.
```

## 13. 需要你最终给我的东西

按优先级：

1. 两只猫的参考图或真实照片。
2. 两只猫各自的 AI 角色设定图。
3. 每只猫的 spritesheet 或分层 PNG 包。
4. 如果你能生成 PSD，给 PSD；不能生成 PSD，就给同画布透明 PNG layers。
5. 说明你用的 AI 工具、提示词、输出尺寸、是否透明背景。

收到后我会先做三步验证：

1. 检查透明度、裁剪、边缘脏像素、键盘基线。
2. 跑资源包校验并接入当前 app。
3. 在本地预览里逐个测试 idle、typing、petting、playing、sleepy、dragged。
