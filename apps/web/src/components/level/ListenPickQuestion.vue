<script setup lang="ts">
import { onMounted, ref } from 'vue';

type Choice = { word: string; emoji: string };

const props = defineProps<{
  word: string;
  phonetic?: string;
  meaning?: string;
  choices: Choice[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pick: [value: string];
}>();

const speaking = ref(false);
const revealed = ref(false);

function speak() {
  const text = props.word;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    speaking.value = true;
    u.onend = () => { speaking.value = false; };
    u.onerror = () => { speaking.value = false; };
    window.speechSynthesis.speak(u);
  } else {
    revealed.value = true;
  }
}

onMounted(() => {
  // Auto-play once for kinder UX
  setTimeout(speak, 350);
});
</script>

<template>
  <div class="listen">
    <h2 class="prompt">听一听，点出正确的卡片</h2>
    <div class="speaker-row">
      <button class="speaker tap" type="button" @click="speak">
        {{ speaking ? '🔊 播放中…' : '🔈 再听一遍' }}
      </button>
      <button class="reveal tap" type="button" @click="revealed = !revealed">
        {{ revealed ? '隐藏提示' : '看音标' }}
      </button>
    </div>
    <p v-if="revealed" class="hint">
      <strong>{{ word }}</strong>
      <span v-if="phonetic"> {{ phonetic }}</span>
      <span v-if="meaning"> · {{ meaning }}</span>
    </p>
    <div class="cards">
      <button
        v-for="c in choices"
        :key="c.word"
        class="card-btn tap"
        type="button"
        :disabled="disabled"
        @click="emit('pick', c.word)"
      >
        <span class="emoji">{{ c.emoji }}</span>
        <strong>{{ c.word }}</strong>
      </button>
    </div>
  </div>
</template>

<style scoped>
.prompt { text-align: center; font-size: 1.25rem; }
.speaker-row { display: flex; gap: 0.55rem; margin: 0.75rem 0; }
.speaker, .reveal {
  flex: 1;
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.3);
  color: var(--bamboo);
  min-height: 52px;
}
.hint {
  text-align: center;
  background: var(--bamboo-pale);
  padding: 0.5rem;
  border-radius: 12px;
  margin-bottom: 0.65rem;
  color: var(--wood-dark);
}
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.card-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  background: #fff;
  border: 3px solid rgba(47, 107, 79, 0.25);
  padding: 0.9rem 0.5rem;
  min-height: 96px;
}
.emoji { font-size: 2rem; }
.card-btn:disabled { opacity: 0.55; }
</style>
