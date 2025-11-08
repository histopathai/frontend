import { createRouter, createWebHistory } from 'vue-router';
import AuthLayout from '@/presentation/layouts/AuthLayout.vue';
import DashboardLayout from '@/presentation/layouts/DashboardLayout.vue';
import RegisterForm from '@/presentation/components/RegisterForm.vue';
import LoginForm from '@/presentation/components/LoginForm.vue';

const routes = [
  {
    path: '/auth',
    component: AuthLayout,
    redirect: '/auth/login',
    children: [
      {
        path: 'login',
        name: 'Login',
        component: LoginForm,
      },
      {
        path: 'register',
        name: 'Register',
        component: RegisterForm,
      },
      // TODO: Şifre sıfırlama formu da buraya eklenebilir
      // {
      //   path: 'password-reset',
      //   name: 'PasswordReset',
      //   component: () => import('@/presentation/components/PasswordResetForm.vue')
      // }
    ],
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true }, // Bu rotanın giriş gerektirdiğini belirt
  },
  {
    path: '/',
    redirect: '/auth/login',
  },

  // TODO: Dashboard (Giriş yapıldıktan sonraki) layout'u da buraya eklenecek
  // {
  //   path: '/dashboard',
  //   component: DashboardLayout, // Örn: src/presentation/layouts/DashboardLayout.vue
  //   children: [
  //     // ... (dashboard sayfaları)
  //   ]
  // }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
