// The admin user list on 130 made-up users — more than one page of 100, so the
// paged loading is exercised. The admin repository is faked in memory; actions
// change the fake users, nothing leaves the page.
import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory, RouterView } from 'vue-router';
import Toast from 'vue-toastification';
import '@/assets/main.css';
import 'vue-toastification/dist/index.css';
import { User } from '@/core/entities/User';
import { i18n } from '@/i18n';
import UserListView from '@/presentation/views/admin/UserListView.vue';
import { repositories } from '@/services';
import { useAuthStore } from '@/stores/auth';

const FIRST = ['Ayşe', 'Mehmet', 'Zeynep', 'Can', 'Elif', 'Burak', 'Selin', 'Emre', 'İpek', 'Ozan'];
const LAST = [
  'Demir',
  'Kaya',
  'Yıldız',
  'Çelik',
  'Şahin',
  'Aydın',
  'Öztürk',
  'Arslan',
  'Doğan',
  'Koç',
];

const docs = Array.from({ length: 130 }, (_, i) => {
  const status = i % 13 === 0 ? 'pending' : i % 9 === 0 ? 'suspended' : 'active';
  const name = `${FIRST[i % 10]} ${LAST[(i * 7) % 10]}`;
  return {
    user_id: `u${String(i).padStart(3, '0')}`,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${i}@ornek.edu.tr`,
    display_name: name,
    status,
    // Legacy names on purpose: the list must show them as the new groups.
    role: status === 'pending' ? 'unassigned' : i === 1 ? 'admin' : i % 4 === 0 ? 'viewer' : 'user',
    admin_approved: status !== 'pending',
    created_at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    data_access: i % 6 === 0 && status === 'active',
  };
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const find = (uid: string) => docs.find((d) => d.user_id === uid)!;
const admin = repositories.admin;

admin.getAllUsers = async (pagination) => {
  await wait(120);
  const page = docs.slice(pagination.offset, pagination.offset + pagination.limit);
  return { data: page.map((d) => User.create(d)), pagination: { ...pagination } as any };
};
admin.approveUser = async (uid, role) => {
  const doc = find(uid);
  Object.assign(doc, {
    status: 'active',
    admin_approved: true,
    role: doc.role === 'unassigned' ? role : doc.role,
  });
  return User.create(doc);
};
admin.suspendUser = async (uid) =>
  User.create(Object.assign(find(uid), { status: 'suspended', admin_approved: false }));
admin.setRole = async (uid, role) => User.create(Object.assign(find(uid), { role }));
admin.grantDataAccess = async (uid) => User.create(Object.assign(find(uid), { data_access: true }));
admin.revokeDataAccess = async (uid) =>
  User.create(Object.assign(find(uid), { data_access: false }));

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', component: UserListView }],
});

const app = createApp({ render: () => h(RouterView) })
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(Toast, { timeout: 2500 });

// The signed-in admin, so that one card is "one's own" (no group select on it).
useAuthStore().user = User.create(docs[1]!);
app.mount('#app');
