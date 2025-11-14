import { type RouteRecordRaw } from 'vue-router';

const adminRoutes: RouteRecordRaw = {
  path: '/admin',
  component: () => import('@/presentation/layouts/AdminLayout.vue'),
  meta: { requiresAuth: true, requiresAdmin: true },
  redirect: { name: 'AdminDashboard' },
  children: [
    {
      path: 'dashboard',
      name: 'AdminDashboard',
      component: () => import('@/presentation/views/admin/AdminHomeView.vue'),
    },
    {
      path: 'users',
      name: 'UserManagement',
      component: () => import('@/presentation/views/admin/UserListView.vue'),
    },
  ],
};

export default adminRoutes;
