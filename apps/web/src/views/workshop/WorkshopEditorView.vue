<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  WORKSHOP_QUESTION_KIND_LABEL,
  WORKSHOP_QUESTION_KINDS,
  compileWorkshopBlocks,
  type WorkshopBlocks,
  type WorkshopQuestionKind,
} from '@sujia/shared';
import { useProfileStore } from '../../stores/profile';
import { useWorkshopStore } from '../../stores/workshop';
import JellyBubble from '../../components/level/JellyBubble.vue';

const route = useRoute();
const router = useRouter();
const profile = useProfileStore();
const workshop = useWorkshopStore();

const id = computed(() => String(route.params.id || ''));
const record = computed(() => workshop.getById(id.value));
const tip = ref('拖动心里的想法…其实点一下积木也能改！');
const savedFlash = ref(false);
const publishedFlash = ref(false);

const draft = reactive<WorkshopBlocks>({
  templateId: 'treasure_door',
  title: '寻宝门',
  doorScore: 3,
  jellySteps: 2,
  questionCount: 5,
  questionKind: 'add',
  rewardStars: 2,
});

const preview = computed(() => {
  try {
    return compileWorkshopBlocks({ ...draft });
  } catch {
    return null;
  }
});

onMounted(() => {
  if (!profile.activeKey) {
    router.replace('/select');
    return;
  }
  const r = workshop.getById(id.value);
  if (!r) {
    router.replace('/workshop');
    return;
  }
  Object.assign(draft, r.blocksJson);
  tip.value = `改积木 → 试玩 → 保存。开门要 ${r.blocksJson.doorScore} 分哦！`;
});

watch(id, () => {
  const r = workshop.getById(id.value);
  if (r) Object.assign(draft, r.blocksJson);
});

function bump(key: 'doorScore' | 'jellySteps' | 'questionCount' | 'rewardStars', delta: number) {
  const limits = {
    doorScore: [1, 10],
    jellySteps: [1, 8],
    questionCount: [3, 12],
    rewardStars: [1, 3],
  } as const;
  const [min, max] = limits[key];
  draft[key] = Math.max(min, Math.min(max, draft[key] + delta));
  tip.value = '积木变了！记得点「试玩」看看～';
}

function setKind(kind: WorkshopQuestionKind) {
  draft.questionKind = kind;
  tip.value = `题型换成「${WORKSHOP_QUESTION_KIND_LABEL[kind]}」啦！`;
}

function save() {
  const r = workshop.saveBlocks(id.value, { ...draft }, draft.title);
  if (!r) return;
  savedFlash.value = true;
  tip.value = '保存成功！关卡进「我的关卡」了～';
  setTimeout(() => {
    savedFlash.value = false;
  }, 1200);
}

function trial() {
  workshop.saveBlocks(id.value, { ...draft }, draft.title);
  router.push(`/workshop/${id.value}/play`);
}

function publish() {
  workshop.saveBlocks(id.value, { ...draft }, draft.title);
  workshop.publishToMap(id.value, true);
  publishedFlash.value = true;
  tip.value = '放到地图啦！去工坊谷 / 地图能看到～';
  setTimeout(() => {
    publishedFlash.value = false;
  }, 1500);
}
</script>

