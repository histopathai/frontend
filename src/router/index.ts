import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { Capability } from '@/core/auth/permissions';
import appRoutes from './routes/app.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    /** The route is only for groups with this capability (core/auth/permissions). */
    capability?: Capability;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [appRoutes, authRoutes, adminRoutes],
});

// Global Navigation Guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.user) {
    try {
      await authStore.checkAuth();
    } catch {}
  }

  const isAuthenticated = authStore.isAuthenticated;
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (isAuthenticated && to.matched.some((record) => record.path === '/auth')) {
    return next({ name: 'Home' });
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'Home' });
  }

  // A route a group may not use sends the user home, like an admin route does.
  if (to.meta.capability && !authStore.can(to.meta.capability)) {
    return next({ name: 'Home' });
  }

  return next();
});

export default router;
