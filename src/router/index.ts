import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AuthLayout from '@/presentation/layouts/AuthLayout.vue';
import DashboardLayout from '@/presentation/layouts/DashboardLayout.vue';
import AdminLayout from '@/presentation/layouts/AdminLayout.vue';
import RegisterForm from '@/presentation/components/auth/RegisterForm.vue';
import LoginForm from '@/presentation/components/auth/LoginForm.vue';

const routes = [
  // --- AUTH ROTALARI (Layout: AuthLayout) ---
  {
    path: '/auth',
    component: AuthLayout,
    redirect: '/auth/login',
    children: [
      { path: 'login', name: 'Login', component: LoginForm },
      { path: 'register', name: 'Register', component: RegisterForm },
    ],
  },

  // --- ADMIN ROTALARI (Layout: AdminLayout) ---
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresActive: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/presentation/views/admin/AdminHomeView.vue'),
        meta: { title: 'Admin Panel' },
      },
      {
        path: 'users', // '/admin/users' rotası
        name: 'UserManagement',
        component: () => import('@/presentation/views/admin/UserListView.vue'),
        meta: { title: 'Kullanıcı Yönetimi' },
      },
    ],
  },

  // --- DASHBOARD ROTALARI (Layout: DashboardLayout) ---
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true, requiresActive: true },
    children: [
      {
        path: '',
        name: 'DashboardHome',
        component: () => import('@/presentation/views/dashboard/HomeView.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/presentation/views/dashboard/ProfileView.vue'),
        meta: { title: 'Profilim' },
      },
      {
        path: 'workspaces',
        name: 'Workspaces',
        component: () => import('@/presentation/views/dashboard/WorkspaceView.vue'),
        meta: { title: 'Çalışma Alanlarım' },
      },
      {
        path: 'wsi-viewer', // '/dashboard/wsi-viewer' olacak
        name: 'WSIViewer',
        component: () => import('@/presentation/views/dashboard/ImageViewerView.vue'),
        meta: {
          title: 'WSI Görüntüleyici',
          fullWidth: true, // Bu, layout'un padding'leri kaldırmasını sağlar
        },
      },
    ],
  },

  // --- GÜNCELLENEN ADMIN ROTASI (Layout: AdminLayout) ---
  {
    path: '/admin',
    component: AdminLayout, // <-- Layout'u AdminLayout olarak değiştir
    meta: { requiresAuth: true, requiresAdmin: true },
  },

  // --- Ana Sayfa Yönlendirmesi ---
  {
    path: '/',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  if (authStore.session && !authStore.user) {
    try {
      await authStore.getProfile();
    } catch (error) {
      await authStore.logout();
      return next({ name: 'Login' });
    }
  }
  const isAuthenticated = authStore.isAuthenticated;
  const isActive = authStore.user?.status.isActive() ?? false;
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      return next({ name: 'Login' });
    }
    if (!isActive) {
      if (to.name !== 'AccountStatus') {
        return next({ name: 'AccountStatus' });
      }
    }
    if (isActive) {
      if (to.meta.requiresAdmin && !authStore.isAdmin) {
        return next({ name: 'DashboardHome' }); // '/dashboard'
      }
    }

    return next();
  }

  if (isAuthenticated && isActive && (to.name === 'Login' || to.name === 'Register')) {
    return next({ name: 'DashboardHome' }); // '/dashboard'
  }
  return next();
});

export default router;
