import { z } from 'zod';

const PROFILE_KEYS = ['tiantian', 'mengying', 'mengzhe'] as const;
const ProfileKeySchema = z.enum(PROFILE_KEYS);
export const WORKSHOP_DEMO_FAMILY_ID = 'sujia-demo';

/** Editable workshop question kinds (题型). */
export const WORKSHOP_QUESTION_KINDS = ['add', 'sub', 'listen_pick'] as const;
export type WorkshopQuestionKind = (typeof WORKSHOP_QUESTION_KINDS)[number];

export const WORKSHOP_QUESTION_KIND_LABEL: Record<WorkshopQuestionKind, string> = {
  add: '加法',
  sub: '减法',
  listen_pick: '听音选词',
};

export const WORKSHOP_TEMPLATE_IDS = [
  'treasure_door',
  'math_tower_short',
  'listen_pick3',
] as const;
export type WorkshopTemplateId = (typeof WORKSHOP_TEMPLATE_IDS)[number];

/** Kid-facing block params (limited; not freeform coding). */
export const WorkshopBlocksSchema = z.object({
  templateId: z.enum(WORKSHOP_TEMPLATE_IDS),
  title: z.string().min(1).max(24),
  /** 开门要几分 */
  doorScore: z.number().int().min(1).max(10),
  /** 果冻走几步 */
  jellySteps: z.number().int().min(1).max(8),
  /** 题量 */
  questionCount: z.number().int().min(3).max(12),
  /** 题型：加法 | 减法 | 听音选词 */
  questionKind: z.enum(WORKSHOP_QUESTION_KINDS),
  /** 答对奖励星 1–3 */
  rewardStars: z.number().int().min(1).max(3),
});

export type WorkshopBlocks = z.infer<typeof WorkshopBlocksSchema>;

/** Compiled Level.configJson shape for workshop levels. */
export const WorkshopCompiledConfigSchema = z.object({
  source: z.literal('workshop'),
  templateId: z.enum(WORKSHOP_TEMPLATE_IDS),
  title: z.string(),
  subtitle: z.string(),
  emoji: z.string(),
  track: z.literal('workshop'),
  questionCount: z.number().int().min(1),
  questionKind: z.enum(WORKSHOP_QUESTION_KINDS),
  doorScore: z.number().int(),
  jellySteps: z.number().int(),
  rewardStars: z.number().int().min(1).max(3),
  timed: z.boolean().optional(),
  timeLimitSec: z.number().int().positive().optional(),
  /** listen_pick choice count (default 3 for 听音三选一) */
  choiceCount: z.number().int().min(2).max(4).optional(),
});

export type WorkshopCompiledConfig = z.infer<typeof WorkshopCompiledConfigSchema>;

export interface WorkshopTemplateMeta {
  id: WorkshopTemplateId;
  title: string;
  subtitle: string;
  emoji: string;
  jellyTip: string;
  defaultBlocks: WorkshopBlocks;
}

export const WORKSHOP_TEMPLATES: WorkshopTemplateMeta[] = [
  {
    id: 'treasure_door',
    title: '寻宝门',
    subtitle: '答对开门，帮果冻找宝藏',
    emoji: '🚪',
    jellyTip: '改积木：开门分、走几步！',
    defaultBlocks: {
      templateId: 'treasure_door',
      title: '寻宝门',
      doorScore: 3,
      jellySteps: 2,
      questionCount: 5,
      questionKind: 'add',
      rewardStars: 2,
    },
  },
  {
    id: 'math_tower_short',
    title: '口算塔矮版',
    subtitle: '短时口算，爬上矮塔',
    emoji: '🗼',
    jellyTip: '改题量题型，冲矮塔！',
    defaultBlocks: {
      templateId: 'math_tower_short',
      title: '口算塔矮版',
      doorScore: 5,
      jellySteps: 3,
      questionCount: 6,
      questionKind: 'sub',
      rewardStars: 3,
    },
  },
  {
    id: 'listen_pick3',
    title: '听音三选一',
    subtitle: '听单词，三张卡选一对',
    emoji: '🎧',
    jellyTip: '听一听，选对卡片！',
    defaultBlocks: {
      templateId: 'listen_pick3',
      title: '听音三选一',
      doorScore: 2,
      jellySteps: 1,
      questionCount: 5,
      questionKind: 'listen_pick',
      rewardStars: 2,
    },
  },
];

