import { type RouteRecordRaw } from 'vue-router';

/**
 * Pages for people without a platform account, opened from a shared link.
 * No requiresAuth: the link token and the participant's own session token are
 * checked by main-service.
 */
const guestRoutes: RouteRecordRaw = {
  path: '/kor-test/katil/:token',
  name: 'BlindTestInvite',
  component: () => import('@/presentation/views/blindtest/BlindTestGuestView.vue'),
  props: true,
};

export default guestRoutes;
