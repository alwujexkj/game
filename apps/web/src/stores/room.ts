import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { io, type Socket } from 'socket.io-client';
import {
  DEMO_FAMILY_ID,
  type ProfileKey,
  type RoomPublicState,
} from '@sujia/shared';

function resolveServerUrl() {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return '';
}

export const useRoomStore = defineStore('room', () => {
  const socket = shallowRef<Socket | null>(null);
  const connected = ref(false);
  const state = ref<RoomPublicState | null>(null);
  const lastError = ref<{ code: string; message: string } | null>(null);
  const settled = ref<{
    starsByProfile: Record<string, number>;
    combo?: number;
    levelId?: string;
  } | null>(null);
  const myProfileKey = ref<ProfileKey | null>(null);

  function connect(auth: {
    profileKey: ProfileKey;
    displayName?: string;
    familyId?: string;
  }) {
    if (socket.value?.connected && myProfileKey.value === auth.profileKey) {
      return socket.value;
    }
    disconnect();
    lastError.value = null;
    settled.value = null;
    myProfileKey.value = auth.profileKey;
    const url = resolveServerUrl();
    const s = io(`${url}/room`, {
      auth: {
        familyId: auth.familyId || DEMO_FAMILY_ID,
        profileKey: auth.profileKey,
        displayName: auth.displayName,
      },
      transports: ['websocket', 'polling'],
    });
    socket.value = s;

    s.on('connect', () => {
      connected.value = true;
    });
    s.on('disconnect', () => {
      connected.value = false;
    });
    s.on('room.state', (payload: RoomPublicState) => {
      state.value = payload;
    });
    s.on('room.settled', (payload: NonNullable<typeof settled.value>) => {
      settled.value = payload;
    });
    s.on('room.error', (err: { code: string; message: string }) => {
      lastError.value = err;
    });
    return s;
  }

  function disconnect() {
    if (socket.value) {
      socket.value.removeAllListeners();
      socket.value.disconnect();
      socket.value = null;
    }
    connected.value = false;
  }

  function clearSession() {
    disconnect();
    state.value = null;
    settled.value = null;
    lastError.value = null;
  }

  function join(code: string) {
    lastError.value = null;
    socket.value?.emit('room.join', { code: code.toUpperCase() });
  }

  function leave() {
    socket.value?.emit('room.leave', {});
  }

  function setReady(readyFlag: boolean) {
    socket.value?.emit('room.ready', { ready: readyFlag });
  }

  function kick(profileId: string) {
    socket.value?.emit('room.kick', { profileId });
  }

  function start(levelId = 'T1') {
    socket.value?.emit('room.start', { levelId });
  }

  function answer(questionId: string, answerValue: string | number) {
    socket.value?.emit('room.answer', {
      questionId,
      answer: answerValue,
      clientTs: Date.now(),
    });
  }

  function sync(code?: string) {
    socket.value?.emit('room.sync', {
      code: code || state.value?.code,
      version: state.value?.version,
    });
  }

  return {
    socket,
    connected,
    state,
    lastError,
    settled,
    myProfileKey,
    connect,
    disconnect,
    clearSession,
    join,
    leave,
    setReady,
    kick,
    start,
    answer,
    sync,
    resolveServerUrl,
  };
});

export async function apiCreateRoom(body: {
  profileKey: ProfileKey;
  displayName?: string;
  familyId?: string;
}) {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      familyId: body.familyId || DEMO_FAMILY_ID,
      profileKey: body.profileKey,
      displayName: body.displayName,
      levelId: 'T1',
    }),
  });
  return res.json();
}

export async function apiJoinRoom(body: {
  code: string;
  profileKey: ProfileKey;
  displayName?: string;
  familyId?: string;
}) {
  const res = await fetch('/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: body.code,
      familyId: body.familyId || DEMO_FAMILY_ID,
      profileKey: body.profileKey,
      displayName: body.displayName,
    }),
  });
  return res.json();
}
