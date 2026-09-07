import { z } from 'zod';

const PROFILE_KEYS = ['tiantian', 'mengying', 'mengzhe'] as const;
type ProfileKey = (typeof PROFILE_KEYS)[number];

/** Sticker codes aligned with /art/gift-stickers-v1.png (3×3 sheet). */
export const STICKER_IDS = [
  'star',
  'stars',
  'bone',
  'bamboo',
  'heart',
  'boot',
  'plus',
  'letter_a',
  'dog',
] as const;

export type StickerId = (typeof STICKER_IDS)[number];

export interface StickerDef {
  id: StickerId;
  name: string;
  emoji: string;
  rarity: 1 | 2 | 3;
  /** CSS object-position for sprite sheet (3×3) */
  sheetPos: string;
  blurb: string;
}

export const STICKER_CATALOG: StickerDef[] = [
  { id: 'star', name: '闪亮星', emoji: '⭐', rarity: 1, sheetPos: '0% 0%', blurb: '闯关小星星' },
  { id: 'stars', name: '三星闪耀', emoji: '✨', rarity: 2, sheetPos: '50% 0%', blurb: '连击高光时刻' },
  { id: 'bone', name: '果冻骨头', emoji: '🦴', rarity: 1, sheetPos: '100% 0%', blurb: '汪汪最爱零食' },
  { id: 'bamboo', name: '竹叶贴', emoji: '🎋', rarity: 1, sheetPos: '0% 50%', blurb: '苏家竹林纪念' },
  { id: 'heart', name: '暖心贴', emoji: '❤️', rarity: 2, sheetPos: '50% 50%', blurb: '送给家人的心意' },
  { id: 'boot', name: '探险靴', emoji: '🥾', rarity: 2, sheetPos: '100% 50%', blurb: '一起去冒险' },
  { id: 'plus', name: '加分贴', emoji: '➕', rarity: 1, sheetPos: '0% 100%', blurb: '多一点点鼓励' },
  { id: 'letter_a', name: 'A 字母贴', emoji: '🅰️', rarity: 2, sheetPos: '50% 100%', blurb: '英语岛小奖章' },
  { id: 'dog', name: '果冻自拍', emoji: '🐶', rarity: 3, sheetPos: '100% 100%', blurb: '超稀有果冻表情' },
];

export const STICKER_BY_ID: Record<StickerId, StickerDef> = Object.fromEntries(
  STICKER_CATALOG.map((s) => [s.id, s]),
) as Record<StickerId, StickerDef>;

export function getSticker(id: string): StickerDef | undefined {
  return STICKER_BY_ID[id as StickerId];
}

/** Chance to drop a sticker after a successful settle (stars > 0). */
export const STICKER_DROP_CHANCE = 0.28;

/** Weighted pool for random drops (rarity 1 more common). */
export function pickRandomStickerDrop(rng = Math.random): StickerId {
  const weights = STICKER_CATALOG.map((s) => (s.rarity === 1 ? 5 : s.rarity === 2 ? 3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < STICKER_CATALOG.length; i++) {
    r -= weights[i];
    if (r <= 0) return STICKER_CATALOG[i].id;
  }
  return STICKER_CATALOG[0].id;
}

export const FEED_JELLY_TARGET = 'jelly' as const;
export type GiftTarget = ProfileKey | typeof FEED_JELLY_TARGET;

export const JELLY_FEED_REACTIONS = [
  '汪！好吃！尾巴转圈～',
  '再来一根骨头！',
  '嗝～谢谢你！',
  '果冻围你转圈圈！',
  '真香～果冻眯眼笑！',
] as const;

export function pickJellyReaction(rng = Math.random): string {
  const i = Math.floor(rng() * JELLY_FEED_REACTIONS.length);
  return JELLY_FEED_REACTIONS[i] ?? JELLY_FEED_REACTIONS[0];
}

export const StickerIdSchema = z.enum(STICKER_IDS);

export const InventoryItemSchema = z.object({
  stickerId: StickerIdSchema,
  count: z.number().int().min(0),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const GiftSendSchema = z.object({
  fromProfileKey: z.enum(PROFILE_KEYS),
  toProfileKey: z.enum(PROFILE_KEYS).or(z.literal(FEED_JELLY_TARGET)),
  stickerId: StickerIdSchema,
  familyId: z.string().optional(),
});

export type GiftSend = z.infer<typeof GiftSendSchema>;

export const GiftLogSchema = z.object({
  id: z.string(),
  fromProfileKey: z.enum(PROFILE_KEYS),
  toProfileKey: z.enum(PROFILE_KEYS).or(z.literal(FEED_JELLY_TARGET)),
  stickerId: StickerIdSchema,
  createdAt: z.string(),
  reaction: z.string().optional(),
});

export type GiftLogEntry = z.infer<typeof GiftLogSchema>;

/** ISO week key e.g. 2026-W37 (UTC+8 friendly: pass local Date). */
export function weekKeyOf(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function startOfIsoWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
}

/** Soft knowledge placeholders by level when wrong-tag store is empty. */
export const LEVEL_WEAK_TAG_HINTS: Record<string, string[]> = {
  M1: ['数数 1～10', '认数字'],
  M2: ['10 以内加减', '开门应用'],
  M4: ['口算速度', '限时专注'],
  E1: ['听音辨词', '单词听力'],
  E3: ['单词配对', '词义记忆'],
  T1: ['组队协作', '双人加减'],
};

export const ParentPinSetSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
  familyId: z.string().optional(),
});

export const ParentPinVerifySchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
  familyId: z.string().optional(),
});

export const ParentDashboardQuerySchema = z.object({
  familyId: z.string().optional(),
});


export const InventoryUpsertSchema = z.object({
  profileKey: z.enum(PROFILE_KEYS),
  familyId: z.string().optional(),
  items: z.array(InventoryItemSchema),
});
export type InventoryUpsert = z.infer<typeof InventoryUpsertSchema>;

export const ParentPinHashSchema = z.object({
  pinHash: z.string().min(8),
  familyId: z.string().optional(),
});
