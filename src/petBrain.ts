import type { AppLanguage, PetCareState, PetPack } from "./types";

export type PetBrainEmotion =
  | "calm"
  | "curious"
  | "focused"
  | "happy"
  | "playful"
  | "proud"
  | "relieved"
  | "sad";

export type PetBrainMotionCue =
  | "attention_call"
  | "cleaning"
  | "feeding"
  | "focus"
  | "failed"
  | "petting"
  | "playing"
  | "praised";

export type PetBrainCareMood =
  | "focus"
  | "petting"
  | "feeding"
  | "playing"
  | "cleaning"
  | "praised"
  | "attention_call"
  | "failed";

export type PetBrainResponse = {
  speech: string;
  emotion: PetBrainEmotion;
  motion: PetBrainMotionCue;
  bubbleDurationMs: number;
  memoryHints: string[];
};

type CareDelta = Partial<Record<Exclude<keyof PetCareState, "lastInteractionAt">, number>>;

type ComposeCareResponseInput = {
  delta: CareDelta;
  language: AppLanguage;
  mood: PetBrainCareMood;
  pet: PetPack;
};

const zhSpeech: Record<PetBrainCareMood, string[]> = {
  focus: ["我把番茄抱好了，开始专注。", "键盘就位，我陪你把这轮跑完。"],
  petting: ["摸到这里会呼噜。", "收到摸摸，耳朵先放松一下。"],
  feeding: ["小鱼收到，键盘先暂停一口。", "吃到了，等我嚼完继续陪你敲键。"],
  playing: ["玩具已锁定，尾巴进入战斗模式。", "开玩，我负责可爱，你负责别分心太久。"],
  cleaning: ["毛毛顺了，清爽。", "刷一下就精神了。"],
  praised: ["听到了，我会把这句存进心情里。", "夸奖已接收，今天也会认真陪你。"],
  attention_call: ["我轻轻敲铃，不吵你。", "提醒一下：节奏还在，我也还在。"],
  failed: ["这颗番茄蔫了，下颗我再陪你。", "没关系，先收拾桌面，我们重开一颗。"],
};

const enSpeech: Record<PetBrainCareMood, string[]> = {
  focus: ["I am holding the tomato. Focus starts now.", "Keyboard ready. I will keep the rhythm with you."],
  petting: ["That spot gets a purr.", "Pet received. Ears relaxing."],
  feeding: ["Snack received. Keyboard pauses for one bite.", "Got it. I will chew, then keep you company."],
  playing: ["Toy locked. Tail entering play mode.", "Play time. I will be cute; you keep the break short."],
  cleaning: ["Fur aligned. Much better.", "A quick brush, and I am fresh again."],
  praised: ["I heard that. Saving it into my mood.", "Praise received. I will stay with you today."],
  attention_call: ["A soft bell, no yelling.", "Small nudge: the rhythm is still here, and so am I."],
  failed: ["This tomato wilted. I will stay for the next one.", "It is fine. Clear the desk, then we start another."],
};

const emotionByMood: Record<PetBrainCareMood, PetBrainEmotion> = {
  focus: "focused",
  petting: "relieved",
  feeding: "happy",
  playing: "playful",
  cleaning: "calm",
  praised: "proud",
  attention_call: "curious",
  failed: "sad",
};

export function composePetBrainCareResponse(input: ComposeCareResponseInput): PetBrainResponse {
  const options = input.language === "zh-CN" ? zhSpeech[input.mood] : enSpeech[input.mood];
  const speech = `${pickStable(options, input.pet.id)}${careDeltaSuffix(input.delta, input.language)}`;

  return {
    speech,
    emotion: emotionByMood[input.mood],
    motion: input.mood,
    bubbleDurationMs: bubbleDurationForMood(input.mood),
    memoryHints: buildMemoryHints(input),
  };
}

function pickStable(options: string[], seed: string) {
  if (options.length <= 1) return options[0] ?? "";
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return options[total % options.length];
}

function bubbleDurationForMood(mood: PetBrainCareMood) {
  if (mood === "failed") return 5400;
  if (mood === "feeding" || mood === "playing" || mood === "petting") return 5200;
  if (mood === "focus") return 4600;
  return 4300;
}

function careDeltaSuffix(delta: CareDelta, language: AppLanguage) {
  const entries = [
    metricEntry("happiness", delta.happiness, language),
    metricEntry("fullness", delta.fullness, language),
    metricEntry("cleanliness", delta.cleanliness, language),
    metricEntry("energy", delta.energy, language),
    metricEntry("bond", delta.bond, language),
  ].filter(Boolean);
  return entries.length ? ` ${entries.slice(0, 2).join(" · ")}` : "";
}

function metricEntry(
  key: Exclude<keyof PetCareState, "lastInteractionAt" | "lastFocusDay" | "level" | "experience" | "coins" | "streak">,
  value: number | undefined,
  language: AppLanguage,
) {
  if (!value) return null;
  const label =
    language === "zh-CN"
      ? {
          happiness: "开心",
          fullness: "饱腹",
          cleanliness: "清洁",
          energy: "精力",
          bond: "亲密",
        }[key]
      : {
          happiness: "happy",
          fullness: "full",
          cleanliness: "clean",
          energy: "energy",
          bond: "bond",
        }[key];
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} ${label}`;
}

function buildMemoryHints(input: ComposeCareResponseInput) {
  const hints = [`care:${input.mood}`, `pet:${input.pet.id}`];
  if ((input.delta.bond ?? 0) > 0) hints.push("relationship:positive");
  if (input.mood === "failed") hints.push("focus:wilted");
  if (input.mood === "focus") hints.push("focus:intent");
  return hints;
}
