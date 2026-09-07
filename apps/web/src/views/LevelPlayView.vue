<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { computeStars, getLevel, type LevelId } from '@sujia/shared';
import { getBank, type BankQuestion } from '../data/banks';
import { useProfileStore } from '../stores/profile';
import { useProgressStore } from '../stores/progress';
import JellyBubble from '../components/level/JellyBubble.vue';
import SettleModal from '../components/level/SettleModal.vue';
import McqQuestion from '../components/level/McqQuestion.vue';
import DragCountQuestion from '../components/level/DragCountQuestion.vue';
import ListenPickQuestion from '../components/level/ListenPickQuestion.vue';
import PairMatchQuestion from '../components/level/PairMatchQuestion.vue';

const MAX_HEARTS = 3;

const route = useRoute();
const router = useRouter();
const profile = useProfileStore();
const progress = useProgressStore();

const levelId = computed(() => String(route.params.levelId || '') as LevelId);
const levelDef = computed(() => getLevel(levelId.value));
const bank = computed(() => getBank(levelId.value));

const index = ref(0);
const hearts = ref(MAX_HEARTS);
const combo = ref(0);
const bestCombo = ref(0);
const correctCount = ref(0);
const answered = ref(0);
const locking = ref(false);
const jellyTip = ref('加油！果冻和你一起闯关～');
const jellyMood = ref<'happy' | 'think' | 'cheer' | 'oops'>('happy');
const settled = ref(false);
const stars = ref(0);
const timeLeft = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const questions = computed(() => bank.value?.questions ?? []);
const current = computed<BankQuestion | null>(() => questions.value[index.value] ?? null);
const total = computed(() => questions.value.length);
const isTimed = computed(() => Boolean(bank.value?.timed || levelDef.value?.timed));
const towerFloor = computed(() => {
  const q = current.value;
  return typeof q?.floor === 'number' ? q.floor : index.value + 1;
});

const listPath = computed(() =>
  levelDef.value?.track === 'english' ? '/english' : '/math',
);

function resetRun() {
  index.value = 0;
  hearts.value = MAX_HEARTS;
  combo.value = 0;
  bestCombo.value = 0;
  correctCount.value = 0;
  answered.value = 0;
  locking.value = false;
  settled.value = false;
  stars.value = 0;
  jellyTip.value = '加油！果冻和你一起闯关～';
  jellyMood.value = 'happy';
  stopTimer();
  if (isTimed.value) {
    timeLeft.value = bank.value?.timeLimitSec || levelDef.value?.timeLimitSec || 90;
    startTimer();
  } else {
    timeLeft.value = 0;
  }
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (settled.value) return;
    timeLeft.value -= 1;
    if (timeLeft.value <= 0) {
      timeLeft.value = 0;
      finish(false);
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function finish(_cleared: boolean) {
  if (settled.value) return;
  stopTimer();
  settled.value = true;
  locking.value = true;
  const s = computeStars({
    correct: correctCount.value,
    total: Math.max(total.value, answered.value, 1),
    heartsLeft: hearts.value,
    maxHearts: MAX_HEARTS,
    bestCombo: bestCombo.value,
  });
  // If ran out of time with some correct answers, still award at least 1 if accuracy ok
  stars.value = s;
  if (profile.activeKey && s > 0) {
    await progress.saveResult({
      profileKey: profile.activeKey,
      levelId: levelId.value,
      stars: s,
      bestCombo: bestCombo.value,
    });
  }
}

function nextOrFinish() {
  if (index.value + 1 >= total.value) {
    finish(true);
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
    setTimeout(() => finish(false), 600);
    return;
  }
  setTimeout(nextOrFinish, 700);
}

function onPick(value: string | number) {
  if (locking.value || settled.value || !current.value) return;
  const q = current.value;
  const answer = q.answer;
  const ok =
    String(value) === String(answer) ||
    Number(value) === Number(answer);
  if (ok) onCorrect(typeof q.jelly === 'string' ? q.jelly : undefined);
  else onWrong();
}

function onPairComplete() {
  if (locking.value || settled.value) return;
  onCorrect('配对成功！果冻鼓掌～');
}

function onPairMiss() {
  if (locking.value || settled.value) return;
  // Miss on pair: lose combo but not always a full heart — still count as soft miss
  combo.value = 0;
  jellyMood.value = 'think';
  jellyTip.value = '再想想，翻开配对的两张～';
}

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  if (!levelDef.value || !bank.value) {
    router.replace('/map');
    return;
  }
  resetRun();
});

watch(levelId, () => {
  if (levelDef.value && bank.value) resetRun();
});

onBeforeUnmount(() => stopTimer());
</script>

<template>
  <main class="page play" v-if="levelDef && current">
    <header class="hud">
      <button class="exit tap" type="button" @click="router.push(listPath)">←</button>
      <div class="hud-mid">
        <strong>{{ levelDef.emoji }} {{ levelDef.title }}</strong>
        <small>
          {{ index + 1 }}/{{ total }}
          <template v-if="isTimed"> · ⏱ {{ timeLeft }}s · 塔层 {{ towerFloor }}</template>
        </small>
      </div>
      <div class="hud-right">
        <span class="hearts" aria-label="生命">{{ '❤️'.repeat(hearts) }}{{ '🖤'.repeat(MAX_HEARTS - hearts) }}</span>
        <span class="combo">连击 {{ combo }}</span>
      </div>
    </header>

    <JellyBubble :text="jellyTip" :mood="jellyMood" />

    <section class="question card">
      <DragCountQuestion
        v-if="current.type === 'drag_count'"
        :prompt="String(current.prompt || '')"
        :count="Number(current.count || 0)"
        :emoji="String(current.emoji || '🦴')"
        :choices="(current.choices as Array<string|number>) || []"
        :disabled="locking"
        @pick="onPick"
      />
      <McqQuestion
        v-else-if="current.type === 'mcq'"
        :prompt="String(current.prompt || '')"
        :choices="(current.choices as Array<string|number>) || []"
        :disabled="locking"
        @pick="onPick"
      />
      <ListenPickQuestion
        v-else-if="current.type === 'listen_pick'"
        :key="current.id"
        :word="String(current.word || '')"
        :phonetic="current.phonetic as string | undefined"
        :meaning="current.meaning as string | undefined"
        :choices="(current.choices as Array<{word:string;emoji:string}>) || []"
        :disabled="locking"
        @pick="onPick"
      />
      <PairMatchQuestion
        v-else-if="current.type === 'pair'"
        :key="current.id"
        :pairs="(current.pairs as Array<{word:string;emoji:string;meaning:string}>) || []"
        :disabled="locking"
        @complete="onPairComplete"
        @miss="onPairMiss"
      />
      <p v-else class="fallback">暂不支持题型：{{ current.type }}</p>
    </section>

    <SettleModal
      v-if="settled"
      :stars="stars"
      :combo="bestCombo"
      :correct="correctCount"
      :total="total"
      :level-title="levelDef.title"
      @replay="resetRun"
      @back="router.push(listPath)"
      @map="router.push('/map')"
    />
  </main>
  <main v-else class="page">
    <p>关卡加载中…</p>
  </main>
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
.fallback { text-align: center; color: #5a7264; }
</style>
