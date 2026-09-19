<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
      <input
        v-model.trim="search"
        type="search"
        placeholder="Ad veya e-posta ara…"
        class="w-64 rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
      />
    </div>

    <!-- One status at a time: everybody on one page was too crowded to work in -->
    <nav class="mb-5 flex gap-1 border-b border-gray-200" aria-label="Kullanıcı durumu">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors"
        :class="
          tab === t.key
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        "
        @click="setTab(t.key)"
      >
        {{ t.label }}
        <span
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="
            t.key === 'pending' && counts.pending > 0
              ? 'bg-amber-100 text-amber-800'
              : 'bg-gray-100 text-gray-600'
          "
        >
          {{ counts[t.key] }}
        </span>
      </button>
    </nav>

    <div v-if="store.loading && !store.users.length" class="text-center py-10">
      <p>Kullanıcılar yükleniyor...</p>
    </div>

    <div
      v-else-if="store.error && !store.users.length"
      class="card bg-red-50 border-red-200 text-red-800 p-4"
    >
      <p class="font-semibold">Bir hata oluştu:</p>
      <p>{{ store.error }}</p>
    </div>

    <p v-else-if="!visibleUsers.length" class="py-10 text-center text-sm text-gray-500">
      {{ search ? `"${search}" ile eşleşen kullanıcı yok.` : emptyText }}
    </p>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <UserCard
        v-for="user in visibleUsers"
        :key="user.userId"
        :user="user"
        :loading="store.loading"
        :is-self="user.userId === authStore.user?.userId"
        @approve="approveUser"
        @suspend="suspendUser"
        @changeRole="changeRole"
        @toggleDataAccess="toggleDataAccess"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminStore } from '@/stores/admin';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/core/entities/User';
import { UserRole, type UserRoleValue } from '@/core/value-objects/UserRole';

import UserCard from '@/presentation/components/admin/UserCard.vue';

const store = useAdminStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

// A deleted account is gone for good (database and sign-in both), so there is
// no "deleted" tab: suspension is the state that keeps a user out and the record in.
type Tab = 'active' | 'pending' | 'suspended';
const tabs: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Aktif' },
  { key: 'pending', label: 'Onay bekleyen' },
  { key: 'suspended', label: 'Askıya alınmış' },
];
const EMPTY: Record<Tab, string> = {
  active: 'Aktif kullanıcı yok.',
  pending: 'Onay bekleyen kullanıcı yok.',
  suspended: 'Askıya alınmış kullanıcı yok.',
};

const search = ref('');
const chosenTab = ref<Tab | null>(null);

function tabOf(user: User): Tab {
  if (user.status.isSuspended()) return 'suspended';
  return user.status.isActive() ? 'active' : 'pending';
}

const byTab = computed(() => {
  const groups: Record<Tab, User[]> = { active: [], pending: [], suspended: [] };
  for (const user of store.users) groups[tabOf(user)].push(user);
  const name = (u: User) => u.displayName || u.email || '';
  // Whoever is looked for is looked for by name; people waiting are shown newest first, as they arrive.
  groups.active.sort((a, b) => name(a).localeCompare(name(b), 'tr'));
  groups.suspended.sort((a, b) => name(a).localeCompare(name(b), 'tr'));
  groups.pending.sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));
  return groups;
});

const counts = computed(() => ({
  active: byTab.value.active.length,
  pending: byTab.value.pending.length,
  suspended: byTab.value.suspended.length,
}));

// The tab in the address survives a reload and the back button. Without one,
// people waiting for approval come first — that is what needs the admin. The
// default is decided once, when the users arrive: approving the last person in
// the list must not throw the admin onto another tab.
const tab = computed<Tab>(() => {
  const fromUrl = route.query.durum;
  if (chosenTab.value) return chosenTab.value;
  return tabs.some((t) => t.key === fromUrl) ? (fromUrl as Tab) : 'active';
});
const emptyText = computed(() => EMPTY[tab.value]);

function setTab(next: Tab) {
  chosenTab.value = next;
  router.replace({ query: { ...route.query, durum: next } });
}

const visibleUsers = computed(() => {
  const needle = search.value.toLocaleLowerCase('tr');
  const users = byTab.value[tab.value];
  if (!needle) return users;
  return users.filter(
    (u) =>
      (u.displayName || '').toLocaleLowerCase('tr').includes(needle) ||
      (u.email || '').toLocaleLowerCase('tr').includes(needle)
  );
});

onMounted(async () => {
  await store.fetchAllUsers();
  if (!chosenTab.value && !tabs.some((t) => t.key === route.query.durum)) {
    chosenTab.value = counts.value.pending > 0 ? 'pending' : 'active';
  }
});

// A new user arrives with the group picked on their card; reactivating a
// suspended one sends none and they keep the role they had.
async function approveUser(userId: string, role?: 'pathologist' | 'datascientist') {
  const message = role
    ? `Bu kullanıcı "${UserRole.fromString(role).toDisplayString()}" grubuyla onaylanacak. Emin misiniz?`
    : 'Bu kullanıcıyı yeniden aktif etmek istediğinizden emin misiniz?';
  if (confirm(message)) {
    await store.approveUser(userId, role);
  }
}

async function suspendUser(userId: string) {
  if (confirm('Bu kullanıcıyı askıya almak istediğinizden emin misiniz?')) {
    await store.suspendUser(userId);
  }
}

const ROLE_EFFECT: Record<Exclude<UserRoleValue, 'unassigned'>, string> = {
  admin: 'Her yerde okuma-yazma ve bu yönetim paneline erişim kazanır.',
  pathologist: 'Veri etiketleme, doku maskeleri ve patch ızgarasında okuma-yazma yapabilir.',
  datascientist:
    'Veri etiketlemede yalnızca görüntüleyebilir; doku maskeleri ve patch ızgarasında çalışabilir.',
};

async function changeRole(userId: string, role: Exclude<UserRoleValue, 'unassigned'>) {
  const name = UserRole.fromString(role).toDisplayString();
  if (confirm(`Kullanıcının grubu "${name}" olacak.\n\n${ROLE_EFFECT[role]}\n\nEmin misiniz?`)) {
    await store.setRole(userId, role);
  }
}

async function toggleDataAccess(userId: string, grant: boolean) {
  const message = grant
    ? 'Bu kullanıcıya araştırma verisine salt-okunur erişim verilecek. Emin misiniz?'
    : 'Bu kullanıcının araştırma verisine erişimi kaldırılacak. Emin misiniz?';
  if (confirm(message)) {
    await store.setDataAccess(userId, grant);
  }
}
</script>
