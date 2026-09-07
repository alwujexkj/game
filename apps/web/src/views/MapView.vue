<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MAP_HOTSPOTS, PROFILE_KEYS, PROFILE_META, getLevel, type LevelId } from '@sujia/shared';
import { useProfileStore } from '../stores/profile';
import { useProgressStore } from '../stores/progress';
import { useWorkshopStore } from '../stores/workshop';
import { useInventoryStore } from '../stores/inventory';
import { useDailyStore, type DailySlot } from '../stores/daily';
import { useDrillStore } from '../stores/drill';

const router = useRouter();
const profile = useProfileStore();
const progress = useProgressStore();
const workshop = useWorkshopStore();
const inventory = useInventoryStore();
const daily = useDailyStore();
const drill = useDrillStore();

onMounted(() => {
  if (!profile.activeKey) router.replace('/select');
  else {
    progress.hydrateFromServer(profile.activeKey);
    workshop.hydrateFromServer();
    inventory.hydrateFromServer(profile.activeKey);
    daily.ensureToday(profile.activeKey);
  }
});

const dailyRec = computed(() =>
  profile.activeKey ? daily.ensureToday(profile.activeKey) : null,
);

const slotLabel: Record<string, string> = {
  main: '主课',
  alt: '换换',
  social: '一起玩',
};

function slotTitle(slot: DailySlot): string {
  if (slot.levelId) {
    const lv = getLevel(slot.levelId as LevelId);
    return lv?.title || slot.levelId;
  }
  if (slot.action === 'team') return '双人开门';
  if (slot.action === 'workshop') return '去工坊造一关～';
  if (slot.action === 'gift') return '送贴纸';
  return '今日一格';
}

function openSlot(slot: DailySlot) {
  if (!profile.activeKey) return;
  if (slot.done) return;
  if (slot.kind === 'social') {
    if (slot.action === 'workshop') router.push('/workshop');
    else if (slot.action === 'gift') router.push('/bag');
    else router.push('/room');
    return;
  }
  const id = slot.levelId;
  if (!id) return;
  const lv = getLevel(id as LevelId);
  const base = lv?.track === 'english' ? '/english' : '/math';
  router.push(`${base}/${id}`);
}

const assignedTag = computed(() =>
  profile.activeKey ? drill.getAssignment(profile.activeKey) : null,
);

const weakTop = computed(() => {
  if (!profile.activeKey) return null;
  const tags = progress.topWeakTags(profile.activeKey, 1);
  return tags[0]?.tag ?? assignedTag.value;
});

function drillLevelForTag(tag: string | null): { path: string } | null {
  if (!tag) return null;
  const t = tag.toLowerCase();
  let levelId: LevelId = 'M2';
  if (t.includes('en.') || t.includes('英语') || t.includes('听音') || t.includes('词')) {
    levelId = t.includes('pair') || t.includes('配对') ? 'E3' : 'E1';
  } else if (t.includes('mul') || t.includes('乘') || t.includes('除')) {
    levelId = 'M4';
  } else if (t.includes('count') || t.includes('数感') || t.includes('骨头')) {
    levelId = 'M1';
  }
  const lv = getLevel(levelId);
  const base = lv?.track === 'english' ? '/english' : '/math';
  return { path: `${base}/${levelId}?mode=drill` };
}

function startQuickDrill() {
  const tag = assignedTag.value || weakTop.value;
  const target = drillLevelForTag(tag);
  if (!target) {
    window.alert('果冻：今天很顺！去三格吧');
    return;
  }
  router.push(target.path);
}

const siblings = computed(() =>
  PROFILE_KEYS.filter((k) => k !== profile.activeKey).map((k) => ({
    key: k,
    ...PROFILE_META[k],
  })),
);

function hotspotBadge(id: string) {
  if (id === 'math') {
    const s = progress.trackStars(profile.activeKey, 'math');
    return s > 0 ? `${s}⭐` : '可玩';
  }
  if (id === 'english') {
    const s = progress.trackStars(profile.activeKey, 'english');
    return s > 0 ? `${s}⭐` : '可玩';
  }
  if (id === 'team') return '可玩';
  if (id === 'workshop') {
    const n = workshop.published.length;
    return n > 0 ? `${n}关` : '可玩';
  }
  if (id === 'bag') {
    const n = inventory.totalCount(profile.activeKey);
    return n > 0 ? `${n}张` : '可玩';
  }
  if (id === 'rank') return '本周';
  return '…';
}

function onHotspot(id: string) {
  const spot = MAP_HOTSPOTS.find((h) => h.id === id);
  if (spot && 'route' in spot && spot.route) {
    router.push(spot.route);
    return;
  }
  window.alert('果冻：这里还在装修～');
}

function playPublished(id: string) {
  router.push(`/workshop/${id}/play`);
}
</script>

