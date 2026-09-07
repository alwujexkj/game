<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DEMO_FAMILY_ID } from '@sujia/shared';
import { useProfileStore } from '../../stores/profile';
import { apiCreateRoom, apiJoinRoom, useRoomStore } from '../../stores/room';
import JellyBubble from '../../components/level/JellyBubble.vue';

const router = useRouter();
const profile = useProfileStore();
const room = useRoomStore();

const joinCode = ref('');
const busy = ref(false);
const tip = ref('邀请家人输入房间码，一起推开大门！');
const errMsg = ref('');

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
});

async function createRoom() {
  if (!profile.activeKey || busy.value) return;
  busy.value = true;
  errMsg.value = '';
  tip.value = '果冻正在准备房间…';
  try {
    const data = await apiCreateRoom({
      profileKey: profile.activeKey,
      displayName: profile.meta?.displayName,
      familyId: DEMO_FAMILY_ID,
    });
    if (!data.ok || !data.code) {
      errMsg.value = data?.error?.message || '建房失败，请确认服务器已启动';
      tip.value = '哎呀，再试一次～';
      return;
    }
    room.connect({
      profileKey: profile.activeKey,
      displayName: profile.meta?.displayName,
      familyId: DEMO_FAMILY_ID,
    });
    // small delay so socket connects
    await new Promise((r) => setTimeout(r, 200));
    room.join(data.code);
    router.push(`/room/${data.code}`);
  } catch (e) {
    errMsg.value = `建房失败：${String(e)}`;
  } finally {
    busy.value = false;
  }
}

async function joinRoom() {
  if (!profile.activeKey || busy.value) return;
  const code = joinCode.value.trim().toUpperCase();
  if (code.length < 4) {
    errMsg.value = '请输入 4 位房间码';
    return;
  }
  busy.value = true;
  errMsg.value = '';
  tip.value = '果冻去敲门啦…';
  try {
    const data = await apiJoinRoom({
      code,
      profileKey: profile.activeKey,
      displayName: profile.meta?.displayName,
      familyId: DEMO_FAMILY_ID,
    });
    if (!data.ok) {
      errMsg.value = data?.error?.message || '加入失败';
      tip.value = '找不到房间…检查码对不对？';
      return;
    }
    room.connect({
      profileKey: profile.activeKey,
      displayName: profile.meta?.displayName,
      familyId: DEMO_FAMILY_ID,
    });
    await new Promise((r) => setTimeout(r, 200));
    room.join(data.code);
    router.push(`/room/${data.code}`);
  } catch (e) {
    errMsg.value = `加入失败：${String(e)}`;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="page room-hub" v-if="profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="router.push('/map')">← 地图</button>
      <div>
        <h1>组队闯关</h1>
        <p>当前：{{ profile.meta.displayName }} · 家庭 {{ DEMO_FAMILY_ID }}</p>
      </div>
    </header>

    <JellyBubble :text="tip" mood="cheer" />

    <section class="card create">
      <h2>🚪 T1 双人开门</h2>
      <p class="desc">全员答对才能推进。最多 3 人 · 模式 all_must_correct</p>
      <button class="btn-primary tap" type="button" :disabled="busy" @click="createRoom">
        创建房间
      </button>
    </section>

    <section class="card join">
      <h2>输入房间码</h2>
      <input
        v-model="joinCode"
        class="code-input"
        maxlength="8"
        placeholder="例如 A7K2"
        autocomplete="off"
        autocapitalize="characters"
        @keyup.enter="joinRoom"
      />
      <button class="btn-accent tap" type="button" :disabled="busy" @click="joinRoom">
        加入房间
      </button>
    </section>

    <p v-if="errMsg" class="err">{{ errMsg }}</p>

    <section class="tip how">
      <div>
        <strong>两台设备怎么玩？</strong>
        <p>
          1. 浏览器 A 选「甜甜」创建房间，记下大字房间码<br />
          2. 浏览器 B 换角色选「孟赢」或「孟辙」，输入同一码加入<br />
          3. 双方点准备，房主点开始
        </p>
        <p class="muted">演示固定 familyId = sujia-demo（两端必须相同）</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.room-hub { gap: 0.85rem; }
.top { display: flex; gap: 0.75rem; align-items: flex-start; }
.top p { margin-top: 0.2rem; color: #5a7264; font-size: 0.9rem; }
.back {
  background: #fff;
  border: 2px solid var(--bamboo);
  color: var(--bamboo);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  min-width: auto;
}
.create h2, .join h2 { margin-bottom: 0.35rem; }
.desc { color: #5a7264; margin-bottom: 0.85rem; }
.create .btn-primary, .join .btn-accent { width: 100%; }
.code-input {
  width: 100%;
  font-size: 1.6rem;
  letter-spacing: 0.25em;
  text-align: center;
  text-transform: uppercase;
  font-weight: 800;
  padding: 0.75rem;
  border-radius: 14px;
  border: 3px solid rgba(47, 107, 79, 0.3);
  margin-bottom: 0.75rem;
  color: var(--bamboo);
  background: #fff;
}
.err {
  background: #ffebee;
  color: #c62828;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  font-weight: 700;
}
.how .muted { color: #7a8a80; margin-top: 0.4rem; font-size: 0.85rem; }
</style>
