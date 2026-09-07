import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  DEMO_FAMILY_ID,
  FEED_JELLY_TARGET,
  STICKER_CATALOG,
  StickerIdSchema,
  getSticker,
  pickJellyReaction,
  pickRandomStickerDrop,
  STICKER_DROP_CHANCE,
  type GiftLogEntry,
  type GiftTarget,
  type InventoryItem,
  type ProfileKey,
  type StickerId,
} from '@sujia/shared';

const STORAGE_KEY = 'sujia.inventory.v1';
const LOG_KEY = 'sujia.gifts.v1';
const API_BASE = import.meta.env.VITE_API_BASE || '';

type InvMap = Record<ProfileKey, InventoryItem[]>;

function emptyInv(): InvMap {
  return { tiantian: [], mengying: [], mengzhe: [] };
}

function readInv(): InvMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyInv();
    const parsed = JSON.parse(raw) as Partial<InvMap>;
    const out = emptyInv();
    for (const key of Object.keys(out) as ProfileKey[]) {
      const list = parsed[key];
      if (!Array.isArray(list)) continue;
      out[key] = list
        .map((item) => {
          const id = StickerIdSchema.safeParse(item?.stickerId);
          const count = Math.max(0, Number(item?.count) || 0);
          if (!id.success || count <= 0) return null;
          return { stickerId: id.data, count };
        })
        .filter(Boolean) as InventoryItem[];
    }
    return out;
  } catch {
    return emptyInv();
  }
}