export function getWorkshopTemplate(id: string): WorkshopTemplateMeta | undefined {
  return WORKSHOP_TEMPLATES.find((t) => t.id === id);
}

export function compileWorkshopBlocks(blocks: WorkshopBlocks): WorkshopCompiledConfig {
  const parsed = WorkshopBlocksSchema.parse(blocks);
  const tpl = getWorkshopTemplate(parsed.templateId);
  const emoji = tpl?.emoji ?? '🧱';
  const timed = parsed.templateId === 'math_tower_short';
  const choiceCount = parsed.questionKind === 'listen_pick' ? 3 : undefined;

  const kindLabel = WORKSHOP_QUESTION_KIND_LABEL[parsed.questionKind];
  const subtitle =
    tpl?.subtitle ??
    `开门要 ${parsed.doorScore} 分 · 果冻走 ${parsed.jellySteps} 步 · ${kindLabel}`;

  return WorkshopCompiledConfigSchema.parse({
    source: 'workshop',
    templateId: parsed.templateId,
    title: parsed.title || tpl?.title || '我的关卡',
    subtitle,
    emoji,
    track: 'workshop',
    questionCount: parsed.questionCount,
    questionKind: parsed.questionKind,
    doorScore: parsed.doorScore,
    jellySteps: parsed.jellySteps,
    rewardStars: parsed.rewardStars,
    timed,
    timeLimitSec: timed ? Math.max(30, parsed.questionCount * 8) : undefined,
    choiceCount,
  });
}

