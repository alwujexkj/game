<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type Pair = { word: string; emoji: string; meaning: string };

const props = defineProps<{
  pairs: Pair[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  complete: [];
  miss: [];
}>();

type Card = {
  id: string;
  pairKey: string;
  face: string;
  kind: 'word' | 'emoji';
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(pairs: Pair[]): Card[] {
  const cards: Card[] = [];
  for (const p of pairs) {
    cards.push({ id: `w-${p.word}`, pairKey: p.word, face: p.word, kind: 'word' });
    cards.push({
      id: `e-${p.word}`,
      pairKey: p.word,
      face: `${p.emoji}\n${p.meaning}`,
      kind: 'emoji',
    });
  }
  return shuffle(cards);
}

const cards = ref<Card[]>(buildCards(props.pairs));
const flipped = ref<string[]>([]);
const matched = ref<Set<string>>(new Set());
const lock = ref(false);

watch(
  () => props.pairs,
  (p) => {
    cards.value = buildCards(p);
    flipped.value = [];
    matched.value = new Set();
    lock.value = false;
  },
  { deep: true },
);

const done = computed(() => matched.value.size === props.pairs.length);

function onFlip(card: Card) {
  if (props.disabled || lock.value) return;
  if (matched.value.has(card.pairKey)) return;
  if (flipped.value.includes(card.id)) return;
  if (flipped.value.length >= 2) return;

  flipped.value = [...flipped.value, card.id];
  if (flipped.value.length < 2) return;

  lock.value = true;
  const [aId, bId] = flipped.value;
  const a = cards.value.find((c) => c.id === aId)!;
  const b = cards.value.find((c) => c.id === bId)!;

  if (a.pairKey === b.pairKey && a.kind !== b.kind) {
    matched.value = new Set([...matched.value, a.pairKey]);
    flipped.value = [];
    lock.value = false;
    if (matched.value.size === props.pairs.length) emit('complete');
  } else {
    emit('miss');
    setTimeout(() => {
      flipped.value = [];
      lock.value = false;
    }, 650);
  }
}

function isOpen(card: Card) {
  return flipped.value.includes(card.id) || matched.value.has(card.pairKey);
}
</script>

<template>
  <div class="pair">
    <h2 class="prompt">翻卡片，把单词和意思配对</h2>
    <p class="progress">已配对 {{ matched.size }}/{{ pairs.length }}</p>
    <div class="grid">
      <button
        v-for="card in cards"
        :key="card.id"
        class="tile tap"
        type="button"
        :class="{ open: isOpen(card), matched: matched.has(card.pairKey) }"
        :disabled="disabled || done"
        @click="onFlip(card)"
      >
        <span v-if="isOpen(card)" class="face">{{ card.face }}</span>
        <span v-else class="back">?</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.prompt { text-align: center; font-size: 1.2rem; }
.progress { text-align: center; color: #5a7264; font-weight: 700; margin: 0.35rem 0 0.75rem; }
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}
.tile {
  min-height: 72px;
  background: linear-gradient(180deg, #2f6b4f, #1f4a36);
  color: #fff;
  border: none;
  font-size: 1.05rem;
  white-space: pre-line;
  line-height: 1.25;
}
.tile.open {
  background: #fff;
  color: var(--ink);
  border: 3px solid rgba(47, 107, 79, 0.35);
}
.tile.matched {
  background: var(--bamboo-pale);
  border-color: var(--bamboo);
}
.back { font-size: 1.6rem; font-weight: 800; }
</style>
