import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  PROFILE_META,
  WEEKLY_TRACK_WEIGHTS,
  DAILY_STAR_CAPS,
  type ProfileKey,
} from '@sujia/shared';

const STORAGE_KEY = 'sujia.daily.v1';

export type DailySlotKind = 'main' | 'alt' | 'social';

export interface DailySlot {
  id: string;
  kind: DailySlotKind;
  levelId?: string;
  action?: 'team' | 'workshop' | 'gift';
  done: boolean;
  stars: number;
}

export interface DailyRecord {
  /** YYYY-MM-DD in Asia/Shanghai calendar date after 04:00 rollover */
  date: string;
  profileKey: ProfileKey;
  slots: DailySlot[];
  totalDailyStars: number;
}

type DailyMap = Record<string, DailyRecord>; // key profileKey

/** Shanghai calendar date with 04:00 rollover. */
export function shanghaiDailyDate(now = new Date()): string {
  const shifted = new Date(now.getTime() + (8 * 60 - 4 * 60) * 60 * 1000);
  // approx: use UTC+8 then subtract 4h → treat as date string
  const utc = now.getTime() + 8 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000;
  const d = new Date(utc);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readAll(): DailyMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DailyMap;
  } catch {
    return {};
  }
}

function writeAll(map: DailyMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Skeleton generator — full rotation rules filled when 策划表入库. */
function buildSkeletonSlots(profileKey: ProfileKey): DailySlot[] {
  const weights = WEEKLY_TRACK_WEIGHTS[profileKey] ?? WEEKLY_TRACK_WEIGHTS.default;
  const age = PROFILE_META[profileKey].ageBand;
  // Prefer math main for kinder-heavy weights, else alternate by weight
  const mainMath = weights.math >= weights.english;
  return [
    {
      id: '1',
      kind: 'main',
      levelId: mainMath ? (age === 'g5' ? 'M4' : 'M2') : 'E1',
      done: false,
      stars: 0,
    },
    {
      id: '2',
      kind: 'alt',
      levelId: mainMath ? 'E1' : 'M2',
      done: false,
      stars: 0,
    },
    {
      id: '3',
      kind: 'social',
      action: 'team',
      done: false,
      stars: 0,
    },
  ];
}

export const useDailyStore = defineStore('daily', () => {
  const records = ref<DailyMap>(readAll());

  const forProfile = computed(() => (profileKey: ProfileKey | null) => {
    if (!profileKey) return null;
    const date = shanghaiDailyDate();
    const cur = records.value[profileKey];
    if (cur && cur.date === date) return cur;
    return null;
  });

  function ensureToday(profileKey: ProfileKey): DailyRecord {
    const date = shanghaiDailyDate();
    const cur = records.value[profileKey];
    if (cur && cur.date === date) return cur;
    const next: DailyRecord = {
      date,
      profileKey,
      slots: buildSkeletonSlots(profileKey),
      totalDailyStars: 0,
    };
    records.value = { ...records.value, [profileKey]: next };
    writeAll(records.value);
    return next;
  }

  function completeSlot(
    profileKey: ProfileKey,
    slotId: string,
    stars: number,
  ): DailyRecord {
    const rec = ensureToday(profileKey);
    const slots = rec.slots.map((s) =>
      s.id === slotId ? { ...s, done: true, stars: Math.max(0, stars) } : s,
    );
    const totalDailyStars = Math.min(
      4,
      slots.reduce((n, s) => n + (s.done ? Math.max(s.stars, s.kind === 'main' ? 2 : 1) : 0), 0),
    );
    // P0: main +2, alt +1, social +1 capped 4 — skeleton uses slot stars loosely
    const next: DailyRecord = { ...rec, slots, totalDailyStars };
    records.value = { ...records.value, [profileKey]: next };
    writeAll(records.value);
    return next;
  }

  return {
    records,
    forProfile,
    ensureToday,
    completeSlot,
    shanghaiDailyDate,
    DAILY_STAR_CAPS,
    WEEKLY_TRACK_WEIGHTS,
  };
});
