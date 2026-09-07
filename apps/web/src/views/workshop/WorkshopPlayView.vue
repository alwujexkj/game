<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { computeStars, generateWorkshopQuestions } from '@sujia/shared';
import { useProfileStore } from '../../stores/profile';
import { useWorkshopStore } from '../../stores/workshop';
import JellyBubble from '../../components/level/JellyBubble.vue';
import SettleModal from '../../components/level/SettleModal.vue';
import McqQuestion from '../../components/level/McqQuestion.vue';
import ListenPickQuestion from '../../components/level/ListenPickQuestion.vue';

const MAX_HEARTS = 3;

const route = useRoute();
const router = useRouter();
const profile = useProfileStore();
const workshop = useWorkshopStore();

const id = computed(() => String(route.params.id || ''));
const record = computed(() => workshop.getById(id.value));
const config = computed(() => record.value?.compiledConfig);

const questions = ref(generateWorkshopQuestions(
  // placeholder until mount
  {
    source: 'workshop',
    templateId: 'treasure_door',
    title: '…',
    subtitle: '',
    emoji: '🧱',
    track: 'workshop',
    questionCount: 3,
    questionKind: 'add',
    doorScore: 1,
    jellySteps: 1,
    rewardStars: 1,
  },
  'boot',
));

const index = ref(0);
const hearts = ref(MAX_HEARTS);
const combo = ref(0);
const bestCombo = ref(0);
const correctCount = ref(0);
const answered = ref(0);
const locking = ref(false);
const jellyTip = ref('加油！这是你们自己造的关卡～');
const jellyMood = ref<'happy' | 'think' | 'cheer' | 'oops'>('happy');
const settled = ref(false);
const stars = ref(0);
const timeLeft = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const current = computed(() => questions.value[index.value] ?? null);
const total = computed(() => questions.value.length);
const isTimed = computed(() => Boolean(config.value?.timed));
const towerFloor = computed(() => {
  const q = current.value;
  return q && 'floor' in q && typeof q.floor === 'number' ? q.floor : index.value + 1;
});

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (settled.value) return;
    timeLeft.value -= 1;
    if (timeLeft.value <= 0) {
      timeLeft.value = 0;
      finish();
    }
  }, 1000);
}

function resetRun() {
  if (!config.value) return;
  questions.value = generateWorkshopQuestions(
    config.value,
    `${id.value}:${Date.now()}`,
  );
  index.value = 0;
  hearts.value = MAX_HEARTS;
  combo.value = 0;
  bestCombo.value = 0;
  correctCount.value = 0;
  answered.value = 0;
  locking.value = false;
  settled.value = false;
  stars.value = 0;
  jellyTip.value = `开门要 ${config.value.doorScore} 分，果冻走 ${config.value.jellySteps} 步！`;
  jellyMood.value = 'happy';
  stopTimer();
  if (config.value.timed) {
    timeLeft.value = config.value.timeLimitSec || 60;
    startTimer();
  } else {
    timeLeft.value = 0;
  }
}

function finish() {
  if (settled.value) return;
  stopTimer();
  settled.value = true;
  locking.value = true;
  const raw = computeStars({
    correct: correctCount.value,
    total: Math.max(total.value, answered.value, 1),
    heartsLeft: hearts.value,
    maxHearts: MAX_HEARTS,
    bestCombo: bestCombo.value,
  });
  const cap = config.value?.rewardStars ?? 3;
  stars.value = Math.min(raw, cap);
}

function nextOrFinish() {
  if (index.value + 1 >= total.value) {
    finish();
    return;
  }
  index.value += 1;
  locking.value = false;
}

function onCorrect(tip?: string) {
  correctCount.value += 1;
  answered.value += 1;
  combo.value += 1;
  bestCombo.value = Math.max(bestCombo.value, combo.value);
  jellyMood.value = 'cheer';
  jellyTip.value = tip || (combo.value >= 3 ? `连击 ×${combo.value}！汪汪！` : '答对啦！真棒！');
  locking.value = true;
  setTimeout(nextOrFinish, 550);
}

function onWrong() {
  answered.value += 1;
  combo.value = 0;
  hearts.value = Math.max(0, hearts.value - 1);
  jellyMood.value = 'oops';
  jellyTip.value = hearts.value > 0 ? '哎呀，再试下一题～' : '爱心用完了…我们结算吧';
  locking.value = true;
  if (hearts.value <= 0) {
    setTimeout(finish, 600);
    return;
  }
  setTimeout(nextOrFinish, 700);
}

function onPick(value: string | number) {
  if (locking.value || settled.value || !current.value) return;
  const q = current.value;
  const ok = String(value) === String(q.answer);
  if (ok) onCorrect(q.jelly);
  else onWrong();
}

onMounted(async () => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  if (!record.value) {
    await workshop.hydrateFromServer();
  }
  if (!workshop.getById(id.value)) {
    router.replace('/workshop');
    return;
  }
  resetRun();
});

watch(id, () => {
  if (workshop.getById(id.value)) resetRun();
});

onBeforeUnmount(() => stopTimer());
</script>

<template>
  <main class="page play" v-if="config && current">
    <header class="hud">
      <button class="exit tap" type="button" @click="router.push(`/workshop/${id}`)">←</button>
      <div class="hud-mid">
        <strong>{{ config.emoji }} {{ config.title }}</strong>
        <small>
          {{ index + 1 }}/{{ total }}
          <template v-if="isTimed"> · ⏱ {{ timeLeft }}s · 塔层 {{ towerFloor }}</template>
        </small>
      </div>
      <div class="hud-right">
        <span class="hearts">{{ '❤️'.repeat(hearts) }}{{ '🖤'.repeat(MAX_HEARTS - hearts) }}</span>
        <span class="combo">连击 {{ combo }}</span>
      </div>
    </header>

    <JellyBubble :text="jellyTip" :mood="jellyMood" />

    <section class="question card">
      <McqQuestion
        v-if="current.type === 'mcq'"
        :prompt="current.prompt"
        :choices="current.choices"
        :disabled="locking"
        @pick="onPick"
      />
      <ListenPickQuestion
        v-else-if="current.type === 'listen_pick'"
        :key="current.id"
        :word="current.word"
        :phonetic="current.phonetic"
        :meaning="current.meaning"
        :choices="current.choices"
        :disabled="locking"
        @pick="onPick"
      />
    </section>

    <SettleModal
      v-if="settled"
      :stars="stars"
      :combo="bestCombo"
      :correct="correctCount"
      :total="total"
      :level-title="config.title"
      @replay="resetRun"
      @back="router.push(`/workshop/${id}`)"
      @map="router.push('/map')"
    />
  </main>
  <main v-else class="page"><p>工坊关卡加载中…</p></main>
</template>

<style scoped>
.play { gap: 0.75rem; }
.hud {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.exit {
  width: 48px;
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.25);
  color: var(--bamboo);
  font-size: 1.2rem;
}
.hud-mid { flex: 1; min-width: 0; }
.hud-mid strong { display: block; font-size: 1rem; color: var(--bamboo); }
.hud-mid small { color: #5a7264; font-weight: 600; }
.hud-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.85rem;
  font-weight: 700;
}
.combo {
  background: #fff3e0;
  color: #e65100;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}
.question { min-height: 280px; }
</style>
