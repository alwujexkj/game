<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DEMO_FAMILY_ID } from '@sujia/shared';
import { useProfileStore } from '../../stores/profile';
import { useRoomStore } from '../../stores/room';
import JellyBubble from '../../components/level/JellyBubble.vue';
import McqQuestion from '../../components/level/McqQuestion.vue';

const route = useRoute();
const router = useRouter();
const profile = useProfileStore();
const room = useRoomStore();

const code = computed(() => String(route.params.code || '').toUpperCase());
const locking = ref(false);
const localPick = ref<string | number | null>(null);

const turn = computed(() => room.state?.turnState ?? null);
const question = computed(() => turn.value?.question ?? null);
const myAnswer = computed(() => {
  if (!profile.activeKey || !turn.value) return null;
  return turn.value.answers[profile.activeKey] ?? null;
});
const answeredCount = computed(() => Object.keys(turn.value?.answers ?? {}).length);
const onlineCount = computed(
  () => (room.state?.members ?? []).filter((m) => m.online).length,
);

const jellyText = computed(() => {
  if (room.settled) {
    const stars = room.settled.starsByProfile[profile.activeKey || ''] ?? 0;
    return `通关结算！你获得 ${stars} 星～汪！`;
  }
  if (room.lastError) return room.lastError.message;
  if (myAnswer.value) {
    return myAnswer.value.ok
      ? '答对了！等小伙伴…'
      : '这题有人错了，大家再试一次！';
  }
  return '大家一起开门！选对答案～';
});

const jellyMood = computed(() => {
  if (room.settled) return 'cheer' as const;
  if (myAnswer.value?.ok === false) return 'oops' as const;
  if (myAnswer.value?.ok) return 'cheer' as const;
  return 'think' as const;
});

const myStars = computed(() => {
  if (!room.settled || !profile.activeKey) return 0;
  return room.settled.starsByProfile[profile.activeKey] ?? 0;
});

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  room.connect({
    profileKey: profile.activeKey,
    displayName: profile.meta?.displayName,
    familyId: DEMO_FAMILY_ID,
  });
  const sync = () => {
    if (room.connected) {
      room.sync(code.value);
      room.join(code.value);
    } else setTimeout(sync, 120);
  };
  sync();
});

watch(
  () => turn.value?.questionId,
  () => {
    locking.value = false;
    localPick.value = null;
  },
);

watch(
  () => turn.value?.answers,
  () => {
    // all_must_correct retry clears answers — unlock local UI
    if (!myAnswer.value) {
      locking.value = false;
      localPick.value = null;
    }
  },
  { deep: true },
);

watch(
  () => room.state?.status,
  (status) => {
    if (status === 'lobby') {
      router.replace(`/room/${code.value}`);
    }
  },
);

function onPick(value: string | number) {
  if (!question.value || locking.value || myAnswer.value) return;
  locking.value = true;
  localPick.value = value;
  room.answer(question.value.id, value);
}

function backToMap() {
  room.leave();
  room.clearSession();
  router.push('/map');
}

function backToHub() {
  room.clearSession();
  router.push('/room');
}
</script>

<template>
  <main class="page play" v-if="profile.meta">
    <header class="hud">
      <div>
        <h1>双人开门</h1>
        <p>
          {{ code }} · 第 {{ (turn?.index ?? 0) + 1 }}/{{ turn?.total || '?' }} 题
          · 已答 {{ answeredCount }}/{{ onlineCount }}
        </p>
      </div>
      <div class="combo" v-if="room.state">连击 {{ room.state.score.combo }}</div>
    </header>

    <JellyBubble :text="jellyText" :mood="jellyMood" />

    <section class="card members">
      <div
        v-for="m in room.state?.members || []"
        :key="m.profileId"
        class="chip"
        :class="{
          done: turn?.answers[m.profileId],
          ok: turn?.answers[m.profileId]?.ok === true,
          bad: turn?.answers[m.profileId]?.ok === false,
        }"
      >
        {{ m.displayName }}
        <span v-if="turn?.answers[m.profileId]?.ok === true">✓</span>
        <span v-else-if="turn?.answers[m.profileId]?.ok === false">✗</span>
        <span v-else>…</span>
      </div>
    </section>

    <section class="card q" v-if="question && !room.settled">
      <McqQuestion
        :prompt="question.prompt"
        :choices="question.choices"
        :disabled="locking || !!myAnswer"
        @pick="onPick"
      />
      <p v-if="myAnswer" class="wait">
        {{ myAnswer.ok ? '等待全员答对…' : '有人答错，本题重来' }}
      </p>
    </section>

    <p v-if="room.lastError" class="err">{{ room.lastError.message }}</p>

    <div v-if="room.settled || room.state?.status === 'closed'" class="settle card">
      <h2>组队结算</h2>
      <div class="stars">
        <span v-for="i in 3" :key="i">{{ i <= myStars ? '⭐' : '☆' }}</span>
      </div>
      <ul class="star-list">
        <li v-for="m in room.state?.members || []" :key="m.profileId">
          {{ m.displayName }}：{{ room.settled?.starsByProfile[m.profileId] ?? 0 }} 星
        </li>
      </ul>
      <p class="jelly-line">果冻：太棒了！门开啦！汪汪～</p>
      <button class="btn-primary tap" type="button" @click="backToMap">回地图</button>
      <button class="ghost tap" type="button" @click="backToHub">再组一队</button>
    </div>
  </main>
</template>

<style scoped>
.play { gap: 0.85rem; }
.hud {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}
.hud p { margin-top: 0.2rem; color: #5a7264; font-size: 0.88rem; }
.combo {
  background: #fff3e0;
  color: #e65100;
  font-weight: 800;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  white-space: nowrap;
}
.members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.65rem;
}
.chip {
  background: #f1f8f3;
  border: 2px solid rgba(47, 107, 79, 0.2);
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-weight: 700;
  font-size: 0.9rem;
}
.chip.ok { background: #e8f5e9; border-color: #4caf7a; }
.chip.bad { background: #ffebee; border-color: #ef9a9a; }
.wait {
  text-align: center;
  margin-top: 0.85rem;
  color: var(--bamboo);
  font-weight: 700;
}
.settle { text-align: center; display: flex; flex-direction: column; gap: 0.55rem; }
.stars { font-size: 2rem; letter-spacing: 0.15em; }
.star-list {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #5a7264;
  font-weight: 600;
}
.jelly-line {
  background: var(--bamboo-pale);
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  font-weight: 700;
  color: var(--bamboo);
}
.ghost {
  background: rgba(255,255,255,0.85);
  border: 2px solid rgba(93, 64, 55, 0.25);
  color: var(--wood-dark);
}
.err {
  background: #ffebee;
  color: #c62828;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  font-weight: 700;
}
</style>
