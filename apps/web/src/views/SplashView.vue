<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useProfileStore } from '../stores/profile';

const router = useRouter();
const profile = useProfileStore();

function enter() {
  if (profile.activeKey) router.push('/map');
  else router.push('/select');
}
</script>

<template>
  <main class="page splash">
    <div class="hero card">
      <img class="jelly" src="/art/jelly-expressions-v1.png" alt="果冻" />
      <h1>苏家学习乐园</h1>
      <p class="greet">汪！我是果冻～欢迎回家探险！</p>
      <p class="sub">竹林小路 · 数学馆 · 英语岛</p>
    </div>
    <button class="btn-primary tap enter" type="button" @click="enter">开始冒险</button>
    <button class="link tap" type="button" @click="router.push('/parent')">家长入口</button>
  </main>
</template>

<style scoped>
.splash { justify-content: center; text-align: center; gap: 1.25rem; }
.hero { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.jelly {
  width: min(88%, 320px);
  max-height: 220px;
  object-fit: cover;
  object-position: top;
  border-radius: 24px;
  border: 3px solid var(--bamboo-light);
}
.greet { font-size: 1.2rem; font-weight: 700; color: var(--wood-dark); }
.sub { color: #5a7264; }
.enter { width: 100%; font-size: 1.2rem; padding: 0.9rem; }
.link {
  background: transparent;
  color: var(--wood);
  text-decoration: underline;
  min-height: 44px;
}
</style>
