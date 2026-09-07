import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { DEMO_FAMILY_ID } from '@sujia/shared';

const PIN_HASH_KEY = 'sujia.parentPinHash.v1';
const SESSION_KEY = 'sujia.parentUnlocked.v1';
const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Demo PIN flow (local-first):
 * 1. First visit: parent sets a 4-digit PIN → stored as simple hash in localStorage.
 * 2. Later visits: enter the same PIN to unlock dashboard for this browser session.
 * 3. Optional Nest `/api/parent/pin` syncs hash when DB is up (best-effort).
 * There is no remote reset in demo — clear site data to re-set.
 */
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`sujia-parent:${pin}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple hash for non-secure contexts
  let h = 0;
  const s = `sujia-parent:${pin}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `simple:${h}`;
}

export const useParentAuthStore = defineStore('parentAuth', () => {
  const pinHash = ref<string | null>(localStorage.getItem(PIN_HASH_KEY));
  const unlocked = ref(sessionStorage.getItem(SESSION_KEY) === '1');
  const lastError = ref<string | null>(null);
  const offline = ref(false);

  const hasPin = computed(() => Boolean(pinHash.value));
  const isUnlocked = computed(() => unlocked.value && hasPin.value);

  async function setPin(pin: string): Promise<{ ok: boolean; message: string }> {
    if (!/^\d{4}$/.test(pin)) {
      return { ok: false, message: '请设置 4 位数字 PIN' };
    }
    const hash = await hashPin(pin);
    pinHash.value = hash;
    localStorage.setItem(PIN_HASH_KEY, hash);
    unlocked.value = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    lastError.value = null;
    void syncPin(hash);
    return { ok: true, message: 'PIN 已设置，可进入家长总览' };
  }

  async function verifyPin(pin: string): Promise<{ ok: boolean; message: string }> {
    if (!pinHash.value) {
      return { ok: false, message: '请先设置 PIN' };
    }
    if (!/^\d{4}$/.test(pin)) {
      return { ok: false, message: '请输入 4 位数字' };
    }
    const hash = await hashPin(pin);
    // Local compare (demo)
    if (hash === pinHash.value) {
      unlocked.value = true;
      sessionStorage.setItem(SESSION_KEY, '1');
      lastError.value = null;
      return { ok: true, message: '欢迎回来' };
    }
    // Best-effort server verify
    try {
      const res = await fetch(`${API_BASE}/api/parent/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, familyId: DEMO_FAMILY_ID }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; offline?: boolean };
        offline.value = Boolean(data.offline);
        if (data.ok) {
          unlocked.value = true;
          sessionStorage.setItem(SESSION_KEY, '1');
          return { ok: true, message: '欢迎回来' };
        }
      }
    } catch {
      offline.value = true;
    }
    lastError.value = 'PIN 不正确';
    return { ok: false, message: 'PIN 不正确，再试一次～' };
  }

  function lock() {
    unlocked.value = false;
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function syncPin(hash: string) {
    try {
      const res = await fetch(`${API_BASE}/api/parent/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinHash: hash, familyId: DEMO_FAMILY_ID }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { offline?: boolean };
      offline.value = Boolean(data.offline);
    } catch {
      offline.value = true;
    }
  }

  return {
    pinHash,
    unlocked,
    hasPin,
    isUnlocked,
    lastError,
    offline,
    setPin,
    verifyPin,
    lock,
  };
});
