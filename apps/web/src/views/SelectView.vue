<script setup lang="ts">
import { useRouter } from 'vue-router';
import { PROFILE_KEYS, PROFILE_META, type ProfileKey } from '@sujia/shared';
import { useProfileStore } from '../stores/profile';

const router = useRouter();
const profile = useProfileStore();

function choose(key: ProfileKey) {
  profile.select(key);
  router.push('/map');
}
</script>

<template>
  <main class="page">
    <header>
      <h1>选一个小探险家</h1>
      <p>果冻会一直陪着你。甜甜=眼镜女孩 · 孟赢=红卫衣女孩 · 孟辙=数字衫男孩</p>
    </header>

    <div class="roster card">
      <img src="/art/character-roster-named-v1.png" alt="角色卡" />
    </div>

    <div class="cards">
      <button
        v-for="key in PROFILE_KEYS"
        :key="key"
        class="person card tap"
        type="button"
        :style="{ borderColor: PROFILE_META[key].accent }"
        @click="choose(key)"
      >
        <div class="badge" :style="{ background: PROFILE_META[key].accent }">
          {{ PROFILE_META[key].displayName }}
        </div>
        <strong>{{ PROFILE_META[key].title }}</strong>
        <span>{{ PROFILE_META[key].blurb }}</span>
      </button>
    </div>

    <button class="back tap" type="button" @click="router.push('/')">返回</button>
  </main>
</template>

<style scoped>
header p { margin-top: 0.4rem; color: #5a7264; }
.roster img { width: 100%; border-radius: 14px; display: block; }
.cards { display: flex; flex-direction: column; gap: 0.75rem; }
.person {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-width: 3px;
  border-style: solid;
  background: #fff;
}
.badge {
  align-self: flex-start;
  color: #fff;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.95rem;
}
.back {
  background: transparent;
  color: var(--wood-dark);
  text-decoration: underline;
}
</style>
