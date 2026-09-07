<script setup lang="ts">
defineProps<{
  text: string;
  mood?: 'happy' | 'think' | 'cheer' | 'oops';
}>();
</script>

<template>
  <div class="jelly-bubble" :class="mood || 'happy'">
    <img src="/art/jelly-expressions-v1.png" alt="果冻" />
    <p>{{ text }}</p>
  </div>
</template>

<style scoped>
.jelly-bubble {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 0.55rem 0.75rem;
  border: 2px solid rgba(47, 107, 79, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.jelly-bubble img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  object-position: 15% 40%;
  border-radius: 50%;
  background: var(--bamboo-pale);
  flex-shrink: 0;
}
.jelly-bubble.oops img { object-position: 85% 40%; }
.jelly-bubble.cheer img { object-position: 50% 10%; }
.jelly-bubble.think img { object-position: 50% 70%; }
.jelly-bubble p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--wood-dark);
  line-height: 1.35;
}
</style>
