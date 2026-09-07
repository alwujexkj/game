import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  PROFILE_META,
  ProfileKeySchema,
  type ProfileKey,
} from '@sujia/shared';

const STORAGE_KEY = 'sujia.activeProfile';

function readStored(): ProfileKey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = ProfileKeySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const useProfileStore = defineStore('profile', () => {
  const activeKey = ref<ProfileKey | null>(readStored());

  const meta = computed(() =>
    activeKey.value ? PROFILE_META[activeKey.value] : null,
  );

  function select(key: ProfileKey) {
    activeKey.value = key;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(key));
  }

  function clear() {
    activeKey.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return { activeKey, meta, select, clear };
});
