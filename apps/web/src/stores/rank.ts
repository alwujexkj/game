import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  PROFILE_KEYS,
  PROFILE_META,
  startOfIsoWeek,
  weekKeyOf,
  type ProfileKey,
  type ProgressRecord,
} from '@sujia/shared';
import { useProgressStore } from './progress';

const TEAM_COUNT_KEY = 'sujia.teamGames.v1';
const API_BASE = import.meta.env.VITE_API_BASE || '';

type TeamCountMap = Record<ProfileKey, number>;

function readTeamCounts(): TeamCountMap {
  try {
    const raw = localStorage.getItem(TEAM_COUNT_KEY);
    if (!raw) return { tiantian: 0, mengying: 0, mengzhe: 0 };
    const parsed = JSON.parse(raw) as Partial<TeamCountMap>;
    return {
      tiantian: Math.max(0, Number(parsed.tiantian) || 0),
      mengying: Math.max(0, Number(parsed.mengying) || 0),
      mengzhe: Math.max(0, Number(parsed.mengzhe) || 0),
    };
  } catch {
    return { tiantian: 0, mengying: 0, mengzhe: 0 };
  }
}

export interface RankRow {
  profileKey: ProfileKey;
  displayName: string;
  accent: string;
  weekStars: number;
  bestCombo: number;
  teamGames: number;
  clears: number;
  gentleLine: string;
}

const GENTLE_LINES = [
  '本周也在慢慢进步，真棒！',
  '坚持学习的小勇士～',
  '和家人一起闯关更开心！',
  '每一颗星都值得鼓掌！',
];

function gentleFor(index: number): string {
  return GENTLE_LINES[index % GENTLE_LINES.length];
}

function isThisWeek(iso: string | null | undefined, weekStart: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= weekStart.getTime();
}

export const useRankStore = defineStore('rank', () => {
  const teamCounts = ref<TeamCountMap>(readTeamCounts());
  const weekKey = ref(weekKeyOf());
  const offline = ref(false);

  function persistTeam() {
    localStorage.setItem(TEAM_COUNT_KEY, JSON.stringify(teamCounts.value));
  }

  function recordTeamGame(participants: ProfileKey[]) {
    const next = { ...teamCounts.value };
    for (const p of participants) {
      next[p] = (next[p] ?? 0) + 1;
    }
    teamCounts.value = next;
    persistTeam();
  }

  const rows = computed((): RankRow[] => {
    const progress = useProgressStore();
    const weekStart = startOfIsoWeek();
    weekKey.value = weekKeyOf();

    const built: RankRow[] = PROFILE_KEYS.map((key, i) => {
      const records = Object.values(progress.records).filter(
        (r: ProgressRecord) => r.profileKey === key,
      );
      const weekRecords = records.filter((r) => isThisWeek(r.clearedAt, weekStart));
      const weekStars = weekRecords.reduce((s, r) => s + r.stars, 0);
      // Fallback: if no week clears, show total stars gently as "累计"
      const displayStars =
        weekStars > 0 ? weekStars : records.reduce((s, r) => s + r.stars, 0);
      const bestCombo = records.reduce((m, r) => Math.max(m, r.bestCombo), 0);
      const clears = records.filter((r) => r.clearedAt).length;
      // Team games: stored count, else count T1 clears as soft signal
      const t1 = records.find((r) => r.levelId === 'T1');
      const teamGames = Math.max(teamCounts.value[key] ?? 0, t1?.clearedAt ? 1 : 0);

      return {
        profileKey: key,
        displayName: PROFILE_META[key].displayName,
        accent: PROFILE_META[key].accent,
        weekStars: displayStars,
        bestCombo,
        teamGames,
        clears,
        gentleLine: gentleFor(i),
      };
    });

    // Sort by week stars desc, but keep gentle presentation (no "loser" framing)
    return [...built].sort((a, b) => b.weekStars - a.weekStars || b.bestCombo - a.bestCombo);
  });

  async function hydrateFromServer() {
    try {
      const res = await fetch(
        `${API_BASE}/api/parent/rank?weekKey=${encodeURIComponent(weekKeyOf())}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { offline?: boolean };
      offline.value = Boolean(data.offline);
    } catch {
      offline.value = true;
    }
  }

  return {
    teamCounts,
    weekKey,
    offline,
    rows,
    recordTeamGame,
    hydrateFromServer,
  };
});
