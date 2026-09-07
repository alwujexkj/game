import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'splash', component: () => import('../views/SplashView.vue') },
    { path: '/select', name: 'select', component: () => import('../views/SelectView.vue') },
    { path: '/map', name: 'map', component: () => import('../views/MapView.vue') },
    { path: '/parent', name: 'parent', component: () => import('../views/ParentView.vue') },
    { path: '/bag', name: 'bag', component: () => import('../views/BagView.vue') },
    { path: '/rank', name: 'rank', component: () => import('../views/RankView.vue') },
    {
      path: '/math',
      name: 'math',
      component: () => import('../views/TrackListView.vue'),
      props: { track: 'math' },
    },
    {
      path: '/math/:levelId',
      name: 'math-level',
      component: () => import('../views/LevelPlayView.vue'),
    },
    {
      path: '/english',
      name: 'english',
      component: () => import('../views/TrackListView.vue'),
      props: { track: 'english' },
    },
    {
      path: '/english/:levelId',
      name: 'english-level',
      component: () => import('../views/LevelPlayView.vue'),
    },
    {
      path: '/room',
      name: 'room-hub',
      component: () => import('../views/room/RoomHubView.vue'),
    },
    {
      path: '/room/:code',
      name: 'room-lobby',
      component: () => import('../views/room/RoomLobbyView.vue'),
    },
    {
      path: '/room/:code/play',
      name: 'room-play',
      component: () => import('../views/room/RoomPlayView.vue'),
    },
    {
      path: '/workshop',
      name: 'workshop',
      component: () => import('../views/workshop/WorkshopHubView.vue'),
    },
    {
      path: '/workshop/:id',
      name: 'workshop-edit',
      component: () => import('../views/workshop/WorkshopEditorView.vue'),
    },
    {
      path: '/workshop/:id/play',
      name: 'workshop-play',
      component: () => import('../views/workshop/WorkshopPlayView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
