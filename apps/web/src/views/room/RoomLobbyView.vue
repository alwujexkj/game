<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DEMO_FAMILY_ID, MAX_ROOM_MEMBERS } from '@sujia/shared';
import { useProfileStore } from '../../stores/profile';
import { useRoomStore } from '../../stores/room';
import JellyBubble from '../../components/level/JellyBubble.vue';

const route = useRoute();
const router = useRouter();
const profile = useProfileStore();
const room = useRoomStore();

const code = computed(() => String(route.params.code || '').toUpperCase());
const isHost = computed(() => room.state?.hostProfileId === profile.activeKey);
const me = computed(() =>
  room.state?.members.find((m) => m.profileId === profile.activeKey),
);
const seats = computed(() => {
  const members = room.state?.members ?? [];
  const out = [...members];
  while (out.length < MAX_ROOM_MEMBERS) {
    out.push({
      profileId: `empty-${out.length}`,
      displayName: '空座位',
      ready: false,
      online: false,
      joinedAt: '',
      lastSeenAt: '',
    });
  }
  return out.slice(0, MAX_ROOM_MEMBERS);
});

const allReady = computed(() => {
  const online = (room.state?.members ?? []).filter((m) => m.online);
  return online.length >= 2 && online.every((m) => m.ready);
});

const connectedLabel = computed(() => {
  if (!room.connected) return '连接中…';
  return room.state ? `关卡 T1 · ${room.state.mode}` : '已连接';
});

const jellyText = computed(() => {
  if (room.lastError) return room.lastError.message;
  if (!room.connected) return '正在连接果冻电台…';
  if (!room.state) return '进大厅啦…';
  if (allReady.value && isHost.value) return '都好啦！点开始！';
  if (me.value?.ready) return '等家人准备…汪！';
  return '点「准备好了」，等家人～';
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
  const tryJoin = () => {
    if (room.connected) room.join(code.value);
    else setTimeout(tryJoin, 120);
  };
  tryJoin();
});

watch(
  () => room.state?.status,
  (status) => {
    if (status === 'playing') {
      router.replace(`/room/${code.value}/play`);
    }
  },
);

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code.value);
  } catch {
    window.prompt('复制房间码', code.value);
  }
}

function toggleReady() {
  room.setReady(!me.value?.ready);
}

function startGame() {
  room.start('T1');
}

function leaveRoom() {
  room.leave();
  room.clearSession();
  router.push('/room');
}

function kickMember(profileId: string) {
  if (!isHost.value) return;
  if (profileId.startsWith('empty-')) return;
  room.kick(profileId);
}

function seatEmoji(profileId: string) {
  if (profileId.startsWith('empty-')) return '💺';
  if (profileId === 'mengying') return '👧';
  if (profileId === 'mengzhe') return '👦';
  if (profileId === 'tiantian') return '😎';
  return '🙂';
}
</script>

<template>
  <main class="page lobby" v-if="profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="leaveRoom">离开</button>
      <div>
        <h1>组队大厅</h1>
        <p>{{ connectedLabel }}</p>
      </div>
    </header>

    <section class="code-card card">
      <p class="label">房间码</p>
      <div class="big-code">{{ code }}</div>
      <button class="btn-primary tap" type="button" @click="copyCode">复制房间码</button>
      <p class="hint">把码发给家人，选不同角色加入</p>
    </section>

    <JellyBubble :text="jellyText" :mood="allReady ? 'cheer' : 'happy'" />

    <section class="seats card">
      <h2>成员座位（{{ room.state?.members.length || 0 }}/{{ MAX_ROOM_MEMBERS }}）</h2>
      <div class="seat-row">
        <div
          v-for="s in seats"
          :key="s.profileId"
          class="seat"
          :class="{
            empty: s.profileId.startsWith('empty-'),
            ready: s.ready,
            offline: !s.online && !s.profileId.startsWith('empty-'),
          }"
        >
          <span class="emoji">{{ seatEmoji(s.profileId) }}</span>
          <strong>{{ s.displayName }}</strong>
          <small v-if="s.profileId === room.state?.hostProfileId">房主</small>
          <small v-else-if="s.profileId.startsWith('empty-')">等待加入</small>
          <small v-else-if="!s.online">离线</small>
          <small v-else-if="s.ready">已准备 ✓</small>
          <small v-else>未准备</small>
          <button
            v-if="isHost && !s.profileId.startsWith('empty-') && s.profileId !== profile.activeKey"
            class="kick tap"
            type="button"
            @click="kickMember(s.profileId)"
          >
            踢出
          </button>
        </div>
      </div>
    </section>

    <p v-if="room.lastError" class="err">{{ room.lastError.message }}</p>

    <div class="actions">
      <button
        class="tap"
        :class="me?.ready ? 'ghost' : 'btn-accent'"
        type="button"
        @click="toggleReady"
      >
        {{ me?.ready ? '取消准备' : '准备好了' }}
      </button>
      <button
        v-if="isHost"
        class="btn-primary tap"
        type="button"
        :disabled="!allReady"
        @click="startGame"
      >
        开始双人开门
      </button>
    </div>
  </main>
</template>

<style scoped>
.lobby { gap: 0.85rem; }
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
.code-card { text-align: center; }
.label { color: #5a7264; font-weight: 700; }
.big-code {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: 0.35em;
  color: var(--bamboo);
  margin: 0.35rem 0 0.75rem;
  padding-left: 0.35em;
}
.hint { margin-top: 0.55rem; color: #7a8a80; font-size: 0.85rem; }
.seats h2 { font-size: 1.05rem; margin-bottom: 0.65rem; }
.seat-row { display: flex; flex-direction: column; gap: 0.55rem; }
.seat {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.1rem 0.55rem;
  align-items: center;
  background: #f7fbf8;
  border: 2px solid rgba(47, 107, 79, 0.18);
  border-radius: 14px;
  padding: 0.65rem 0.75rem;
}
.seat .emoji { font-size: 1.5rem; grid-row: span 2; }
.seat strong { grid-column: 2; }
.seat small { grid-column: 2; color: #678074; }
.seat.ready { border-color: var(--bamboo-light); background: #e8f5e9; }
.seat.empty { opacity: 0.55; }
.seat.offline { opacity: 0.7; }
.kick {
  grid-row: span 2;
  grid-column: 3;
  background: #fff;
  border: 2px solid #ef9a9a;
  color: #c62828;
  min-height: 36px;
  min-width: auto;
  padding: 0.25rem 0.55rem;
  font-size: 0.85rem;
  border-radius: 999px;
}
.actions { display: flex; flex-direction: column; gap: 0.55rem; }
.actions button:disabled { opacity: 0.45; }
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
