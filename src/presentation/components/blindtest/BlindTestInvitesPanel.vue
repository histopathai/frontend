<template>
  <div class="h-full overflow-y-auto bg-gray-50">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-900">{{ setName }} — davet linkleri</h2>
      <p class="mt-1 max-w-3xl text-sm text-gray-500">
        Tek bir linki patologlarla paylaşın: hesap açmadan adlarını yazıp kendi belirledikleri 4
        haneli PIN ile teste başlarlar. Aynı linkle istedikleri zaman kaldıkları yerden devam
        ederler — aynı tarayıcıda doğrudan, başka bir cihazda adları ve PIN'leriyle. Link,
        girdiğiniz kişi sayısına ulaşınca yeni katılım almaz; kapattığınızda kimse (katılmış olanlar
        da) devam edemez. Katılımcılar sonuçlarda "davetli" olarak, verdikleri adla görünür.
      </p>
    </div>

    <div class="space-y-6 p-6">
      <!-- Yeni link -->
      <section class="rounded-lg border border-gray-200 bg-white p-4">
        <h3 class="text-sm font-semibold text-gray-700">Yeni davet linki</h3>
        <div class="mt-3 flex flex-wrap items-end gap-4">
          <label class="text-sm">
            <span class="block text-gray-600">Kişi sınırı</span>
            <input
              v-model.number="newMax"
              type="number"
              min="1"
              max="500"
              class="mt-1 w-28 rounded-md border-gray-300 text-sm"
            />
          </label>
          <label class="text-sm">
            <span class="block text-gray-600">Son katılım tarihi (isteğe bağlı)</span>
            <input
              v-model="newExpiry"
              type="datetime-local"
              class="mt-1 rounded-md border-gray-300 text-sm"
            />
          </label>
          <button
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
            :disabled="creating || !(newMax >= 1 && newMax <= 500)"
            @click="create"
          >
            {{ creating ? 'Oluşturuluyor…' : 'Davet linki oluştur' }}
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          Son tarih yalnızca yeni katılımı durdurur; katılmış olanlar testlerini bitirebilir.
        </p>
      </section>

      <!-- Linkler -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Linkler</h3>
        <p v-if="loading" class="text-sm text-gray-500">Yükleniyor…</p>
        <p v-else-if="!invites.length" class="text-sm text-gray-500">
          Bu set için henüz davet linki yok.
        </p>
        <ul class="space-y-3">
          <li
            v-for="inv in invites"
            :key="inv.id"
            class="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded px-2 py-0.5 text-xs font-medium" :class="status(inv).cls">
                {{ status(inv).text }}
              </span>
              <span class="text-sm tabular-nums text-gray-700">
                {{ inv.participants }} / {{ inv.maxParticipants }} kişi katıldı
              </span>
              <span v-if="inv.expiresAt" class="text-xs text-gray-500"
                >son katılım: {{ date(inv.expiresAt) }}</span
              >
              <span class="ml-auto text-xs text-gray-400"
                >oluşturuldu: {{ date(inv.createdAt) }}</span
              >
            </div>
            <div class="mt-3 flex items-center gap-2">
              <input
                :value="link(inv)"
                readonly
                class="min-w-0 flex-1 rounded-md border-gray-300 bg-gray-50 font-mono text-xs"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <button
                class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                @click="copy(inv)"
              >
                {{ copied === inv.id ? 'Kopyalandı' : 'Kopyala' }}
              </button>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label class="flex items-center gap-2">
                <span class="text-gray-600">Kişi sınırı</span>
                <input
                  v-model.number="maxEdits[inv.id]"
                  type="number"
                  :min="Math.max(1, inv.participants)"
                  max="500"
                  class="w-24 rounded-md border-gray-300 text-sm"
                />
              </label>
              <button
                class="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                :disabled="busy === inv.id || maxEdits[inv.id] === inv.maxParticipants"
                @click="update(inv, { maxParticipants: maxEdits[inv.id] })"
              >
                Sınırı kaydet
              </button>
              <button
                class="ml-auto rounded-md px-3 py-1.5 disabled:opacity-50"
                :class="
                  inv.active ? 'text-red-600 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'
                "
                :disabled="busy === inv.id"
                @click="toggle(inv)"
              >
                {{ inv.active ? 'Linki kapat' : 'Linki yeniden aç' }}
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { repositories } from '@/services';
import type { BlindTestInvite } from '@/core/repositories/IBlindTestRepository';

const props = defineProps<{ setId: string; setName: string }>();

const toast = useToast();
const invites = ref<BlindTestInvite[]>([]);
const loading = ref(true);
const creating = ref(false);
const busy = ref<string | null>(null);
const copied = ref<string | null>(null);
const newMax = ref(10);
const newExpiry = ref('');
const maxEdits = reactive<Record<string, number>>({});

const link = (inv: BlindTestInvite) => `${window.location.origin}/kor-test/katil/${inv.token}`;
const date = (s: string) =>
  new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

function status(inv: BlindTestInvite) {
  if (!inv.active) return { text: 'kapalı', cls: 'bg-gray-200 text-gray-700' };
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date())
    return { text: 'süresi doldu (yeni katılım yok)', cls: 'bg-amber-100 text-amber-800' };
  if (inv.participants >= inv.maxParticipants)
    return { text: 'dolu (yeni katılım yok)', cls: 'bg-amber-100 text-amber-800' };
  return { text: 'açık', cls: 'bg-green-100 text-green-800' };
}

function remember(list: BlindTestInvite[]) {
  invites.value = list;
  for (const inv of list) maxEdits[inv.id] = inv.maxParticipants;
}

async function load() {
  loading.value = true;
  try {
    remember(await repositories.blindTest.listInvites(props.setId));
  } catch (e: any) {
    toast.error(e?.message || 'Davet linkleri yüklenemedi');
  } finally {
    loading.value = false;
  }
}

async function create() {
  creating.value = true;
  try {
    const expiry = newExpiry.value ? new Date(newExpiry.value).toISOString() : null;
    const inv = await repositories.blindTest.createInvite(props.setId, newMax.value, expiry);
    remember([inv, ...invites.value]);
    await copy(inv);
    toast.success('Davet linki oluşturuldu ve panoya kopyalandı');
  } catch (e: any) {
    toast.error(e?.message || 'Davet linki oluşturulamadı');
  } finally {
    creating.value = false;
  }
}

async function update(
  inv: BlindTestInvite,
  change: { active?: boolean; maxParticipants?: number }
) {
  busy.value = inv.id;
  try {
    const next = await repositories.blindTest.updateInvite(props.setId, inv.id, change);
    remember(invites.value.map((i) => (i.id === next.id ? next : i)));
  } catch (e: any) {
    toast.error(e?.message || 'Davet linki güncellenemedi');
    maxEdits[inv.id] = inv.maxParticipants;
  } finally {
    busy.value = null;
  }
}

function toggle(inv: BlindTestInvite) {
  if (inv.active && !confirm('Link kapatılsın mı? Katılmış olanlar da teste devam edemez.')) return;
  update(inv, { active: !inv.active });
}

async function copy(inv: BlindTestInvite) {
  try {
    await navigator.clipboard.writeText(link(inv));
    copied.value = inv.id;
    setTimeout(() => (copied.value = copied.value === inv.id ? null : copied.value), 2000);
  } catch {
    toast.info('Kopyalanamadı; linki kutudan seçip kopyalayın');
  }
}

watch(() => props.setId, load, { immediate: true });
</script>
