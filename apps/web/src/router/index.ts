import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'splash', component: () => import('../views/SplashView.vue') },
    { path: '/select', name: 'select', component: () => import('../views/SelectView.vue') },
    { path: '/map', name: 'map', component: () => import('../views/MapView.vue') },
    { path: '/parent', name: 'parent', component: () => import('../views/ParentView.vue') },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
