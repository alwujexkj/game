<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FEED_JELLY_TARGET,
  PROFILE_KEYS,
  PROFILE_META,
  getSticker,
  type GiftTarget,
  type ProfileKey,
  type StickerId,
} from '@sujia/shared';
import { useProfileStore } from '../stores/profile';
import { useInventoryStore } from '../stores/inventory';
import JellyBubble from '../components/level/JellyBubble.vue';

const router = useRouter();
const profile = useProfileStore();
const inventory = useInventoryStore();

const selected = ref<StickerId | null>(null);
const toast = ref('');
const jellyMood = ref<'happy' | 'cheer' | 'oops' | 'think'>('happy');
const jellyText = ref('选一张贴纸送给家人，或喂给果冻吧！');

const items = computed(() => inventory.itemsOf(profile.activeKey));
const siblings = computed(() =>
  PROFILE_KEYS.filter((k) => k !== profile.activeKey).map((k) => ({
    key: k as ProfileKey,
    ...PROFILE_META[k],
  })),
);

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  inventory.hydrateFromServer(profile.activeKey);
  inventory.ensureDemoSticker(profile.activeKey);
});

function sheetStyle(id: StickerId) {
  const def = getSticker(id);
  return {
    backgroundImage: 'url(/art/gift-stickers-v1.png)',
    backgroundSize: '300% 300%',
    backgroundPosition: def?.sheetPos ?? '50% 50%',
  };
}

function pick(id: StickerId) {
  selected.value = selected.value === id ? null : id;
  const def = getSticker(id);
  jellyText.value = def
    ? `选中「${def.name}」～送给谁呢？`
    : '选中贴纸啦';
  jellyMood.value = 'think';
}

function doGift(to: GiftTarget) {
  if (!profile.activeKey || !selected.value) {
    toast.value = '先点选一张贴纸哦';
    return;
  }
  const res = inventory.gift(profile.activeKey, to, selected.value);
  toast.value = res.message;
  if (res.ok) {
    jellyMood.value = 'cheer';
    jellyText.value = res.reaction || res.message;
    selected.value = null;
  } else {
    jellyMood.value = 'oops';
    jellyText.value = res.message;
  }
}
</script>

<template>
  <main class="page bag" v-if="profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="router.push('/map')">←</button>
      <div>
        <h1>礼物背包</h1>
        <p>{{ profile.meta.displayName }}的贴纸 · 共 {{ inventory.totalCount(profile.activeKey) }} 张</p>
      </div>
    </header>

    <img class="banner" src="/art/storyboard-gift-v1.png" alt="互赠故事" />

    <JellyBubble :text="jellyText" :mood="jellyMood" />

    <section class="card grid-wrap">
      <h2>我的贴纸</h2>
      <div v-if="!items.length" class="empty">还没有贴纸～通关后有机会掉落哦</div>
      <div class="grid">
        <button
          v-for="item in items"
          :key="item.stickerId"
          class="sticker tap"
          type="button"
          :class="{ on: selected === item.stickerId }"
          @click="pick(item.stickerId)"
        >
          <span class="art" :style="sheetStyle(item.stickerId)" role="img" :aria-label="getSticker(item.stickerId)?.name" />
          <strong>{{ getSticker(item.stickerId)?.name }}</strong>
          <span class="count">×{{ item.count }}</span>
        </button>
      </div>
    </section>

    <section class="card actions" v-if="selected">
      <h2>送给谁？</h2>
      <div class="targets">
        <button
          v-for="s in siblings"
          :key="s.key"
          class="target tap"
          type="button"
          :style="{ borderColor: s.accent }"
          @click="doGift(s.key)"
        >
          <span class="emoji">🎁</span>
          <strong>{{ s.displayName }}</strong>
          <small>互赠贴纸</small>
        </button>
        <button class="target feed tap" type="button" @click="doGift(FEED_JELLY_TARGET)">
          <span class="emoji">🐶</span>
          <strong>喂果冻</strong>
          <small>看果冻开心反应</small>
        </button>
      </div>
    </section>

    <section class="card log" v-if="inventory.giftLogs.length">
      <h2>最近互赠</h2>
      <ul>
        <li v-for="g in inventory.giftLogs.slice(0, 6)" :key="g.id">
          <template v-if="g.toProfileKey === 'jelly'">
            {{ PROFILE_META[g.fromProfileKey].displayName }} 喂果冻「{{ getSticker(g.stickerId)?.name }}」
          </template>
          <template v-else>
            {{ PROFILE_META[g.fromProfileKey].displayName }}
            → {{ PROFILE_META[g.toProfileKey as ProfileKey].displayName }}
            「{{ getSticker(g.stickerId)?.name }}」
          </template>
        </li>
      </ul>
    </section>

    <p v-if="toast" class="toast">{{ toast }}</p>
  </main>
</template>

<style scoped>
.bag { gap: 0.85rem; }
.top { display: flex; gap: 0.65rem; align-items: flex-start; }
.top p { margin: 0.2rem 0 0; color: #5a7264; }
.back {
  width: 48px;
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.25);
  color: var(--bamboo);
  font-size: 1.2rem;
}
.banner {
  width: 100%;
  max-height: 110px;
  object-fit: cover;
  border-radius: 16px;
}
.grid-wrap h2, .actions h2, .log h2 {
  font-size: 1.05rem;
  margin: 0 0 0.65rem;
  color: var(--bamboo);
}
.empty { color: #7a8a80; text-align: center; padding: 1rem 0; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
}
.sticker {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.45rem;
  background: #f7fbf8;
  border: 2px solid rgba(47, 107, 79, 0.2);
}
.sticker.on {
  border-color: var(--bamboo);
  box-shadow: 0 0 0 3px rgba(47, 107, 79, 0.2);
}
.sticker .art {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: #fff;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.8);
}
.sticker strong { font-size: 0.78rem; color: var(--wood-dark); }
.count {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: #fff3e0;
  color: #e65100;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
}
.targets { display: flex; flex-direction: column; gap: 0.55rem; }
.target {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-align: left;
  background: linear-gradient(180deg, #fff, #f1f8f3);
  border: 2px solid rgba(47, 107, 79, 0.25);
  padding: 0.75rem 0.9rem;
}
.target small { display: block; color: #678074; font-weight: 500; }
.target .emoji { font-size: 1.4rem; }
.feed { border-color: rgba(198, 40, 40, 0.35); }
.log ul { margin: 0; padding-left: 1.1rem; color: #5a7264; }
.log li { margin-bottom: 0.35rem; }
.toast {
  text-align: center;
  background: var(--bamboo-pale);
  color: var(--bamboo);
  font-weight: 700;
  padding: 0.55rem;
  border-radius: 12px;
}
</style>
