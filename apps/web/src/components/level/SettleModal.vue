<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  stars: number;
  combo: number;
  correct: number;
  total: number;
  levelTitle: string;
}>();

const emit = defineEmits<{
  replay: [];
  back: [];
  map: [];
}>();

const jellyLine = computed(() => {
  if (props.stars >= 3) return '太棒了！满星通关！汪～';
  if (props.stars >= 2) return '很厉害！再冲一把更高星！';
  if (props.stars >= 1) return '过关啦！下次可以更好！';
  return '没关系，我们再试一次！';
});
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true">
    <div class="panel card">
      <img class="clear-art" src="/art/storyboard-clear-v1.png" alt="通关" />
      <h2>关卡结算</h2>
      <p class="title">{{ levelTitle }}</p>
      <div class="stars" aria-label="获得星数">
        <span v-for="i in 3" :key="i">{{ i <= stars ? '⭐' : '☆' }}</span>
      </div>
      <p class="stats">答对 {{ correct }}/{{ total }} · 最高连击 {{ combo }}</p>
      <p class="jelly-line">果冻：{{ jellyLine }}</p>
      <div class="actions">
        <button class="btn-primary tap" type="button" @click="emit('replay')">再玩一次</button>
        <button class="btn-accent tap" type="button" @click="emit('map')">回地图</button>
        <button class="ghost tap" type="button" @click="emit('back')">关卡列表</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(27, 43, 34, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 40;
  padding: 1rem;
  padding-bottom: calc(1rem + var(--safe-bottom));
}
.panel {
  width: min(430px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  animation: up 0.28s ease-out;
}
@keyframes up {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.clear-art {
  width: 100%;
  max-height: 120px;
  object-fit: cover;
  border-radius: 14px;
}
.title { color: #5a7264; }
.stars { font-size: 2rem; letter-spacing: 0.15em; }
.stats { color: #5a7264; font-weight: 600; }
.jelly-line {
  background: var(--bamboo-pale);
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  margin: 0.25rem 0;
  font-weight: 700;
  color: var(--bamboo);
}
.actions { display: flex; flex-direction: column; gap: 0.55rem; margin-top: 0.35rem; }
.ghost {
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid rgba(93, 64, 55, 0.25);
  color: var(--wood-dark);
}
</style>
