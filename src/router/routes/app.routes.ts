import { type RouteRecordRaw } from 'vue-router';

const appRoutes: RouteRecordRaw = {
  path: '/',
  component: () => import('@/presentation/layouts/AppLayout.vue'),
  meta: { requiresAuth: true },
  redirect: { name: 'Home' },
  children: [
    {
      path: 'home',
      name: 'Home',
      component: () => import('@/presentation/views/home/HomeView.vue'),
    },
    {
      path: 'annotator',
      name: 'Annotator',
      component: () => import('@/presentation/views/annotator/AnnotatorView.vue'),
    },
    {
      path: 'workspaces',
      name: 'WorkspaceList',
      component: () => import('@/presentation/views/workspace/WorkspaceListView.vue'),
    },
    {
      path: 'workspaces/:workspaceId',
      name: 'WorkspaceDetail',
      component: () => import('@/presentation/views/workspace/WorkspaceDetailView.vue'),
      props: true,
    },
  ],
};

export default appRoutes;
