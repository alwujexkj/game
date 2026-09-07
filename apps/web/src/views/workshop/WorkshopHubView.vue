<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  WORKSHOP_TEMPLATES,
  WORKSHOP_QUESTION_KIND_LABEL,
  type WorkshopTemplateMeta,
} from '@sujia/shared';
import { useProfileStore } from '../../stores/profile';
import { useWorkshopStore } from '../../stores/workshop';
import JellyBubble from '../../components/level/JellyBubble.vue';

const router = useRouter();
const profile = useProfileStore();
const workshop = useWorkshopStore();

const tip = ref('选一个模板，用积木造关卡吧！');

const myLevels = computed(() => workshop.mine(profile.activeKey));
const published = computed(() => workshop.published);

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  void workshop.hydrateFromServer();
});

function startTemplate(tpl: WorkshopTemplateMeta) {
  if (!profile.activeKey) return;
  const record = workshop.createFromTemplate(
    { ...tpl.defaultBlocks },
    profile.activeKey,
  );
  tip.value = `好！进入「${tpl.title}」工坊～`;
  router.push(`/workshop/${record.id}`);
}

function openEditor(id: string) {
  router.push(`/workshop/${id}`);
}

function playLevel(id: string) {
  router.push(`/workshop/${id}/play`);
}
</script>

<template>
  <main class="page hub" v-if="profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="router.push('/map')">← 地图</button>
      <div>
        <h1>🧱 造关卡工坊</h1>
        <p>{{ profile.meta.displayName }} · 用积木帮果冻开门</p>
      </div>
    </header>

    <img class="story" src="/art/storyboard-workshop-v1.png" alt="关卡工坊故事板" />

    <JellyBubble :text="tip" mood="cheer" />

    <section class="card">
      <h2>模板（点一下开始）</h2>
      <div class="tpl-grid">
        <button
          v-for="tpl in WORKSHOP_TEMPLATES"
          :key="tpl.id"
          class="tpl tap"
          type="button"
          @click="startTemplate(tpl)"
        >
          <span class="emoji">{{ tpl.emoji }}</span>
          <strong>{{ tpl.title }}</strong>
          <small>{{ tpl.subtitle }}</small>
        </button>
      </div>
    </section>

    <section class="card">
      <h2>我的关卡</h2>
      <p v-if="!myLevels.length" class="empty">还没有关卡，先选上面的模板～</p>
      <div v-else class="list">
        <button
          v-for="lv in myLevels"
          :key="lv.id"
          class="row tap"
          type="button"
          @click="openEditor(lv.id)"
        >
          <span class="emoji">{{ lv.compiledConfig.emoji }}</span>
          <div class="meta">
            <strong>{{ lv.title }}</strong>
            <small>
              {{ WORKSHOP_QUESTION_KIND_LABEL[lv.blocksJson.questionKind] }}
              · {{ lv.blocksJson.questionCount }} 题
              · {{ lv.publishedToMap ? '已上地图' : '草稿' }}
            </small>
          </div>
          <span class="chev">编辑</span>
        </button>
      </div>
    </section>

    <section class="card valley">
      <h2>🏞 工坊谷 · 家庭可玩</h2>
      <p class="hint">「放到地图」后会出现在这里，家人都能玩。</p>
      <p v-if="!published.length" class="empty">暂无发布关卡</p>
      <div v-else class="list">
        <button
          v-for="lv in published"
          :key="lv.id"
          class="row tap pin"
          type="button"
          @click="playLevel(lv.id)"
        >
          <span class="emoji">{{ lv.compiledConfig.emoji }}</span>
          <div class="meta">
            <strong>{{ lv.title }}</strong>
            <small>作者 · {{ lv.authorProfileKey }} · 点我试玩</small>
          </div>
          <span class="chev">玩</span>
        </button>
      </div>
    </section>

    <p v-if="workshop.offline" class="offline">果冻：服务器休息中，关卡先存在本机～</p>
  </main>
</template>

<style scoped>
.hub { gap: 0.85rem; }
.top { display: flex; align-items: flex-start; gap: 0.65rem; }
.top p { margin-top: 0.25rem; color: #5a7264; }
.back {
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.25);
  color: var(--bamboo);
  padding: 0.35rem 0.7rem;
  flex-shrink: 0;
}
.story {
  width: 100%;
  border-radius: 16px;
  border: 2px solid rgba(93, 64, 55, 0.2);
  max-height: 160px;
  object-fit: cover;
  object-position: center top;
}
h2 { font-size: 1.05rem; margin: 0 0 0.65rem; color: var(--wood-dark); }
.tpl-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.55rem;
}
.tpl {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  text-align: left;
  background: linear-gradient(180deg, #fff, #f1f8f3);
  border: 2px solid rgba(47, 107, 79, 0.22);
  padding: 0.85rem;
}
.tpl .emoji { font-size: 1.5rem; }
.tpl small { color: #678074; font-weight: 500; }
.list { display: flex; flex-direction: column; gap: 0.5rem; }
.row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-align: left;
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.18);
  padding: 0.75rem;
}
.row.pin { background: linear-gradient(180deg, #fff8e7, #fff); }
.meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.meta small { color: #678074; font-weight: 500; }
.chev {
  color: var(--bamboo);
  font-size: 0.85rem;
  font-weight: 800;
}
.empty, .hint { color: #5a7264; margin: 0 0 0.5rem; font-size: 0.92rem; }
.offline {
  text-align: center;
  color: #e65100;
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