<template>
  <main class="page map" v-if="profile.meta">
    <header class="top">
      <div>
        <h1>竹林大地图</h1>
        <p>
          当前：{{ profile.meta.displayName }} · {{ profile.meta.title }}
          · 总星 {{ progress.totalStars(profile.activeKey) }}⭐
        </p>
      </div>
      <button class="switch tap" type="button" @click="router.push('/select')">换人</button>
    </header>

    <section class="scene card">
      <img class="hero" src="/art/map-hero-scene-v1.png" alt="竹林场景" />
      <div class="hotspots">
        <button
          v-for="spot in MAP_HOTSPOTS"
          :key="spot.id"
          class="hotspot tap"
          type="button"
          @click="onHotspot(spot.id)"
        >
          <span class="emoji">{{ spot.emoji }}</span>
          <strong>{{ spot.label }}</strong>
          <small>{{ spot.hint }}</small>
          <span class="badge">{{ hotspotBadge(spot.id) }}</span>
        </button>
      </div>
    </section>

    <section class="card daily" v-if="dailyRec">
      <header class="daily-head">
        <strong>今日三格</strong>
        <small>{{ dailyRec.date }} · 星 {{ dailyRec.totalDailyStars }}/4</small>
      </header>
      <p class="daily-idle">今日三格亮啦！先点一格试试～</p>
      <div class="daily-slots">
        <button
          v-for="slot in dailyRec.slots"
          :key="slot.id"
          class="slot tap"
          type="button"
          :class="{ done: slot.done }"
          @click="openSlot(slot)"
        >
          <span class="slot-badge">{{ slotLabel[slot.kind] || slot.kind }}</span>
          <strong>{{ slotTitle(slot) }}</strong>
          <small>{{ slot.done ? '一格亮完！汪～' : '点我开始' }}</small>
        </button>
      </div>
    </section>

    <section class="card drill">
      <header class="daily-head">
        <strong>弱项快修</strong>
        <small v-if="assignedTag">家长放了一格～</small>
      </header>
      <p>{{ assignedTag ? `家里布置：${assignedTag}` : weakTop ? `这块再练 5 题～（${weakTop}）` : '今天很顺！去三格吧' }}</p>
      <button class="btn-accent tap" type="button" @click="startQuickDrill">
        短短 5 题，走起！
      </button>
    </section>

    <section class="tip">
      <img src="/art/map-avatars-v1.png" alt="果冻提示" />
      <div>
        <strong>果冻提示</strong>
        <p>想去哪？果冻带路！</p>
      </div>
    </section>

    <section class="pins card valley" v-if="workshop.published.length">
      <h2>🏞 工坊谷</h2>
      <div class="pin-row">
        <button
          v-for="lv in workshop.published"
          :key="lv.id"
          class="pin tap pin-btn"
          type="button"
          @click="playPublished(lv.id)"
        >
          <span class="dot online" />
          <div>
            <strong>{{ lv.compiledConfig.emoji }} {{ lv.title }}</strong>
            <small>家庭可玩 · 点我闯关</small>
          </div>
        </button>
      </div>
    </section>

    <section class="pins card">
      <h2>兄弟姐妹</h2>
      <div class="pin-row">
        <div v-for="s in siblings" :key="s.key" class="pin">
          <span class="dot offline" />
          <div>
            <strong>{{ s.displayName }}</strong>
            <small>离线图钉</small>
          </div>
        </div>
      </div>
    </section>

    <nav class="bottom">
      <button class="tap ghost" type="button" @click="router.push('/')">首页</button>
      <button class="tap ghost" type="button" @click="router.push('/bag')">背包</button>
      <button class="tap ghost" type="button" @click="router.push('/rank')">排行</button>
      <button class="tap ghost" type="button" @click="router.push('/parent')">家长</button>
    </nav>
  </main>
</template>

<style scoped>
.map { gap: 0.9rem; }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
.top p { margin-top: 0.25rem; color: #5a7264; }
.switch {
  background: #fff;
  border: 2px solid var(--bamboo);
  color: var(--bamboo);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
}
.scene { padding: 0.75rem; }
.hero {
  width: 100%;
  border-radius: 16px;
  display: block;
  max-height: 180px;
  object-fit: cover;
}
.hotspots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  /* 6 hotspots: math/english/team/workshop/bag/rank */
  gap: 0.65rem;
  margin-top: 0.75rem;
}
.hotspot {
  position: relative;
  background: linear-gradient(180deg, #ffffff, #f1f8f3);
  border: 2px solid rgba(47, 107, 79, 0.25);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.85rem;
  text-align: left;
}
.emoji { font-size: 1.4rem; }
.hotspot small { color: #678074; font-weight: 500; }
.badge {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  background: #fff3e0;
  color: #e65100;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
}
.pins h2 { font-size: 1.05rem; margin-bottom: 0.55rem; }
.pin-row { display: flex; flex-direction: column; gap: 0.55rem; }
.pin { display: flex; align-items: center; gap: 0.65rem; }
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #9e9e9e;
  box-shadow: 0 0 0 4px rgba(158, 158, 158, 0.2);
}
.dot.online {
  background: var(--bamboo-light);
  box-shadow: 0 0 0 4px rgba(76, 175, 122, 0.25);
}
.pin-btn {
  width: 100%;
  background: transparent;
  text-align: left;
  padding: 0.35rem 0;
  min-height: 48px;
}
.valley h2 { color: var(--bamboo); }
.pin small { display: block; color: #7a8a80; }
.bottom { display: flex; gap: 0.75rem; }
.ghost {
  flex: 1;
  background: rgba(255,255,255,0.7);
  border: 2px solid rgba(93, 64, 55, 0.25);
  color: var(--wood-dark);
}
.daily-head, .drill .daily-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.45rem;
}
.daily-head small { color: #7a8a80; font-weight: 600; }
.daily-idle { color: #5a7264; margin: 0 0 0.55rem; font-size: 0.92rem; }
.daily-slots { display: grid; gap: 0.5rem; }
.slot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  text-align: left;
  background: linear-gradient(180deg, #ffffff, #f7fbf8);
  border: 2px solid rgba(47, 107, 79, 0.22);
  padding: 0.7rem 0.85rem;
  position: relative;
}
.slot.done { opacity: 0.65; border-color: rgba(76, 175, 122, 0.45); }
.slot-badge {
  position: absolute;
  top: 0.45rem;
  right: 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
  background: #e8f5e9;
  color: var(--bamboo);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}
.slot small { color: #7a8a80; }
.drill p { color: #5a7264; margin: 0 0 0.55rem; }
.drill .btn-accent { width: 100%; }
</style>
