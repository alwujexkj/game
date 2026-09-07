<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MAP_HOTSPOTS, PROFILE_KEYS, PROFILE_META } from '@sujia/shared';
import { useProfileStore } from '../stores/profile';
import { useProgressStore } from '../stores/progress';
import { useWorkshopStore } from '../stores/workshop';

const router = useRouter();
const profile = useProfileStore();
const progress = useProgressStore();
const workshop = useWorkshopStore();

onMounted(() => {
  if (!profile.activeKey) router.replace('/select');
  else {
    progress.hydrateFromServer(profile.activeKey);
    workshop.hydrateFromServer();
  }
});

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
  return '…';
}

function onHotspot(id: string) {
  const spot = MAP_HOTSPOTS.find((h) => h.id === id);
  if (spot && 'route' in spot && spot.route) {
    router.push(spot.route);
    return;
  }
  window.alert('果冻：这个热点还在装修中～');
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

    <section class="tip">
      <img src="/art/map-avatars-v1.png" alt="果冻提示" />
      <div>
        <strong>果冻提示</strong>
        <p>点「数学馆」「英语岛」「组队」或「工坊」！工坊谷的关卡会出现在下方图钉。</p>
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
</style>
