import type { AppLanguage, PetCareState, PetMemoryEvent, PetMemoryProfile, PetPack } from "./types";

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

export type PetBrainProvider = {
  id: string;
  resolveChat(input: PetBrainChatInput): Promise<PetBrainResponse | null> | PetBrainResponse | null;
};

type CareDelta = Partial<Record<Exclude<keyof PetCareState, "lastInteractionAt">, number>>;

type ComposeCareResponseInput = {
  delta: CareDelta;
  language: AppLanguage;
  mood: PetBrainCareMood;
  pet: PetPack;
};

export type PetBrainChatInput = {
  care: PetCareState;
  focusMinutesToday: number;
  language: AppLanguage;
  message: string;
  pet: PetPack;
  profile: PetMemoryProfile;
  recentEvents: PetMemoryEvent[];
  runningFocus: boolean;
  taskTitle: string;
};

type ComposeDiaryInput = {
  care: PetCareState;
  careEvents: number;
  day: string;
  focusMinutes: number;
  language: AppLanguage;
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

const allowedEmotions = new Set<PetBrainEmotion>([
  "calm",
  "curious",
  "focused",
  "happy",
  "playful",
  "proud",
  "relieved",
  "sad",
]);

const allowedMotions = new Set<PetBrainMotionCue>([
  "attention_call",
  "cleaning",
  "feeding",
  "focus",
  "failed",
  "petting",
  "playing",
  "praised",
]);

export const localPetBrainProvider: PetBrainProvider = {
  id: "local-deterministic",
  resolveChat: composePetBrainChatResponse,
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

export async function resolvePetBrainChatResponse(
  input: PetBrainChatInput,
  providers: PetBrainProvider[] = [localPetBrainProvider],
): Promise<PetBrainResponse> {
  const fallback = composePetBrainChatResponse(input);
  for (const provider of providers) {
    try {
      const response = await provider.resolveChat(input);
      if (!response) continue;
      return normalizePetBrainResponse(response, fallback);
    } catch {
      continue;
    }
  }
  return fallback;
}

export function normalizePetBrainResponse(
  candidate: unknown,
  fallback: PetBrainResponse,
): PetBrainResponse {
  if (!candidate || typeof candidate !== "object") return fallback;
  const value = candidate as Partial<PetBrainResponse>;
  const speech = String(value.speech ?? "").trim().slice(0, 220);
  const emotion = allowedEmotions.has(value.emotion as PetBrainEmotion)
    ? (value.emotion as PetBrainEmotion)
    : fallback.emotion;
  const motion = allowedMotions.has(value.motion as PetBrainMotionCue)
    ? (value.motion as PetBrainMotionCue)
    : fallback.motion;
  const duration = Number(value.bubbleDurationMs);
  const memoryHints = Array.isArray(value.memoryHints)
    ? value.memoryHints
        .map((hint) => String(hint ?? "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 12)
    : fallback.memoryHints;

  return {
    speech: speech || fallback.speech,
    emotion,
    motion,
    bubbleDurationMs: Number.isFinite(duration)
      ? Math.min(9000, Math.max(2600, Math.round(duration)))
      : fallback.bubbleDurationMs,
    memoryHints,
  };
}

export function composePetBrainChatResponse(input: PetBrainChatInput): PetBrainResponse {
  const text = input.message.trim().toLowerCase();
  const zh = input.language === "zh-CN";
  const petName = input.pet.persona?.name || input.pet.name;
  const recentCare = input.recentEvents.filter((event) => event.type === "care").slice(-2);
  const userName = input.profile.userName;
  const address = userName ? (zh ? `${userName}，` : `${userName}, `) : "";

  if (matches(text, ["番茄", "专注", "focus", "timer", "pomo"])) {
    return {
      speech: zh
        ? `${address}${input.runningFocus ? "我正在陪你守这颗番茄。" : "现在可以开一颗番茄。"}今天已经专注 ${input.focusMinutesToday} 分钟${input.taskTitle ? `，当前任务是「${input.taskTitle}」` : ""}。`
        : `${address}${input.runningFocus ? "I am guarding this tomato with you." : "We can start a tomato now."} You have focused for ${input.focusMinutesToday}m today${input.taskTitle ? ` on "${input.taskTitle}"` : ""}.`,
      emotion: "focused",
      motion: "focus",
      bubbleDurationMs: 5600,
      memoryHints: ["chat:focus", `pet:${input.pet.id}`],
    };
  }

  if (matches(text, ["状态", "心情", "饿", "累", "status", "mood", "hungry", "tired"])) {
    return {
      speech: zh
        ? `${address}我现在开心 ${input.care.happiness}，饱腹 ${input.care.fullness}，精力 ${input.care.energy}。${careSuggestion(input.care, input.language)}`
        : `${address}I am at ${input.care.happiness} happy, ${input.care.fullness} full, and ${input.care.energy} energy. ${careSuggestion(input.care, input.language)}`,
      emotion: "curious",
      motion: "attention_call",
      bubbleDurationMs: 5400,
      memoryHints: ["chat:status", `pet:${input.pet.id}`],
    };
  }

  if (matches(text, ["你是谁", "名字", "性格", "who are you", "name", "personality"])) {
    return {
      speech: zh
        ? `我是 ${petName}。${input.pet.persona?.personality || "我会陪你打字、专注和休息。"}`
        : `I am ${petName}. ${input.pet.persona?.personality || "I keep you company while you type, focus, and rest."}`,
      emotion: "proud",
      motion: "praised",
      bubbleDurationMs: 5200,
      memoryHints: ["chat:identity", `pet:${input.pet.id}`],
    };
  }

  if (matches(text, ["我是谁", "记得我", "你记得我吗", "who am i", "remember me"])) {
    return {
      speech: zh
        ? userName
          ? `我记得你是 ${userName}。这会进长期记忆，不只是今天的气泡。`
          : "我还不知道你的称呼。你可以说“我叫……”，我会记下来。"
        : userName
          ? `I remember you as ${userName}. That is a profile memory, not just today's bubble.`
          : "I do not know your name yet. Say \"my name is ...\" and I will remember it.",
      emotion: userName ? "proud" : "curious",
      motion: userName ? "praised" : "attention_call",
      bubbleDurationMs: 5600,
      memoryHints: ["chat:profile", `pet:${input.pet.id}`],
    };
  }

  if (matches(text, ["记住", "记得", "remember", "memory"])) {
    return {
      speech: zh
        ? "我会把这句拆成可验证的记忆线索。称呼和明确偏好会进入长期记忆，普通闲聊只留在今天。"
        : "I will split this into verified memory hints. Names and explicit preferences become profile memory; casual chat stays in today's context.",
      emotion: "calm",
      motion: "attention_call",
      bubbleDurationMs: 5600,
      memoryHints: ["chat:memory-request", `pet:${input.pet.id}`],
    };
  }

  return {
    speech: zh
      ? `${address}${recentCare.length ? "我记得刚才你照顾过我。 " : ""}我现在走的是可验证 Pet Brain 适配器：聊天、动作、记忆线索会先过 schema，再影响身体和状态。`
      : `${address}${recentCare.length ? "I remember you cared for me earlier. " : ""}I am running through the validated Pet Brain adapter now: chat, motion, and memory hints must pass schema before they touch body state.`,
    emotion: "curious",
    motion: "attention_call",
    bubbleDurationMs: 6200,
    memoryHints: ["chat:general", `pet:${input.pet.id}`],
  };
}

export function composePetBrainDiary(input: ComposeDiaryInput) {
  const zh = input.language === "zh-CN";
  const mood =
    input.care.happiness >= 78
      ? zh
        ? "开心"
        : "happy"
      : input.care.energy <= 35
        ? zh
          ? "困"
          : "sleepy"
        : zh
          ? "安静"
          : "calm";
  const summary = zh
    ? `${input.pet.name} 今天陪你专注 ${input.focusMinutes} 分钟，被照顾 ${input.careEvents} 次。心情偏${mood}，亲密度 ${input.care.bond}。`
    : `${input.pet.name} kept you company for ${input.focusMinutes}m of focus and received ${input.careEvents} care actions today. Mood is ${mood}; bond is ${input.care.bond}.`;

  return { mood, summary };
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

function matches(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function careSuggestion(care: PetCareState, language: AppLanguage) {
  if (care.fullness < 38) return language === "zh-CN" ? "可以喂我一口。" : "A snack would help.";
  if (care.cleanliness < 42) return language === "zh-CN" ? "毛毛该整理一下。" : "My fur could use grooming.";
  if (care.energy < 35) return language === "zh-CN" ? "我有点困，适合休息。" : "I am sleepy; a break fits.";
  return language === "zh-CN" ? "状态稳定，可以继续陪你。" : "Stable enough to keep going.";
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