function writeInv(map: InvMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function readLogs(): GiftLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GiftLogEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: GiftLogEntry[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
}

function upsertItem(list: InventoryItem[], stickerId: StickerId, delta: number): InventoryItem[] {
  const next = list.map((i) => ({ ...i }));
  const idx = next.findIndex((i) => i.stickerId === stickerId);
  if (idx >= 0) {
    next[idx] = { stickerId, count: Math.max(0, next[idx].count + delta) };
    if (next[idx].count <= 0) next.splice(idx, 1);
  } else if (delta > 0) {
    next.push({ stickerId, count: delta });
  }
  return next;
}

export const useInventoryStore = defineStore('inventory', () => {
  const byProfile = ref<InvMap>(readInv());
  const giftLogs = ref<GiftLogEntry[]>(readLogs());
  const lastDrop = ref<StickerId | null>(null);
  const lastFeedReaction = ref<string | null>(null);
  const syncing = ref(false);
  const offline = ref(false);

  const catalog = STICKER_CATALOG;

  function itemsOf(profileKey: ProfileKey | null): InventoryItem[] {
    if (!profileKey) return [];
    return byProfile.value[profileKey] ?? [];
  }

  const totalCount = computed(() => (profileKey: ProfileKey | null) =>
    itemsOf(profileKey).reduce((s, i) => s + i.count, 0),
  );

  function persist() {
    writeInv(byProfile.value);
    writeLogs(giftLogs.value);
  }

  function addSticker(profileKey: ProfileKey, stickerId: StickerId, count = 1) {
    byProfile.value = {
      ...byProfile.value,
      [profileKey]: upsertItem(byProfile.value[profileKey] ?? [], stickerId, count),
    };
    persist();
    void syncInventory(profileKey);
  }

  /** After level settle: small chance to drop a sticker. Returns id or null. */
  function tryDropAfterSettle(profileKey: ProfileKey, stars: number): StickerId | null {
    if (stars <= 0) {
      lastDrop.value = null;
      return null;
    }
    if (Math.random() > STICKER_DROP_CHANCE) {
      lastDrop.value = null;
      return null;
    }
    const id = pickRandomStickerDrop();
    addSticker(profileKey, id, 1);
    lastDrop.value = id;
    return id;
  }

  function gift(
    from: ProfileKey,
    to: GiftTarget,
    stickerId: StickerId,
  ): { ok: boolean; message: string; reaction?: string } {
    const fromList = byProfile.value[from] ?? [];
    const have = fromList.find((i) => i.stickerId === stickerId);
    if (!have || have.count <= 0) {
      return { ok: false, message: '背包里没有这张贴纸哦' };
    }
    if (to !== FEED_JELLY_TARGET && to === from) {
      return { ok: false, message: '不能送给自己呀～' };
    }

    const nextMap = { ...byProfile.value };
    nextMap[from] = upsertItem(fromList, stickerId, -1);

    let reaction: string | undefined;
    if (to === FEED_JELLY_TARGET) {
      reaction = pickJellyReaction();
      lastFeedReaction.value = reaction;
      // Feeding jelly consumes the sticker (happy reaction only)
    } else {
      nextMap[to] = upsertItem(nextMap[to] ?? [], stickerId, 1);
    }
    byProfile.value = nextMap;

    const entry: GiftLogEntry = {
      id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromProfileKey: from,
      toProfileKey: to,
      stickerId,
      createdAt: new Date().toISOString(),
      reaction,
    };
    giftLogs.value = [entry, ...giftLogs.value].slice(0, 50);
    persist();
    void syncGift(entry);

    const sticker = getSticker(stickerId);
    if (to === FEED_JELLY_TARGET) {
      return { ok: true, message: `喂给果冻一张「${sticker?.name ?? stickerId}」`, reaction };
    }
    return { ok: true, message: `已送给家人「${sticker?.name ?? stickerId}」` };
  }

  async function syncInventory(profileKey: ProfileKey) {
    syncing.value = true;
    try {
      const res = await fetch(`${API_BASE}/api/gifts/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: DEMO_FAMILY_ID,
          profileKey,
          items: byProfile.value[profileKey],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { offline?: boolean };
      offline.value = Boolean(data.offline);
    } catch {
      offline.value = true;
    } finally {
      syncing.value = false;
    }
  }

  async function syncGift(entry: GiftLogEntry) {
    try {
      const res = await fetch(`${API_BASE}/api/gifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: DEMO_FAMILY_ID,
          fromProfileKey: entry.fromProfileKey,
          toProfileKey: entry.toProfileKey,
          stickerId: entry.stickerId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { offline?: boolean; reaction?: string };
      offline.value = Boolean(data.offline);
      if (data.reaction) lastFeedReaction.value = data.reaction;
    } catch {
      offline.value = true;
    }
  }

  async function hydrateFromServer(profileKey: ProfileKey) {
    try {
      const res = await fetch(
        `${API_BASE}/api/gifts/inventory?profileKey=${encodeURIComponent(profileKey)}&familyId=${encodeURIComponent(DEMO_FAMILY_ID)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        offline?: boolean;
        items?: InventoryItem[];
      };
      offline.value = Boolean(data.offline);
      if (!data.items?.length) return;
      // Merge: take max count per sticker
      const local = byProfile.value[profileKey] ?? [];
      const map = new Map<StickerId, number>();
      for (const i of local) map.set(i.stickerId, i.count);
      for (const i of data.items) {
        const id = StickerIdSchema.safeParse(i.stickerId);
        if (!id.success) continue;
        map.set(id.data, Math.max(map.get(id.data) ?? 0, Number(i.count) || 0));
      }
      byProfile.value = {
        ...byProfile.value,
        [profileKey]: [...map.entries()]
          .filter(([, c]) => c > 0)
          .map(([stickerId, count]) => ({ stickerId, count })),
      };
      persist();
    } catch {
      offline.value = true;
    }
  }

  /** Demo helper: ensure at least one sticker so gift UI is usable. */
  function ensureDemoSticker(profileKey: ProfileKey) {
    if (itemsOf(profileKey).length > 0) return;
    addSticker(profileKey, 'bone', 1);
    addSticker(profileKey, 'star', 1);
  }

  return {
    byProfile,
    giftLogs,
    lastDrop,
    lastFeedReaction,
    syncing,
    offline,
    catalog,
    itemsOf,
    totalCount,
    addSticker,
    tryDropAfterSettle,
    gift,
    hydrateFromServer,
    ensureDemoSticker,
  };
});
