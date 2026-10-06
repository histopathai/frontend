<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 41px)">
    <aside class="flex w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div class="border-b border-gray-200 px-4 py-3">
        <h1 class="text-base font-semibold text-gray-900">Kör Test</h1>
        <p class="mt-1 text-xs text-gray-500">
          Görsellerin bir kısmı gerçek doku patch'leri, bir kısmı üretken modelle üretilmiş sentetik
          görüntülerdir.
        </p>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <p v-if="loading" class="px-2 py-4 text-sm text-gray-500">Yükleniyor…</p>
        <p v-else-if="!tests.length" class="px-2 py-4 text-sm text-gray-500">
          Açık bir kör test yok.
        </p>
        <div
          v-for="t in tests"
          :key="t.id"
          class="mb-2 rounded-md border p-3"
          :class="selectedId === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'"
        >
          <button class="w-full text-left" @click="select(t.id, 'take')">
            <div class="flex items-center justify-between">
              <span class="font-medium text-gray-900">{{ t.name }}</span>
              <span
                class="rounded px-1.5 py-0.5 text-xs"
                :class="t.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
              >
                {{ t.completed ? 'tamamlandı' : `${t.answered} / ${t.total}` }}
              </span>
            </div>
            <p class="mt-1 text-xs text-gray-500">{{ t.description }}</p>
          </button>
          <div v-if="isAdmin" class="mt-2 flex gap-3">
            <button
              class="text-xs font-medium text-indigo-600 hover:underline"
              @click="select(t.id, 'results')"
            >
              Sonuçlar (admin)
            </button>
            <button
              class="text-xs font-medium text-indigo-600 hover:underline"
              @click="select(t.id, 'invites')"
            >
              Davet linkleri
            </button>
          </div>
        </div>
      </div>
    </aside>

    <main class="min-w-0 flex-1">
      <div v-if="busy" class="flex h-full items-center justify-center text-sm text-gray-500">
        Yükleniyor…
      </div>
      <BlindTestTake
        v-else-if="mode === 'take' && current"
        :test="current"
        @progress="onProgress"
      />
      <BlindTestInvitesPanel
        v-else-if="mode === 'invites' && selectedId"
        :set-id="selectedId"
        :set-name="tests.find((t) => t.id === selectedId)?.name ?? ''"
      />
      <BlindTestResultsPanel
        v-else-if="mode === 'results' && results"
        :results="results"
        :users="users"
        @refresh="select(selectedId!, 'results')"
      />
      <div v-else class="flex h-full items-center justify-center text-sm text-gray-500">
        Soldan bir test seçin.
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import BlindTestTake from '@/presentation/components/blindtest/BlindTestTake.vue';
import BlindTestResultsPanel from '@/presentation/components/blindtest/BlindTestResultsPanel.vue';
import BlindTestInvitesPanel from '@/presentation/components/blindtest/BlindTestInvitesPanel.vue';
import { repositories } from '@/services';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/core/entities/User';
import type {
  BlindTest,
  BlindTestResults,
  BlindTestSummary,
} from '@/core/repositories/IBlindTestRepository';

const toast = useToast();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);

const tests = ref<BlindTestSummary[]>([]);
const loading = ref(true);
const busy = ref(false);
const selectedId = ref<string | null>(null);
const mode = ref<'take' | 'results' | 'invites'>('take');
const current = ref<BlindTest | null>(null);
const results = ref<BlindTestResults | null>(null);
const users = ref<Record<string, User>>({});

async function loadList() {
  loading.value = true;
  try {
    tests.value = await repositories.blindTest.list();
  } catch (e: any) {
    toast.error(e?.message || 'Kör testler yüklenemedi');
  } finally {
    loading.value = false;
  }
}

/** Katılımcıların ad / e-postası, kimlik başına bir istekle (admin kullanıcı listesi sayfa başına en fazla 100 döner). */
async function loadUsers(ids: string[]) {
  const missing = [...new Set(ids)].filter((id) => !users.value[id]);
  const found = await Promise.allSettled(missing.map((id) => repositories.admin.getUser(id)));
  const next = { ...users.value };
  found.forEach((r, i) => {
    if (r.status === 'fulfilled') next[missing[i]!] = r.value;
  });
  users.value = next; // bulunamayan (ör. silinmiş) kullanıcı kimliğiyle gösterilir
}

async function select(id: string, next: 'take' | 'results' | 'invites') {
  selectedId.value = id;
  mode.value = next;
  busy.value = true;
  try {
    if (next === 'invites') {
      // the panel loads its own links
    } else if (next === 'take') {
      current.value = await repositories.blindTest.get(id);
    } else {
      const r = await repositories.blindTest.results(id);
      await loadUsers(r.users.filter((u) => !u.guest).map((u) => u.userId)); // guests carry their own name
      results.value = r;
    }
  } catch (e: any) {
    toast.error(e?.message || 'Test yüklenemedi');
  } finally {
    busy.value = false;
  }
}

function onProgress(answered: number, completed: boolean) {
  const t = tests.value.find((x) => x.id === selectedId.value);
  if (t) Object.assign(t, { answered, completed });
}

onMounted(loadList);
</script>
