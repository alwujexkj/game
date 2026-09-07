<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MAP_HOTSPOTS, PROFILE_KEYS, PROFILE_META } from '@sujia/shared';
import { useProfileStore } from '../stores/profile';

const router = useRouter();
const profile = useProfileStore();

onMounted(() => {
  if (!profile.activeKey) router.replace('/select');
});

const siblings = computed(() =>
  PROFILE_KEYS.filter((k) => k !== profile.activeKey).map((k) => ({
    key: k,
    ...PROFILE_META[k],
  })),
);

function onHotspot(id: string) {
  const tip =
    id === 'math'
      ? '数学馆即将开放（M1）'
      : id === 'english'
        ? '英语岛即将开放（M1）'
        : id === 'team'
          ? '组队房间码将在 M2 上线'
          : '造关卡工坊将在 M2 上线';
  window.alert(`果冻：${tip}`);
}
</script>

<template>
  <main class="page map" v-if="profile.meta">
    <header class="top">
      <div>
        <h1>竹林大地图</h1>
        <p>当前：{{ profile.meta.displayName }} · {{ profile.meta.title }}</p>
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
        </button>
      </div>
    </section>

    <section class="tip">
      <img src="/art/map-avatars-v1.png" alt="果冻提示" />
      <div>
        <strong>果冻提示</strong>
        <p>先点热点逛逛吧！兄弟姐妹的图钉在下方，现在都是离线状态。</p>
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
.pin small { display: block; color: #7a8a80; }
.bottom { display: flex; gap: 0.75rem; }
.ghost {
  flex: 1;
  background: rgba(255,255,255,0.7);
  border: 2px solid rgba(93, 64, 55, 0.25);
  color: var(--wood-dark);
}
</style>
