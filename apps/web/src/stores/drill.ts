import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ProfileKey } from '@sujia/shared';

const WEAK_KEY = 'sujia.weakTags.v1';
const ASSIGN_KEY = 'sujia.assignedDrill.v1';

/** Wave0 QuickDrill shell — cooldown + parent assignment only; play UI later. */
export const useDrillStore = defineStore('drill', () => {
  const lastError = ref<string | null>(null);

  function readWeak(): Record<string, Record<string, { wrongCount?: number; lastDrillAt?: string }>> {
    try {
      return JSON.parse(localStorage.getItem(WEAK_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function markDrilled(profileKey: ProfileKey, tag: string) {
    const map = readWeak();
    const prev = map[profileKey] ?? {};
    const cur = prev[tag] ?? { wrongCount: 0 };
    // support both number-only legacy and object shape
    const wrongCount = typeof cur === 'number' ? cur : cur.wrongCount ?? 0;
    prev[tag] = { wrongCount, lastDrillAt: new Date().toISOString() };
    map[profileKey] = prev;
    localStorage.setItem(WEAK_KEY, JSON.stringify(map));
  }

  function setAssignment(profileKey: ProfileKey, tag: string) {
    const all = JSON.parse(localStorage.getItem(ASSIGN_KEY) || '{}') as Record<string, string>;
    all[profileKey] = tag;
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(all));
  }

  function getAssignment(profileKey: ProfileKey): string | null {
    try {
      const all = JSON.parse(localStorage.getItem(ASSIGN_KEY) || '{}') as Record<string, string>;
      return all[profileKey] ?? null;
    } catch {
      return null;
    }
  }

  return { lastError, markDrilled, setAssignment, getAssignment };
});