/** Small English word bank for workshop listen_pick generators. */
export const WORKSHOP_WORD_BANK: Array<{
  word: string;
  phonetic: string;
  meaning: string;
  emoji: string;
}> = [
  { word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', emoji: '🍎' },
  { word: 'banana', phonetic: '/bəˈnɑːnə/', meaning: '香蕉', emoji: '🍌' },
  { word: 'cat', phonetic: '/kæt/', meaning: '猫', emoji: '🐱' },
  { word: 'dog', phonetic: '/dɔːɡ/', meaning: '狗', emoji: '🐶' },
  { word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼', emoji: '🐟' },
  { word: 'sun', phonetic: '/sʌn/', meaning: '太阳', emoji: '☀️' },
  { word: 'book', phonetic: '/bʊk/', meaning: '书', emoji: '📘' },
  { word: 'water', phonetic: '/ˈwɔːtə/', meaning: '水', emoji: '💧' },
  { word: 'bird', phonetic: '/bɜːd/', meaning: '鸟', emoji: '🐦' },
  { word: 'ball', phonetic: '/bɔːl/', meaning: '球', emoji: '⚽' },
  { word: 'cake', phonetic: '/keɪk/', meaning: '蛋糕', emoji: '🍰' },
  { word: 'star', phonetic: '/stɑː/', meaning: '星星', emoji: '⭐' },
];

export type WorkshopGeneratedQuestion =
  | {
      id: string;
      type: 'mcq';
      prompt: string;
      choices: string[];
      answer: string;
      jelly?: string;
      floor?: number;
    }
  | {
      id: string;
      type: 'listen_pick';
      word: string;
      phonetic?: string;
      meaning?: string;
      emoji?: string;
      choices: Array<{ word: string; emoji: string }>;
      answer: string;
      jelly?: string;
    };

function mulberry(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleLocal<T>(items: T[], seed: string): T[] {
  const rand = mulberry(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function uniqueChoices(correct: number, rand: () => number, span = 10): string[] {
  const set = new Set<string>([String(correct)]);
  const lo = Math.max(0, correct - span);
  const hi = Math.max(lo + 3, correct + span);
  let guard = 0;
  while (set.size < 4 && guard < 64) {
    guard += 1;
    const n = lo + Math.floor(rand() * (hi - lo + 1));
    set.add(String(n));
  }
  // Guaranteed fill if RNG collapses (e.g. answer near 0).
  let pad = 0;
  while (set.size < 4) {
    if (!set.has(String(pad))) set.add(String(pad));
    pad += 1;
  }
  return shuffleLocal([...set], String(rand())).slice(0, 4);
}

/** Generate playable questions from compiled workshop config. */
export function generateWorkshopQuestions(
  config: WorkshopCompiledConfig,
  seed = 'workshop',
): WorkshopGeneratedQuestion[] {
  const cfg = WorkshopCompiledConfigSchema.parse(config);
  const rand = mulberry(`${seed}:${cfg.templateId}:${cfg.questionKind}:${cfg.questionCount}`);
  const out: WorkshopGeneratedQuestion[] = [];
  const count = cfg.questionCount;

  if (cfg.questionKind === 'listen_pick') {
    const words = shuffleLocal(WORKSHOP_WORD_BANK, seed).slice(0, count);
    const choiceN = cfg.choiceCount ?? 3;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const distractors = shuffleLocal(
        WORKSHOP_WORD_BANK.filter((x) => x.word !== w.word),
        `${seed}-lp-${i}`,
      ).slice(0, choiceN - 1);
      const choices = shuffleLocal(
        [{ word: w.word, emoji: w.emoji }, ...distractors.map((d) => ({ word: d.word, emoji: d.emoji }))],
        `${seed}-ch-${i}`,
      );
      out.push({
        id: `W-LP-${i + 1}`,
        type: 'listen_pick',
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        emoji: w.emoji,
        choices,
        answer: w.word,
        jelly: i === 0 ? `开门要 ${cfg.doorScore} 分！走 ${cfg.jellySteps} 步！` : undefined,
      });
    }
    return out;
  }

  for (let i = 0; i < count; i++) {
    const a = 1 + Math.floor(rand() * 9);
    const b = 1 + Math.floor(rand() * Math.min(9, cfg.questionKind === 'sub' ? a : 9));
    const sum = a + b;
    const diff = a - b;
    const isAdd = cfg.questionKind === 'add';
    const answerNum = isAdd ? sum : diff;
    const prompt = isAdd ? `${a} + ${b} = ?` : `${a} − ${b} = ?`;
    const choices = uniqueChoices(answerNum, rand);
    out.push({
      id: `W-MCQ-${i + 1}`,
      type: 'mcq',
      prompt,
      choices,
      answer: String(answerNum),
      floor: cfg.timed ? i + 1 : undefined,
      jelly:
        i === 0
          ? `开门要 ${cfg.doorScore} 分！走 ${cfg.jellySteps} 步～`
          : i === count - 1
            ? `最后一题！奖 ${cfg.rewardStars} 星！`
            : undefined,
    });
  }
  return out;
}

export const WorkshopLevelUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  familyId: z.string().min(1).optional().default(WORKSHOP_DEMO_FAMILY_ID),
  authorProfileKey: ProfileKeySchema,
  title: z.string().min(1).max(24).optional(),
  blocksJson: WorkshopBlocksSchema,
  publishedToMap: z.boolean().optional(),
});

export type WorkshopLevelUpsert = z.infer<typeof WorkshopLevelUpsertSchema>;

export const WorkshopLevelRecordSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  authorProfileKey: ProfileKeySchema,
  title: z.string(),
  templateId: z.enum(WORKSHOP_TEMPLATE_IDS),
  blocksJson: WorkshopBlocksSchema,
  compiledConfig: WorkshopCompiledConfigSchema,
  publishedToMap: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkshopLevelRecord = z.infer<typeof WorkshopLevelRecordSchema>;

export const WorkshopPublishSchema = z.object({
  id: z.string().min(1),
  familyId: z.string().min(1).optional().default(WORKSHOP_DEMO_FAMILY_ID),
  authorProfileKey: ProfileKeySchema,
  publishedToMap: z.boolean().default(true),
});

export type WorkshopPublish = z.infer<typeof WorkshopPublishSchema>;
