/** Wave0 question packs + daily weights (no imports from index — avoid cycles). */

export type AgeBand = 'kinder' | 'g4' | 'g5';
export type ProfileKey = 'tiantian' | 'mengying' | 'mengzhe';

/** Wave0 packId short suffix (not full ageBand spelling). */
export const AGE_BAND_PACK_SUFFIX: Record<AgeBand, string> = {
  kinder: 'k',
  g4: 'g4',
  g5: 'g5',
};

export type PackId = string; // e.g. "M2.k"

/** Disabled in Wave0 — do not serve; callers fall back to legacy bank + warn. */
export const WAVE0_DISABLED_PACKS = ['M4.k', 'E3.k'] as const;

/**
 * Wave0 locked 15 packs (策划最小表).
 * Includes T1.g5 (full age coverage for team).
 */
export const WAVE0_PACK_IDS = [
  'M1.k',
  'M1.g4',
  'M1.g5',
  'M2.k',
  'M2.g4',
  'M2.g5',
  'M4.g4',
  'M4.g5',
  'E1.k',
  'E1.g4',
  'E1.g5',
  'E3.g4',
  'E3.g5',
  'T1.k',
  'T1.g4',
  'T1.g5',
] as const;

export type Wave0PackId = (typeof WAVE0_PACK_IDS)[number];

export const PACK_MANIFEST_VERSION = 1;

/** Wave0 daily star caps (数值). 辅线分轨等 Wave3. */
export const DAILY_STAR_CAPS = {
  math: 5,
  english: 5,
  other: 2,
  dailyCap: 12,
} as const;

export const WEEKLY_TRACK_WEIGHTS: Record<
  ProfileKey | 'default',
  { math: number; english: number; other: number }
> = {
  default: { math: 45, english: 45, other: 10 },
  mengzhe: { math: 50, english: 40, other: 10 },
  mengying: { math: 45, english: 45, other: 10 },
  tiantian: { math: 40, english: 50, other: 10 },
};

const AGE_RANK: Record<AgeBand, number> = { kinder: 0, g4: 1, g5: 2 };

export function minAgeBand(bands: AgeBand[]): AgeBand {
  if (!bands.length) return 'kinder';
  return bands.reduce((a, b) => (AGE_RANK[b] < AGE_RANK[a] ? b : a));
}

/** Build packId like M2.k from level + ageBand. */
export function toPackId(levelId: string, ageBand: AgeBand): PackId {
  return `${levelId}.${AGE_BAND_PACK_SUFFIX[ageBand]}`;
}

export type ResolvePackResult = {
  packId: PackId;
  fallback: boolean;
  reason?: string;
};

/**
 * resolvePack(levelId, ageBand) — Wave0 packId resolution exported from @sujia/shared.
 * Missing/disabled → fallback:true (callers load legacy bank + console.warn).
 * Question JSON loading stays in apps/web; T1 server uses pickTeamQuestions + embedded banks.
 */
export function resolvePack(levelId: string, ageBand: AgeBand): ResolvePackResult {
  return resolvePackId(levelId, ageBand);
}

/**
 * Resolve which packId to load. Applies Wave0 disables + T1.g5→T1.g4.
 * Does not load questions — callers fetch JSON / banks.
 */
export function resolvePackId(
  levelId: string,
  ageBand: AgeBand,
): ResolvePackResult {
  const packId = toPackId(levelId, ageBand);

  if ((WAVE0_DISABLED_PACKS as readonly string[]).includes(packId)) {
    return {
      packId,
      fallback: true,
      reason: `Wave0 disabled pack ${packId}`,
    };
  }

  if (!(WAVE0_PACK_IDS as readonly string[]).includes(packId)) {
    return {
      packId,
      fallback: true,
      reason: `pack ${packId} not in Wave0 list`,
    };
  }

  return { packId, fallback: false };
}

/** Default knowledgeTags[0] when question lacks tags (Wave0 acceptable). */
export const LEVEL_DEFAULT_KNOWLEDGE_TAG: Record<string, string> = {
  M1: '数感1-10',
  M2: '10内加减',
  M4: '乘除口算',
  E1: '听音词汇',
  E3: '词义配对',
  T1: '综合练习',
};

