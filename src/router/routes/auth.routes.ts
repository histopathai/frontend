import { type RouteRecordRaw } from 'vue-router';

const authRoutes: RouteRecordRaw = {
  path: '/auth',
  component: () => import('@/presentation/layouts/AuthLayout.vue'),
  redirect: { name: 'Login' },
  children: [
    {
      path: 'login',
      name: 'Login',
      component: () => import('@/presentation/views/auth/LoginView.vue'),
    },
    {
      path: 'register',
      name: 'Register',
      component: () => import('@/presentation/views/auth/RegisterView.vue'),
    },
    {
      path: 'forgot-password',
      name: 'ForgotPassword',
      component: () => import('@/presentation/views/auth/ForgotPasswordView.vue'),
    },
  ],
};

export default authRoutes;
