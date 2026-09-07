<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../stores/profile';
import { useRankStore } from '../stores/rank';

const router = useRouter();
const profile = useProfileStore();
const rank = useRankStore();

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  rank.hydrateFromServer();
});

function medal(i: number) {
  return ['🌟', '⭐', '✨'][i] ?? '🌱';
}
</script>

<template>
  <main class="page rank" v-if="profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="router.push('/map')">←</button>
      <div>
        <h1>轻松家庭排行</h1>
        <p>本周 {{ rank.weekKey }} · 没有输赢，只有一起成长</p>
      </div>
    </header>

    <section class="tip card soft">
      <strong>果冻说</strong>
      <p>星星、连击、组队次数都值得鼓掌。慢一点也没关系，家人一起最开心！</p>
    </section>

    <section class="list">
      <article
        v-for="(row, i) in rank.rows"
        :key="row.profileKey"
        class="card row"
        :class="{ me: row.profileKey === profile.activeKey }"
      >
        <div class="left">
          <span class="medal">{{ medal(i) }}</span>
          <div>
            <strong :style="{ color: row.accent }">{{ row.displayName }}</strong>
            <small>{{ row.gentleLine }}</small>
          </div>
        </div>
        <div class="stats">
          <div><b>{{ row.weekStars }}</b><span>周星/累计星</span></div>
          <div><b>{{ row.bestCombo }}</b><span>最佳连击</span></div>
          <div><b>{{ row.teamGames }}</b><span>组队次数</span></div>
        </div>
      </article>
    </section>

    <p class="foot">数据来自本地进度；服务器可用时会尝试同步。</p>
  </main>
</template>

<style scoped>
.rank { gap: 0.85rem; }
.top { display: flex; gap: 0.65rem; align-items: flex-start; }
.top p { margin: 0.2rem 0 0; color: #5a7264; }
.back {
  width: 48px;
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.25);
  color: var(--bamboo);
  font-size: 1.2rem;
}
.soft {
  background: linear-gradient(180deg, #e8f5e9, #fff);
}
.soft p { margin: 0.35rem 0 0; color: #5a7264; }
.list { display: flex; flex-direction: column; gap: 0.65rem; }
.row.me { border-color: var(--bamboo); box-shadow: 0 0 0 3px rgba(47, 107, 79, 0.12); }
.left { display: flex; gap: 0.65rem; align-items: center; margin-bottom: 0.65rem; }
.medal { font-size: 1.6rem; }
.left small { display: block; color: #7a8a80; font-weight: 500; margin-top: 0.15rem; }
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  text-align: center;
}
.stats b { display: block; font-size: 1.25rem; color: var(--bamboo); }
.stats span { font-size: 0.72rem; color: #7a8a80; font-weight: 600; }
.foot { text-align: center; color: #9aaa9f; font-size: 0.85rem; }
</style>
