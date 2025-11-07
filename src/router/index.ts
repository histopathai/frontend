import { createRouter, createWebHistory } from 'vue-router';
import RegisterForm from '@/presentation/components/RegisterForm.vue';
import LoginForm from '@/presentation/components/LoginForm.vue';

const routes = [
  {
    path: '/',
    redirect: '/auth/login',
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: RegisterForm,
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: LoginForm,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
