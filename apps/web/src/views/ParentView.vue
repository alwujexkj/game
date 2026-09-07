<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  LEVEL_WEAK_TAG_HINTS,
  PROFILE_KEYS,
  PROFILE_META,
  type ProfileKey,
} from '@sujia/shared';
import { useParentAuthStore } from '../stores/parentAuth';
import { useProgressStore } from '../stores/progress';

const router = useRouter();
const auth = useParentAuthStore();
const progress = useProgressStore();

const pin = ref('');
const confirmPin = ref('');
const message = ref('');

const cards = computed(() =>
  PROFILE_KEYS.map((key) => {
    const meta = PROFILE_META[key];
    const week = progress.weekActivity(key);
    let tags = progress.topWeakTags(key, 3);
    if (!tags.length) {
      // Placeholders from cleared levels' hint tags (gentle, not a dump)
      const records = progress.forProfile(key);
      const hints = new Set<string>();
      for (const r of records) {
        for (const h of LEVEL_WEAK_TAG_HINTS[r.levelId] ?? []) hints.add(h);
      }
      tags = [...hints].slice(0, 3).map((tag) => ({ tag, wrongCount: 0 }));
      if (!tags.length) {
        tags = [{ tag: '多鼓励、少比较', wrongCount: 0 }];
      }
    }
    return {
      key: key as ProfileKey,
      ...meta,
      ...week,
      tags,
    };
  }),
);

async function submit() {
  if (auth.hasPin) {
    const res = await auth.verifyPin(pin.value);
    message.value = res.message;
    return;
  }
  if (pin.value !== confirmPin.value) {
    message.value = '两次 PIN 不一致';
    return;
  }
  const res = await auth.setPin(pin.value);
  message.value = res.message;
}
</script>

<template>
  <main class="page parent">
    <header>
      <h1>家长总览</h1>
      <p v-if="!auth.isUnlocked">
        {{ auth.hasPin ? '输入 4 位 PIN 查看本周学习概况' : '首次使用：设置 4 位家长 PIN（仅本机 Demo）' }}
      </p>
      <p v-else>本周活动、通关与需轻轻关注的知识点（不含完整错题）</p>
    </header>

    <section v-if="!auth.isUnlocked" class="card form">
      <label for="pin">家长 PIN（4 位数字）</label>
      <input
        id="pin"
        v-model="pin"
        class="pin-input"
        type="password"
        inputmode="numeric"
        maxlength="4"
        placeholder="••••"
        autocomplete="off"
      />
      <template v-if="!auth.hasPin">
        <label for="pin2">再输入一次确认</label>
        <input
          id="pin2"
          v-model="confirmPin"
          class="pin-input"
          type="password"
          inputmode="numeric"
          maxlength="4"
          placeholder="••••"
          autocomplete="off"
        />
      </template>
      <button class="btn-accent tap" type="button" @click="submit">
        {{ auth.hasPin ? '进入总览' : '设置 PIN 并进入' }}
      </button>
      <p class="msg">{{ message }}</p>
      <details class="demo-note">
        <summary>Demo PIN 说明</summary>
        <p>
          PIN 存在本机 localStorage（SHA-256 或简易哈希），会话用 sessionStorage 保持解锁。
          忘记 PIN：清除本站数据后重新设置。可选同步 Nest <code>/api/parent/pin</code>（DB 可用时）。
          本 Demo 不做云端找回。
        </p>
      </details>
    </section>

    <template v-else>
      <div class="toolbar">
        <button class="ghost tap" type="button" @click="auth.lock()">锁定</button>
      </div>
      <section v-for="c in cards" :key="c.key" class="card kid">
        <header class="kid-head">
          <strong :style="{ color: c.accent }">{{ c.displayName }}</strong>
          <small>{{ c.title }}</small>
        </header>
        <div class="metrics">
          <div><b>{{ c.clears }}</b><span>通关关卡</span></div>
          <div><b>{{ c.stars }}</b><span>周/累计星</span></div>
          <div><b>{{ c.bestCombo }}</b><span>最佳连击</span></div>
        </div>
        <div class="tags">
          <span class="label">轻轻关注</span>
          <span v-for="t in c.tags" :key="t.tag" class="tag">
            {{ t.tag }}<template v-if="t.wrongCount"> · {{ t.wrongCount }}</template>
          </span>
        </div>
      </section>
    </template>

    <button class="back tap" type="button" @click="router.push(auth.isUnlocked ? '/map' : '/')">
      {{ auth.isUnlocked ? '回地图' : '返回首页' }}
    </button>
  </main>
</template>

<style scoped>
.parent { gap: 0.85rem; }
header p { color: #5a7264; margin-top: 0.25rem; }
.form { display: flex; flex-direction: column; gap: 0.75rem; }
label { font-weight: 700; color: var(--wood-dark); }
.pin-input {
  font-size: 1.6rem;
  letter-spacing: 0.35em;
  text-align: center;
  padding: 0.85rem;
  border-radius: 14px;
  border: 2px solid rgba(198, 40, 40, 0.35);
  background: #fff;
  min-height: 56px;
}
.msg { color: #5a7264; font-size: 0.95rem; }
.demo-note {
  font-size: 0.85rem;
  color: #7a8a80;
  background: #f7fbf8;
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
}
.demo-note p { margin: 0.45rem 0 0; line-height: 1.45; }
.toolbar { display: flex; justify-content: flex-end; }
.ghost {
  background: rgba(255,255,255,0.85);
  border: 2px solid rgba(93, 64, 55, 0.25);
  color: var(--wood-dark);
  padding: 0.35rem 0.9rem;
}
.kid-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.65rem; }
.kid-head small { color: #7a8a80; }
.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  text-align: center;
  margin-bottom: 0.75rem;
}
.metrics b { display: block; font-size: 1.3rem; color: var(--bamboo); }
.metrics span { font-size: 0.72rem; color: #7a8a80; font-weight: 600; }
.tags { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.label { font-size: 0.8rem; font-weight: 700; color: var(--wood-dark); margin-right: 0.15rem; }
.tag {
  background: #fff3e0;
  color: #e65100;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
}
.back {
  background: transparent;
  color: var(--wood-dark);
  text-decoration: underline;
}
</style>
