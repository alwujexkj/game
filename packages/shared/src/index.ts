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
  { id: 'team', label: '组队', emoji: '🤝', hint: '房间码一起闯关', route: '/room' },
  { id: 'workshop', label: '工坊', emoji: '🧱', hint: '自己造关卡', route: '/workshop' },
  { id: 'bag', label: '背包', emoji: '🎁', hint: '贴纸互赠与喂果冻', route: '/bag' },
  { id: 'rank', label: '排行', emoji: '🏆', hint: '轻松家庭小排行', route: '/rank' },
] as const;

export type QuestionType =
  | 'mcq'
  | 'listen_pick'
  | 'pair'
  | 'fill'
  | 'word_problem'
  | 'drag_count';

export type LevelId = 'M1' | 'M2' | 'M4' | 'E1' | 'E3' | 'T1';

export interface LevelDef {
  id: LevelId;
  track: 'math' | 'english' | 'team';
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
  {
    id: 'T1',
    track: 'team',
    title: '双人开门',
    subtitle: '组队全员答对才能开门',
    emoji: '🚪',
    recommendedFor: ['kinder', 'g4', 'g5'],
    questionTypes: ['mcq'],
    questionCount: 5,
  },
];

export function getLevel(id: string): LevelDef | undefined {
  return LEVEL_CATALOG.find((l) => l.id === id);
}