<template>
  <main class="page editor" v-if="record && profile.meta">
    <header class="top">
      <button class="back tap" type="button" @click="router.push('/workshop')">←</button>
      <div class="titles">
        <h1>关卡工坊</h1>
        <input v-model="draft.title" class="title-input" maxlength="24" aria-label="关卡标题" />
      </div>
    </header>

    <JellyBubble :text="tip" :mood="publishedFlash ? 'cheer' : 'happy'" />

    <section class="card blocks">
      <h2>我的代码积木</h2>

      <div class="block pink">
        <span class="ico">🚪</span>
        <div class="body">
          <strong>开门要几分</strong>
          <div class="ctrl">
            <button type="button" class="pm tap" @click="bump('doorScore', -1)">−</button>
            <span class="val">{{ draft.doorScore }}</span>
            <button type="button" class="pm tap" @click="bump('doorScore', 1)">＋</button>
          </div>
        </div>
      </div>

      <div class="block green">
        <span class="ico">🐾</span>
        <div class="body">
          <strong>果冻走几步</strong>
          <div class="ctrl">
            <button type="button" class="pm tap" @click="bump('jellySteps', -1)">−</button>
            <span class="val">{{ draft.jellySteps }}</span>
            <button type="button" class="pm tap" @click="bump('jellySteps', 1)">＋</button>
          </div>
        </div>
      </div>

      <div class="block yellow">
        <span class="ico">#️⃣</span>
        <div class="body">
          <strong>题量</strong>
          <div class="ctrl">
            <button type="button" class="pm tap" @click="bump('questionCount', -1)">−</button>
            <span class="val">{{ draft.questionCount }}</span>
            <button type="button" class="pm tap" @click="bump('questionCount', 1)">＋</button>
          </div>
        </div>
      </div>

      <div class="block blue">
        <span class="ico">🧮</span>
        <div class="body">
          <strong>题型</strong>
          <div class="kinds">
            <button
              v-for="k in WORKSHOP_QUESTION_KINDS"
              :key="k"
              type="button"
              class="kind tap"
              :class="{ on: draft.questionKind === k }"
              @click="setKind(k)"
            >
              {{ WORKSHOP_QUESTION_KIND_LABEL[k] }}
            </button>
          </div>
        </div>
      </div>

      <div class="block orange">
        <span class="ico">⭐</span>
        <div class="body">
          <strong>答对奖励星</strong>
          <div class="ctrl">
            <button type="button" class="pm tap" @click="bump('rewardStars', -1)">−</button>
            <span class="val">{{ draft.rewardStars }}</span>
            <button type="button" class="pm tap" @click="bump('rewardStars', 1)">＋</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card preview" v-if="preview">
      <h2>预览区</h2>
      <div class="preview-body">
        <div class="door">
          <span class="big">{{ preview.emoji }}</span>
          <p>开门要 <strong>{{ preview.doorScore }}</strong> 分</p>
          <p>果冻走 <strong>{{ preview.jellySteps }}</strong> 步</p>
          <p>
            {{ WORKSHOP_QUESTION_KIND_LABEL[preview.questionKind] }} ·
            {{ preview.questionCount }} 题 · 奖励
            {{ '⭐'.repeat(preview.rewardStars) }}
          </p>
          <p v-if="preview.timed" class="timed">⏱ 限时约 {{ preview.timeLimitSec }} 秒</p>
        </div>
        <p class="bubble">帮果冻开门吧！</p>
      </div>
    </section>

    <nav class="actions">
      <button class="btn-primary tap" type="button" @click="trial">▶ 试玩</button>
      <button class="save tap" type="button" @click="save">
        {{ savedFlash ? '已保存' : '💾 保存' }}
      </button>
      <button class="btn-accent tap" type="button" @click="publish">
        {{ record.publishedToMap || publishedFlash ? '已上地图' : '放到地图' }}
      </button>
    </nav>
  </main>
  <main v-else class="page"><p>加载工坊…</p></main>
</template>

<style scoped>
.editor { gap: 0.75rem; padding-bottom: 1.25rem; }
.top { display: flex; gap: 0.55rem; align-items: flex-start; }
.back {
  background: #fff;
  border: 2px solid rgba(47, 107, 79, 0.25);
  color: var(--bamboo);
  width: 48px;
}
.titles { flex: 1; min-width: 0; }
.titles h1 { font-size: 1.15rem; margin: 0; color: var(--wood-dark); }
.title-input {
  width: 100%;
  margin-top: 0.35rem;
  border: 2px solid rgba(93, 64, 55, 0.25);
  border-radius: 12px;
  padding: 0.45rem 0.65rem;
  font-size: 1rem;
  font-weight: 700;
  background: #fff;
  color: var(--bamboo);
}
h2 { font-size: 1rem; margin: 0 0 0.65rem; color: var(--wood-dark); }
.blocks { display: flex; flex-direction: column; gap: 0.55rem; }
.block {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  border-radius: 14px;
  padding: 0.65rem 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.06);
  color: #fff;
}
.block .ico { font-size: 1.35rem; }
.block .body { flex: 1; min-width: 0; }
.block strong { display: block; font-size: 0.95rem; margin-bottom: 0.35rem; }
.pink { background: linear-gradient(180deg, #f48fb1, #ec407a); }
.green { background: linear-gradient(180deg, #81c784, #43a047); }
.yellow { background: linear-gradient(180deg, #ffd54f, #ffb300); color: #5d4037; }
.blue { background: linear-gradient(180deg, #64b5f6, #1e88e5); }
.orange { background: linear-gradient(180deg, #ffb74d, #fb8c00); }
.ctrl { display: flex; align-items: center; gap: 0.45rem; }
.pm {
  width: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--wood-dark);
  font-size: 1.2rem;
}
.val {
  min-width: 2rem;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 800;
}
.kinds { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.kind {
  min-height: 40px;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  color: inherit;
  font-size: 0.88rem;
}
.kind.on {
  background: #fff;
  color: #1565c0;
}
.preview-body {
  background: linear-gradient(180deg, #e8f5e9, #fff8e7);
  border-radius: 14px;
  padding: 0.85rem;
  text-align: center;
}
.door .big { font-size: 2.4rem; }
.door p { margin: 0.25rem 0; color: #5a7264; font-weight: 600; }
.bubble {
  margin: 0.65rem 0 0;
  display: inline-block;
  background: #fff;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-weight: 700;
  color: var(--bamboo);
  border: 2px solid rgba(47, 107, 79, 0.2);
}
.timed { color: #e65100 !important; }
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.45rem;
  position: sticky;
  bottom: 0.5rem;
}
.save {
  background: #1565c0;
  color: #fff;
  box-shadow: 0 4px 0 #0d47a1;
}
.save:active { transform: translateY(2px); box-shadow: 0 2px 0 #0d47a1; }
.actions button { font-size: 0.92rem; padding: 0.35rem 0.25rem; }
</style>
