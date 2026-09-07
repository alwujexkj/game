import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  DEMO_FAMILY_ID,
  WorkshopLevelRecordSchema,
  compileWorkshopBlocks,
  type ProfileKey,
  type WorkshopBlocks,
  type WorkshopLevelRecord,
} from '@sujia/shared';

const STORAGE_KEY = 'sujia.workshop.v1';
const API_BASE = import.meta.env.VITE_API_BASE || '';

function readLocal(): WorkshopLevelRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    const out: WorkshopLevelRecord[] = [];
    for (const item of parsed) {
      const r = WorkshopLevelRecordSchema.safeParse(item);
      if (r.success) out.push(r.data);
    }
    return out;
  } catch {
    return [];
  }
}

function writeLocal(items: WorkshopLevelRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ws-${crypto.randomUUID()}`;
  }
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeById(
  local: WorkshopLevelRecord[],
  remote: WorkshopLevelRecord[],
): WorkshopLevelRecord[] {
  const map = new Map<string, WorkshopLevelRecord>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
      continue;
    }
    const newer =
      new Date(item.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()
        ? item
        : prev;
    map.set(item.id, {
      ...newer,
      publishedToMap: item.publishedToMap || prev.publishedToMap,
    });
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export const useWorkshopStore = defineStore('workshop', () => {
  const levels = ref<WorkshopLevelRecord[]>(readLocal());
  const syncing = ref(false);
  const lastError = ref<string | null>(null);
  const offline = ref(false);

  const mine = computed(() => (profileKey: ProfileKey | null) => {
    if (!profileKey) return [] as WorkshopLevelRecord[];
    return levels.value.filter((l) => l.authorProfileKey === profileKey);
  });

  const published = computed(() =>
    levels.value.filter((l) => l.publishedToMap),
  );

  function getById(id: string): WorkshopLevelRecord | undefined {
    return levels.value.find((l) => l.id === id);
  }

  function upsertLocal(record: WorkshopLevelRecord) {
    const idx = levels.value.findIndex((l) => l.id === record.id);
    const next = [...levels.value];
    if (idx >= 0) next[idx] = record;
    else next.unshift(record);
    levels.value = next.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    writeLocal(levels.value);
  }

  /** Create from template defaults (seeded editor start). */
  function createFromTemplate(
    blocks: WorkshopBlocks,
    authorProfileKey: ProfileKey,
  ): WorkshopLevelRecord {
    const compiled = compileWorkshopBlocks(blocks);
    const now = new Date().toISOString();
    const record: WorkshopLevelRecord = {
      id: newId(),
      familyId: DEMO_FAMILY_ID,
      authorProfileKey,
      title: blocks.title || compiled.title,
      templateId: blocks.templateId,
      blocksJson: { ...blocks },
      compiledConfig: compiled,
      publishedToMap: false,
      createdAt: now,
      updatedAt: now,
    };
    upsertLocal(record);
    void syncUpsert(record);
    return record;
  }

  function saveBlocks(
    id: string,
    blocks: WorkshopBlocks,
    title?: string,
  ): WorkshopLevelRecord | null {
    const prev = getById(id);
    if (!prev) return null;
    const compiled = compileWorkshopBlocks(blocks);
    const record: WorkshopLevelRecord = {
      ...prev,
      title: title || blocks.title || compiled.title,
      templateId: blocks.templateId,
      blocksJson: { ...blocks },
      compiledConfig: compiled,
      updatedAt: new Date().toISOString(),
    };
    upsertLocal(record);
    void syncUpsert(record);
    return record;
  }

  function publishToMap(id: string, publishedToMap = true): WorkshopLevelRecord | null {
    const prev = getById(id);
    if (!prev) return null;
    const record: WorkshopLevelRecord = {
      ...prev,
      publishedToMap,
      updatedAt: new Date().toISOString(),
    };
    upsertLocal(record);
    void syncPublish(record);
    return record;
  }

  async function syncUpsert(record: WorkshopLevelRecord) {
    syncing.value = true;
    lastError.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/workshop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          familyId: record.familyId,
          authorProfileKey: record.authorProfileKey,
          title: record.title,
          blocksJson: record.blocksJson,
          publishedToMap: record.publishedToMap,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        ok?: boolean;
        offline?: boolean;
        item?: WorkshopLevelRecord;
      };
      offline.value = Boolean(data.offline);
      if (data.item) {
        const parsed = WorkshopLevelRecordSchema.safeParse(data.item);
        if (parsed.success) upsertLocal(parsed.data);
      }
    } catch (e) {
      offline.value = true;
      lastError.value = e instanceof Error ? e.message : 'sync failed';
    } finally {
      syncing.value = false;
    }
  }

  async function syncPublish(record: WorkshopLevelRecord) {
    syncing.value = true;
    lastError.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/workshop/${encodeURIComponent(record.id)}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorProfileKey: record.authorProfileKey,
          familyId: record.familyId,
          publishedToMap: record.publishedToMap,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { offline?: boolean; item?: WorkshopLevelRecord };
      offline.value = Boolean(data.offline);
      if (data.item) {
        const parsed = WorkshopLevelRecordSchema.safeParse(data.item);
        if (parsed.success) upsertLocal(parsed.data);
      }
    } catch (e) {
      offline.value = true;
      lastError.value = e instanceof Error ? e.message : 'publish sync failed';
    } finally {
      syncing.value = false;
    }
  }

  async function hydrateFromServer(familyId = DEMO_FAMILY_ID) {
    try {
      const res = await fetch(
        `${API_BASE}/api/workshop?familyId=${encodeURIComponent(familyId)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        offline?: boolean;
        items?: WorkshopLevelRecord[];
      };
      offline.value = Boolean(data.offline);
      if (!data.items?.length) return;
      const remote: WorkshopLevelRecord[] = [];
      for (const item of data.items) {
        const parsed = WorkshopLevelRecordSchema.safeParse(item);
        if (parsed.success) remote.push(parsed.data);
      }
      levels.value = mergeById(levels.value, remote);
      writeLocal(levels.value);
    } catch {
      offline.value = true;
    }
  }

  return {
    levels,
    syncing,
    lastError,
    offline,
    mine,
    published,
    getById,
    createFromTemplate,
    saveBlocks,
    publishToMap,
    hydrateFromServer,
  };
});