export function levelsForTrack(track: 'math' | 'english' | 'team'): LevelDef[] {
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
export const LevelIdSchema = z.enum(['M1', 'M2', 'M4', 'E1', 'E3', 'T1']);

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

// ─── M2 Room co-op ───────────────────────────────────────────

export const DEMO_FAMILY_ID = 'sujia-demo';

export const TEAM_LEVEL_ID = 'T1' as const;
export type TeamLevelId = typeof TEAM_LEVEL_ID;

export const ROOM_MODES = ['all_must_correct', 'shared_hp', 'relay'] as const;
export type RoomMode = (typeof ROOM_MODES)[number];

export const ROOM_STATUSES = ['lobby', 'playing', 'settling', 'closed'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const MAX_ROOM_MEMBERS = 3;
export const TEAM_QUESTION_TOTAL = 5;

export interface TeamQuestionPayload {
  id: string;
  type: 'mcq';
  prompt: string;
  choices: Array<string | number>;
  /** Present only on server; stripped before sending to clients */
  answer?: string | number;
  jelly?: string;
}

/** Deterministic T1 bank — server shuffles by seed so all clients match. */
export const TEAM_T1_BANK: TeamQuestionPayload[] = [
  { id: 'T1-01', type: 'mcq', prompt: '3 + 2 = ?', choices: ['4', '5', '6', '3'], answer: '5', jelly: '要 5 块积木才能开门！' },
  { id: 'T1-02', type: 'mcq', prompt: '7 − 3 = ?', choices: ['3', '4', '5', '2'], answer: '4', jelly: '门缝开一点啦～' },
  { id: 'T1-03', type: 'mcq', prompt: '5 + 4 = ?', choices: ['8', '9', '10', '7'], answer: '9', jelly: '一起推门！' },
  { id: 'T1-04', type: 'mcq', prompt: '10 − 6 = ?', choices: ['3', '4', '5', '6'], answer: '4', jelly: '还差几步！' },
  { id: 'T1-05', type: 'mcq', prompt: '1 + 8 = ?', choices: ['7', '8', '9', '10'], answer: '9', jelly: '果冻加油！汪！' },
  { id: 'T1-06', type: 'mcq', prompt: '9 − 5 = ?', choices: ['3', '4', '5', '2'], answer: '4' },
  { id: 'T1-07', type: 'mcq', prompt: '6 + 3 = ?', choices: ['8', '9', '10', '7'], answer: '9' },
  { id: 'T1-08', type: 'mcq', prompt: '4 + 4 = ?', choices: ['6', '7', '8', '9'], answer: '8' },
];

export function publicQuestion(q: TeamQuestionPayload): Omit<TeamQuestionPayload, 'answer'> {
  const { answer: _a, ...rest } = q;
  return rest;
}

/** Simple seeded shuffle (mulberry32). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rand = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickTeamQuestions(seed: string, count = TEAM_QUESTION_TOTAL): TeamQuestionPayload[] {
  return seededShuffle(TEAM_T1_BANK, seed).slice(0, count);
}

export interface RoomMemberState {
  profileId: string; // profileKey for M2 demo
  displayName: string;
  ready: boolean;
  online: boolean;
  socketId?: string | null;
  joinedAt: string;
  lastSeenAt: string;
}

export interface RoomTurnAnswer {
  ok: boolean;
  answer?: string | number;
  clientTs?: number;
}

export interface RoomTurnState {
  index: number;
  total: number;
  questionId: string;
  question?: Omit<TeamQuestionPayload, 'answer'>;
  deadlineAt: string | null;
  answers: Record<string, RoomTurnAnswer>;
  sharedHp?: number;
  relayCursor?: number;
}

export interface RoomScoreState {
  starsPending: number;
  combo: number;
  perProfile: Record<string, { correct: number; wrong: number }>;
}

export interface RoomHotState {
  version: number;
  code: string;
  familyId: string;
  hostProfileId: string;
  levelId: string;
  status: RoomStatus;
  seed: string;
  mode: RoomMode;
  expiresAt: string;
  createdAt: string;
  members: RoomMemberState[];
  turnState: RoomTurnState | null;
  score: RoomScoreState;
  /** Server-only question list (answers included); never broadcast raw */
  _questions?: TeamQuestionPayload[];
}

/** Client-safe snapshot (no answer keys). */
export type RoomPublicState = Omit<RoomHotState, '_questions'>;

export function toPublicRoomState(state: RoomHotState): RoomPublicState {
  const { _questions: _q, ...rest } = state;
  return rest;
}

export const RoomCreateSchema = z.object({
  familyId: z.string().min(1).optional().default(DEMO_FAMILY_ID),
  profileKey: ProfileKeySchema,
  displayName: z.string().min(1).max(32).optional(),
  levelId: z.string().optional().default(TEAM_LEVEL_ID),
});

export const RoomJoinSchema = z.object({
  code: z.string().min(4).max(8),
  familyId: z.string().min(1).optional().default(DEMO_FAMILY_ID),
  profileKey: ProfileKeySchema,
  displayName: z.string().min(1).max(32).optional(),
});

export type RoomCreateInput = z.infer<typeof RoomCreateSchema>;
export type RoomJoinInput = z.infer<typeof RoomJoinSchema>;


// ─── M3 Workshop ─────────────────────────────────────────────
export {
  WORKSHOP_QUESTION_KINDS,
  WORKSHOP_QUESTION_KIND_LABEL,
  WORKSHOP_TEMPLATE_IDS,
  WORKSHOP_TEMPLATES,
  WORKSHOP_WORD_BANK,
  WorkshopBlocksSchema,
  WorkshopCompiledConfigSchema,
  WorkshopLevelUpsertSchema,
  WorkshopLevelRecordSchema,
  WorkshopPublishSchema,
  getWorkshopTemplate,
  compileWorkshopBlocks,
  generateWorkshopQuestions,
  type WorkshopQuestionKind,
  type WorkshopTemplateId,
  type WorkshopBlocks,
  type WorkshopCompiledConfig,
  type WorkshopTemplateMeta,
  type WorkshopGeneratedQuestion,
  type WorkshopLevelUpsert,
  type WorkshopLevelRecord,
  type WorkshopPublish,
} from './workshop';

// ─── M4 Stickers / Gifts / Rank helpers ──────────────────────
export {
  STICKER_IDS,
  STICKER_CATALOG,
  STICKER_BY_ID,
  STICKER_DROP_CHANCE,
  FEED_JELLY_TARGET,
  JELLY_FEED_REACTIONS,
  LEVEL_WEAK_TAG_HINTS,
  getSticker,
  pickRandomStickerDrop,
  pickJellyReaction,
  weekKeyOf,
  startOfIsoWeek,
  StickerIdSchema,
  InventoryItemSchema,
  GiftSendSchema,
  GiftLogSchema,
  ParentPinSetSchema,
  ParentPinVerifySchema,
  ParentDashboardQuerySchema,
  InventoryUpsertSchema,
  ParentPinHashSchema,
  type StickerId,
  type StickerDef,
  type InventoryItem,
  type InventoryUpsert,
  type GiftTarget,
  type GiftSend,
  type GiftLogEntry,
} from './stickers';
