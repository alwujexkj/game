<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  prompt: string;
  count: number;
  emoji: string;
  choices: Array<string | number>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pick: [value: string | number];
}>();

const items = computed(() => Array.from({ length: props.count }, (_, i) => i));
</script>

<template>
  <div class="drag-count">
    <h2 class="prompt">{{ prompt }}</h2>
    <div class="stage" aria-hidden="true">
      <span v-for="i in items" :key="i" class="item">{{ emoji }}</span>
    </div>
    <p class="hint">点下面的数字告诉果冻</p>
    <div class="choices">
      <button
        v-for="(c, idx) in choices"
        :key="`${idx}-${c}`"
        class="choice tap"
        type="button"
        :disabled="disabled"
        @click="emit('pick', c)"
      >
        {{ c }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.prompt { text-align: center; font-size: 1.3rem; color: var(--ink); }
.stage {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  background: #fff;
  border-radius: 16px;
  padding: 1rem;
  margin: 0.75rem 0;
  border: 2px dashed rgba(47, 107, 79, 0.35);
  min-height: 88px;
}
.item { font-size: 1.85rem; line-height: 1; }
.hint { text-align: center; color: #5a7264; margin-bottom: 0.65rem; font-weight: 600; }
.choices {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
}
.choice {
  background: #fff;
  border: 3px solid rgba(21, 101, 192, 0.3);
  color: #1565c0;
  font-size: 1.5rem;
  min-height: 64px;
}
.choice:disabled { opacity: 0.55; }
</style>
