export const PROFILE_KEYS = ['tiantian', 'mengying', 'mengzhe'] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];

export const AGE_BANDS = ['kinder', 'g4', 'g5'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const TRACKS = ['math', 'english', 'team', 'workshop'] as const;
export type Track = (typeof TRACKS)[number];

export const PROFILE_META: Record<
  ProfileKey,
  {
    displayName: string;
    title: string;
    blurb: string;
    accent: string;
    ageBand: AgeBand;
  }
> = {
  tiantian: {
    displayName: '甜甜',
    title: '探险队长',
    blurb: '眼镜女孩 · 冷静带路',
    accent: '#2f6b4f',
    ageBand: 'g5',
  },
  mengying: {
    displayName: '孟赢',
    title: '活力冲锋',
    blurb: '红卫衣女孩 · 热情组队',
    accent: '#c62828',
    ageBand: 'g4',
  },
  mengzhe: {
    displayName: '孟辙',
    title: '数字小侦察兵',
    blurb: '数字衫男孩 · 好奇按按钮',
    accent: '#1565c0',
    ageBand: 'kinder',
  },
};

export const MAP_HOTSPOTS = [
  { id: 'math', label: '数学馆', emoji: '🧮', hint: '口算与应用题', route: '/math' },
  { id: 'english', label: '英语岛', emoji: '🔤', hint: '听音与词汇', route: '/english' },
  { id: 'team', label: '组队', emoji: '🤝', hint: '房间码一起闯关（M2）', route: null },
  { id: 'workshop', label: '工坊', emoji: '🧱', hint: '自己造关卡（M2）', route: null },
] as const;

export type QuestionType =
  | 'mcq'
  | 'listen_pick'
  | 'pair'
  | 'fill'
  | 'word_problem'
  | 'drag_count';

export type LevelId = 'M1' | 'M2' | 'M4' | 'E1' | 'E3';

export interface LevelDef {
  id: LevelId;
  track: 'math' | 'english';
  title: string;
  subtitle: string;
  emoji: string;
  /** Age bands that see this as recommended */
  recommendedFor: AgeBand[];
  questionTypes: QuestionType[];
  questionCount: number;
  timed?: boolean;
  timeLimitSec?: number;
}

export const LEVEL_CATALOG: LevelDef[] = [
  {
    id: 'M1',
    track: 'math',
    title: '果冻数骨头',
    subtitle: '数一数 1～10，点对数字',
    emoji: '🦴',
    recommendedFor: ['kinder', 'g5'],
    questionTypes: ['drag_count', 'mcq'],
    questionCount: 10,
  },
  {
    id: 'M2',
    track: 'math',
    title: '开门要几块',
    subtitle: '10 以内加减法',
    emoji: '🚪',
    recommendedFor: ['kinder', 'g4', 'g5'],
    questionTypes: ['mcq'],
    questionCount: 10,
  },
  {
    id: 'M4',
    track: 'math',
    title: '口算冲刺塔',
    subtitle: '限时口算，爬上塔顶',
    emoji: '🗼',
    recommendedFor: ['g4', 'g5'],
    questionTypes: ['mcq'],
    questionCount: 12,
    timed: true,
    timeLimitSec: 90,
  },
  {
    id: 'E1',
    track: 'english',
    title: '听音找卡片',
    subtitle: '听单词，点出对应卡片',
    emoji: '🎧',
    recommendedFor: ['kinder', 'g5'],
    questionTypes: ['listen_pick'],
    questionCount: 8,
  },
  {
    id: 'E3',
    track: 'english',
    title: '单词配对翻翻乐',
    subtitle: '单词 ↔ 表情/释义配对',
    emoji: '🃏',
    recommendedFor: ['g4', 'g5'],
    questionTypes: ['pair'],
    questionCount: 8,
  },
];

export function getLevel(id: string): LevelDef | undefined {
  return LEVEL_CATALOG.find((l) => l.id === id);
}

export function levelsForTrack(track: 'math' | 'english'): LevelDef[] {
  return LEVEL_CATALOG.filter((l) => l.track === track);
}

export function isRecommended(level: LevelDef, ageBand: AgeBand): boolean {
  return level.recommendedFor.includes(ageBand);
}

/** Soft filter: g5 sees all; others see recommended first (all still playable). */
export function sortLevelsForAge(levels: LevelDef[], ageBand: AgeBand): LevelDef[] {
  return [...levels].sort((a, b) => {
    const ar = isRecommended(a, ageBand) ? 0 : 1;
    const br = isRecommended(b, ageBand) ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.id.localeCompare(b.id);
  });
}

/** Stars 1–3 from accuracy + hearts left + combo. */
export function computeStars(input: {
  correct: number;
  total: number;
  heartsLeft: number;
  maxHearts: number;
  bestCombo: number;
}): number {
  if (input.total <= 0 || input.correct <= 0) return 0;
  const accuracy = input.correct / input.total;
  if (accuracy < 0.5) return 0;
  let stars = 1;
  if (accuracy >= 0.8) stars += 1;
  if (input.heartsLeft === input.maxHearts || input.bestCombo >= 5) stars += 1;
  return Math.min(3, stars) as 1 | 2 | 3;
}

import { z } from 'zod';

export const ProfileKeySchema = z.enum(PROFILE_KEYS);
export const AgeBandSchema = z.enum(AGE_BANDS);
export const LevelIdSchema = z.enum(['M1', 'M2', 'M4', 'E1', 'E3']);

export const SelectProfileSchema = z.object({
  key: ProfileKeySchema,
  selectedAt: z.string().datetime().optional(),
});

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string(),
  time: z.string(),
});

export const ProgressUpsertSchema = z.object({
  profileKey: ProfileKeySchema,
  levelId: LevelIdSchema,
  stars: z.number().int().min(0).max(3),
  bestCombo: z.number().int().min(0).default(0),
  cleared: z.boolean().default(true),
});

export const ProgressRecordSchema = z.object({
  profileKey: ProfileKeySchema,
  levelId: LevelIdSchema,
  stars: z.number().int().min(0).max(3),
  bestCombo: z.number().int().min(0),
  clearedAt: z.string().nullable().optional(),
});

export type SelectProfile = z.infer<typeof SelectProfileSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ProgressUpsert = z.infer<typeof ProgressUpsertSchema>;
export type ProgressRecord = z.infer<typeof ProgressRecordSchema>;
