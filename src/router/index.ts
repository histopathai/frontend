import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AuthLayout from '@/presentation/layouts/AuthLayout.vue';
import DashboardLayout from '@/presentation/layouts/DashboardLayout.vue';
import AdminLayout from '@/presentation/layouts/AdminLayout.vue';
import RegisterForm from '@/presentation/components/RegisterForm.vue';
import LoginForm from '@/presentation/components/LoginForm.vue';

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

  // --- DASHBOARD ROTALARI (Layout: DashboardLayout) ---
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
  },

  // --- WSI Görüntüleyici Rotası (Layout: DashboardLayout) ---
  {
    path: '/wsi-viewer',
    component: DashboardLayout,
    meta: { requiresAuth: true },
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

router.beforeEach((to, from, next) => {
  // 'requiresAuth' meta bilgisine sahip rotaları kontrol et
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore();

    // Eğer Pinia'da kullanıcı oturumu yoksa (isAuthenticated=false)
    if (!authStore.isAuthenticated) {
      // Kullanıcıyı login sayfasına yönlendir
      next({ name: 'Login' });
    }
    // Eğer rota admin yetkisi gerektiriyorsa VE kullanıcı admin değilse
    else if (to.meta.requiresAdmin && !authStore.isAdmin) {
      // Kullanıcıyı dashboard ana sayfasına yönlendir
      next({ name: 'DashboardHome' });
    }
    // Oturum açıksa ve yetki varsa, gitmesine izin ver
    else {
      next();
    }
  }
  // 'requiresAuth' olmayan rotalar (Login, Register) için
  else {
    next();
  }
});

export default router;
