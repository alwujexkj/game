import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'splash', component: () => import('../views/SplashView.vue') },
    { path: '/select', name: 'select', component: () => import('../views/SelectView.vue') },
    { path: '/map', name: 'map', component: () => import('../views/MapView.vue') },
    { path: '/parent', name: 'parent', component: () => import('../views/ParentView.vue') },
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
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
