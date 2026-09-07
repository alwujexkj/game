<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  isRecommended,
  levelsForTrack,
  sortLevelsForAge,
  type LevelDef,
} from '@sujia/shared';
import { useProfileStore } from '../stores/profile';
import { useProgressStore } from '../stores/progress';

const props = defineProps<{ track: 'math' | 'english' }>();

const router = useRouter();
const profile = useProfileStore();
const progress = useProgressStore();

const title = computed(() => (props.track === 'math' ? '数学馆' : '英语岛'));
const emoji = computed(() => (props.track === 'math' ? '🧮' : '🔤'));

const ageBand = computed(() =>
  profile.activeKey ? progress.ageBandOf(profile.activeKey) : 'g5',
);

const levels = computed(() =>
  sortLevelsForAge(levelsForTrack(props.track), ageBand.value),
);

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  progress.hydrateFromServer(profile.activeKey);
});

function starsLabel(level: LevelDef) {
  const s = progress.getStars(profile.activeKey, level.id);
  if (s <= 0) return '未通关';
  return '⭐'.repeat(s);
}

function go(level: LevelDef) {
  router.push(`/${props.track}/${level.id}`);
}
</script>

<template>
  <main class="page list" v-if="profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="router.push('/map')">← 地图</button>
      <div>
        <h1>{{ emoji }} {{ title }}</h1>
        <p>
          {{ profile.meta.displayName }} ·
          {{ ageBand === 'kinder' ? '幼儿园推荐' : ageBand === 'g4' ? '四年级推荐' : '五年级全开放' }}
        </p>
      </div>
    </header>

    <section class="tip-card tip">
      <img src="/art/dog-mascots-v1.png" alt="果冻" />
      <div>
        <strong>果冻导游</strong>
        <p>亮着「推荐」的关卡最适合你。也可以挑战其他关卡哦！</p>
      </div>
    </section>

    <div class="levels">
      <button
        v-for="level in levels"
        :key="level.id"
        class="level card tap"
        type="button"
        @click="go(level)"
      >
        <div class="row">
          <span class="emoji">{{ level.emoji }}</span>
          <div class="meta">
            <strong>{{ level.id }} · {{ level.title }}</strong>
            <small>{{ level.subtitle }}</small>
          </div>
          <div class="side">
            <span
              v-if="isRecommended(level, ageBand)"
              class="badge"
            >推荐</span>
            <span class="stars">{{ starsLabel(level) }}</span>
          </div>
        </div>
      </button>
    </div>
  </main>
</template>

<style scoped>
.list { gap: 0.85rem; }
.top { display: flex; align-items: flex-start; gap: 0.65rem; }
.top p { margin-top: 0.25rem; color: #5a7264; }
.back {
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.25);
  color: var(--bamboo);
  padding: 0.35rem 0.7rem;
  flex-shrink: 0;
}
.levels { display: flex; flex-direction: column; gap: 0.7rem; }
.level {
  text-align: left;
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.2);
  padding: 0.9rem;
}
.row { display: flex; gap: 0.7rem; align-items: center; }
.emoji { font-size: 1.8rem; }
.meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.meta small { color: #678074; font-weight: 500; }
.side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.badge {
  background: var(--red);
  color: #fff;
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}
.stars { font-size: 0.9rem; font-weight: 700; color: #e65100; white-space: nowrap; }
</style>
