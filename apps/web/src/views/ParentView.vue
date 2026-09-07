<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const pin = ref('');
const message = ref('家长 PIN 仅为占位 UI，M0 不做鉴权。');

function submit() {
  if (pin.value.length < 4) {
    message.value = '请输入至少 4 位数字（占位校验）';
    return;
  }
  message.value = '已记录输入（未校验、未联网）。正式鉴权将在后续里程碑完成。';
}
</script>

<template>
  <main class="page">
    <header>
      <h1>家长入口</h1>
      <p>输入 PIN 查看总览（本页仅 UI 占位）</p>
    </header>

    <section class="card form">
      <label for="pin">家长 PIN</label>
      <input
        id="pin"
        v-model="pin"
        class="pin-input"
        type="password"
        inputmode="numeric"
        maxlength="8"
        placeholder="••••"
        autocomplete="off"
      />
      <button class="btn-accent tap" type="button" @click="submit">进入（占位）</button>
      <p class="msg">{{ message }}</p>
    </section>

    <button class="back tap" type="button" @click="router.push('/')">返回首页</button>
  </main>
</template>

<style scoped>
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
.back {
  background: transparent;
  color: var(--wood-dark);
  text-decoration: underline;
}
</style>