/** Embedded T1 pack banks for server-side pickTeamQuestions (mirrors web JSON). */
export type SharedPackQuestion = {
  id: string;
  type: 'mcq';
  prompt: string;
  choices: Array<string | number>;
  answer: string | number;
  jelly?: string;
  knowledgeTags: string[];
};

export const T1_PACK_BANKS: Record<string, SharedPackQuestion[]> = {
  'T1.k': [
    {
      id: "T1.k-01",
      type: 'mcq',
      prompt: "数一数：🍎🍎🍎 有几个？",
      choices: ["2", "3", "4", "5"],
      answer: "3",
      knowledgeTags: ["math.number.count_1_5"],
      jelly: "开门需要 3 块积木！",
    },
    {
      id: "T1.k-02",
      type: 'mcq',
      prompt: "1 + 2 = ?",
      choices: ["2", "3", "4", "1"],
      answer: "3",
      knowledgeTags: ["math.addsub.within_5"],
      jelly: "门缝打开一点了～",
    },
    {
      id: "T1.k-03",
      type: 'mcq',
      prompt: "4 − 1 = ?",
      choices: ["2", "3", "4", "5"],
      answer: "3",
      knowledgeTags: ["math.addsub.within_5"],
      jelly: "一起推门！",
    },
    {
      id: "T1.k-04",
      type: 'mcq',
      prompt: "2 + 2 = ?",
      choices: ["3", "4", "5", "2"],
      answer: "4",
      knowledgeTags: ["math.addsub.within_5"],
      jelly: "还差几步！",
    },
    {
      id: "T1.k-05",
      type: 'mcq',
      prompt: "5 − 3 = ?",
      choices: ["1", "2", "3", "4"],
      answer: "2",
      knowledgeTags: ["math.addsub.within_5"],
      jelly: "果冻给你加油！",
    },
  ],
  'T1.g4': [
    {
      id: "T1.g4-01",
      type: 'mcq',
      prompt: "8 + 5 = ?",
      choices: ["12", "13", "14", "11"],
      answer: "13",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "开门需要 13 分！",
    },
    {
      id: "T1.g4-02",
      type: 'mcq',
      prompt: "12 − 4 = ?",
      choices: ["7", "8", "9", "6"],
      answer: "8",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "门缝打开一点了～",
    },
    {
      id: "T1.g4-03",
      type: 'mcq',
      prompt: "9 + 6 = ?",
      choices: ["14", "15", "16", "13"],
      answer: "15",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "一起推门！",
    },
    {
      id: "T1.g4-04",
      type: 'mcq',
      prompt: "16 − 9 = ?",
      choices: ["6", "7", "8", "5"],
      answer: "7",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "还差几步！",
    },
    {
      id: "T1.g4-05",
      type: 'mcq',
      prompt: "7 + 7 = ?",
      choices: ["13", "14", "15", "12"],
      answer: "14",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "果冻给你加油！",
    },
  ],
  'T1.g5': [
    {
      id: "T1.g5-01",
      type: 'mcq',
      prompt: "13 + 8 = ?",
      choices: ["20", "21", "22", "19"],
      answer: "21",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "队长带队开门！",
    },
    {
      id: "T1.g5-02",
      type: 'mcq',
      prompt: "19 − 6 = ?",
      choices: ["12", "13", "14", "11"],
      answer: "13",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "门缝打开一点了～",
    },
    {
      id: "T1.g5-03",
      type: 'mcq',
      prompt: "9 + 9 = ?",
      choices: ["17", "18", "19", "16"],
      answer: "18",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "一起推门！",
    },
    {
      id: "T1.g5-04",
      type: 'mcq',
      prompt: "17 − 8 = ?",
      choices: ["8", "9", "10", "7"],
      answer: "9",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "还差几步！",
    },
    {
      id: "T1.g5-05",
      type: 'mcq',
      prompt: "11 + 7 = ?",
      choices: ["17", "18", "19", "16"],
      answer: "18",
      knowledgeTags: ["math.addsub.within_20"],
      jelly: "满星一起冲！",
    },
  ],
};
