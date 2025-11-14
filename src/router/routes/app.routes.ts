import { type RouteRecordRaw } from 'vue-router';

const appRoutes: RouteRecordRaw = {
  // Giriş yapıldıktan sonra kullanıcıyı bu layout karşılayacak
  path: '/',
  component: () => import('@/presentation/layouts/AppLayout.vue'),
  meta: { requiresAuth: true },
  redirect: { name: 'Home' },
  children: [
    {
      path: 'home',
      name: 'Home',
      component: () => import('@/presentation/views/app/HomeView.vue'),
    },
    {
      path: 'annotator',
      name: 'Annotator',
      component: () => import('@/presentation/views/app/AnnotatorView.vue'),
    },
    {
      path: 'dataset-builder',
      name: 'DatasetBuilder',
      component: () => import('@/presentation/views/app/DatasetBuilderView.vue'),
    },
  ],
};

export default appRoutes;
