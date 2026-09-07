import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  LevelIdSchema,
  PROFILE_META,
  ProfileKeySchema,
  type LevelId,
  type ProfileKey,
  type ProgressRecord,
} from '@sujia/shared';

const STORAGE_KEY = 'sujia.progress.v1';
const WEAK_TAG_KEY = 'sujia.weakTags.v1';
const API_BASE = import.meta.env.VITE_API_BASE || '';

/** profileKey -> tag -> wrongCount */
type WeakTagMap = Record<string, Record<string, number>>;

function readWeakTags(): WeakTagMap {
  try {
    const raw = localStorage.getItem(WEAK_TAG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WeakTagMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeWeakTags(map: WeakTagMap) {
  localStorage.setItem(WEAK_TAG_KEY, JSON.stringify(map));
}


type ProgressMap = Record<string, ProgressRecord>; // key = `${profileKey}:${levelId}`

function storageKey(profileKey: ProfileKey, levelId: LevelId) {
  return `${profileKey}:${levelId}`;
}

function readLocal(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    const out: ProgressMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      const pk = ProfileKeySchema.safeParse(v.profileKey);
      const lid = LevelIdSchema.safeParse(v.levelId);
      if (pk.success && lid.success) {
        out[k] = {
          profileKey: pk.data,
          levelId: lid.data,
          stars: Math.max(0, Math.min(3, Number(v.stars) || 0)),
          bestCombo: Math.max(0, Number(v.bestCombo) || 0),
          clearedAt: v.clearedAt ?? null,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocal(map: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export const useProgressStore = defineStore('progress', () => {
  const records = ref<ProgressMap>(readLocal());
  const weakTags = ref<WeakTagMap>(readWeakTags());
  const syncing = ref(false);
  const lastError = ref<string | null>(null);

  const forProfile = computed(() => (profileKey: ProfileKey | null) => {
    if (!profileKey) return [] as ProgressRecord[];
    return Object.values(records.value).filter((r) => r.profileKey === profileKey);
  });

  function getStars(profileKey: ProfileKey | null, levelId: LevelId): number {
    if (!profileKey) return 0;
    return records.value[storageKey(profileKey, levelId)]?.stars ?? 0;
  }

  function totalStars(profileKey: ProfileKey | null): number {
    if (!profileKey) return 0;
    return forProfile.value(profileKey).reduce((s, r) => s + r.stars, 0);
  }

  function trackStars(profileKey: ProfileKey | null, track: 'math' | 'english'): number {
    if (!profileKey) return 0;
    const prefix = track === 'math' ? 'M' : 'E';
    return forProfile
      .value(profileKey)
      .filter((r) => r.levelId.startsWith(prefix))
      .reduce((s, r) => s + r.stars, 0);
  }

  async function saveResult(input: {
    profileKey: ProfileKey;
    levelId: LevelId;
    stars: number;
    bestCombo: number;
  }) {
    const key = storageKey(input.profileKey, input.levelId);
    const prev = records.value[key];
    const stars = Math.max(prev?.stars ?? 0, input.stars);
    const bestCombo = Math.max(prev?.bestCombo ?? 0, input.bestCombo);
    const next: ProgressRecord = {
      profileKey: input.profileKey,
      levelId: input.levelId,
      stars,
      bestCombo,
      clearedAt: new Date().toISOString(),
    };
    records.value = { ...records.value, [key]: next };
    writeLocal(records.value);

    // Best-effort server sync
    syncing.value = true;
    lastError.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileKey: input.profileKey,
          levelId: input.levelId,
          stars,
          bestCombo,
          cleared: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : 'sync failed';
      // local-only fallback — fine for M1
    } finally {
      syncing.value = false;
    }
    return next;
  }

  async function hydrateFromServer(profileKey: ProfileKey) {
    try {
      const res = await fetch(
        `${API_BASE}/api/progress?profileKey=${encodeURIComponent(profileKey)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { items?: ProgressRecord[] };
      if (!data.items?.length) return;
      const map = { ...records.value };
      for (const item of data.items) {
        const k = storageKey(item.profileKey, item.levelId);
        const prev = map[k];
        map[k] = {
          ...item,
          stars: Math.max(prev?.stars ?? 0, item.stars),
          bestCombo: Math.max(prev?.bestCombo ?? 0, item.bestCombo),
        };
      }
      records.value = map;
      writeLocal(map);
    } catch {
      // offline / DB down
    }
  }


  function recordWrong(profileKey: ProfileKey, tag: string) {
    const t = tag.trim() || '综合练习';
    const prev = weakTags.value[profileKey] ?? {};
    const next = { ...prev, [t]: (prev[t] ?? 0) + 1 };
    weakTags.value = { ...weakTags.value, [profileKey]: next };
    writeWeakTags(weakTags.value);
  }

  /** Top weak tags for parent dashboard (no full dump). */
  function topWeakTags(profileKey: ProfileKey, limit = 3): Array<{ tag: string; wrongCount: number }> {
    const map = weakTags.value[profileKey] ?? {};
    return Object.entries(map)
      .map(([tag, wrongCount]) => ({ tag, wrongCount }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, limit);
  }

  function weekActivity(profileKey: ProfileKey | null): {
    clears: number;
    stars: number;
    bestCombo: number;
  } {
    if (!profileKey) return { clears: 0, stars: 0, bestCombo: 0 };
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const list = forProfile.value(profileKey).filter((r) => {
      if (!r.clearedAt) return false;
      return new Date(r.clearedAt).getTime() >= weekAgo;
    });
    const all = forProfile.value(profileKey);
    const use = list.length ? list : all;
    return {
      clears: use.filter((r) => r.clearedAt).length,
      stars: use.reduce((s, r) => s + r.stars, 0),
      bestCombo: all.reduce((m, r) => Math.max(m, r.bestCombo), 0),
    };
  }

  function ageBandOf(profileKey: ProfileKey) {
    return PROFILE_META[profileKey].ageBand;
  }

  return {
    records,
    weakTags,
    syncing,
    lastError,
    forProfile,
    getStars,
    totalStars,
    trackStars,
    saveResult,
    hydrateFromServer,
    recordWrong,
    topWeakTags,
    weekActivity,
    ageBandOf,
  };
});
