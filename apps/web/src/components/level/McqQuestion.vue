<script setup lang="ts">
defineProps<{
  prompt: string;
  choices: Array<string | number>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pick: [value: string | number];
}>();
</script>

<template>
  <div class="mcq">
    <h2 class="prompt">{{ prompt }}</h2>
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
.prompt {
  text-align: center;
  font-size: 1.45rem;
  margin-bottom: 1rem;
  color: var(--ink);
}
.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.choice {
  background: #fff;
  border: 3px solid rgba(47, 107, 79, 0.28);
  color: var(--bamboo);
  font-size: 1.35rem;
  min-height: 64px;
  padding: 0.85rem;
}
.choice:disabled { opacity: 0.55; }
.choice:active:not(:disabled) {
  background: var(--bamboo-pale);
  transform: scale(0.98);
}
</style>
