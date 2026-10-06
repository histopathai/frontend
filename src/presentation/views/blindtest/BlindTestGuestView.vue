<template>
  <div class="flex h-screen flex-col bg-gray-50">
    <header
      class="flex h-[49px] flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6"
    >
      <span class="text-lg font-bold text-indigo-600">HistopathAI</span>
      <span class="text-sm text-gray-500">Kör Test</span>
      <template v-if="session">
        <span class="ml-auto text-sm text-gray-700"
          >Katılımcı: <strong>{{ session.name }}</strong></span
        >
        <button class="text-sm text-gray-500 hover:underline" @click="forget">
          Bu cihazda çıkış yap
        </button>
      </template>
    </header>

    <main class="min-h-0 flex-1">
      <div
        v-if="state === 'loading'"
        class="flex h-full items-center justify-center text-sm text-gray-500"
      >
        Yükleniyor…
      </div>

      <BlindTestTake v-else-if="state === 'test' && test && api" :test="test" :api="api" />

      <div v-else class="flex h-full items-start justify-center overflow-y-auto p-6">
        <div class="w-full max-w-lg space-y-4">
          <div
            v-if="state === 'invalid'"
            class="rounded-lg border border-gray-200 bg-white p-6 text-center"
          >
            <h1 class="text-lg font-semibold text-gray-900">Bu davet linki geçersiz</h1>
            <p class="mt-2 text-sm text-gray-600">Linki size gönderen kişiyle iletişime geçin.</p>
          </div>
          <div
            v-else-if="state === 'closed'"
            class="rounded-lg border border-gray-200 bg-white p-6 text-center"
          >
            <h1 class="text-lg font-semibold text-gray-900">Bu davet linki kapatılmış</h1>
            <p class="mt-2 text-sm text-gray-600">Test artık bu link üzerinden yapılamıyor.</p>
          </div>

          <div v-else-if="!info" class="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p class="text-sm text-red-700">{{ error || 'Davet bilgisi alınamadı.' }}</p>
            <button
              class="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              @click="retry"
            >
              Tekrar dene
            </button>
          </div>

          <template v-else>
            <div class="rounded-lg border border-gray-200 bg-white p-6">
              <h1 class="text-lg font-semibold text-gray-900">Kör test: {{ info.setName }}</h1>
              <p class="mt-1 text-sm text-gray-600">
                {{ info.images }} doku görüntüsü göreceksiniz; bir kısmı gerçek, bir kısmı yapay
                zeka ile üretilmiş sentetik görüntülerdir. Her biri için "Gerçek" ya da "Sentetik"
                deyin; isterseniz kararınızı bir notla açıklayın. Cevaplarınız anında kaydedilir;
                testi istediğiniz zaman bırakıp aynı linkle kaldığınız yerden devam edebilirsiniz.
              </p>
            </div>

            <div class="rounded-lg border border-gray-200 bg-white">
              <div class="flex border-b border-gray-200 text-sm">
                <button
                  class="flex-1 px-4 py-3 font-medium"
                  :class="
                    tab === 'join'
                      ? 'border-b-2 border-indigo-600 text-indigo-700'
                      : 'text-gray-500'
                  "
                  @click="tab = 'join'"
                >
                  İlk kez katılıyorum
                </button>
                <button
                  class="flex-1 px-4 py-3 font-medium"
                  :class="
                    tab === 'resume'
                      ? 'border-b-2 border-indigo-600 text-indigo-700'
                      : 'text-gray-500'
                  "
                  @click="tab = 'resume'"
                >
                  Daha önce başladım
                </button>
              </div>

              <!-- Katıl -->
              <form v-if="tab === 'join'" class="space-y-4 p-6" @submit.prevent="join">
                <p
                  v-if="!info.joinable"
                  class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  {{
                    info.expired
                      ? 'Bu linkin yeni katılım süresi doldu.'
                      : 'Bu linkin katılımcı sınırı doldu.'
                  }}
                  Daha önce başladıysanız "Daha önce başladım" ile devam edebilirsiniz.
                </p>
                <template v-else>
                  <label class="block text-sm">
                    <span class="text-gray-700">Ad Soyad *</span>
                    <input
                      v-model="form.name"
                      required
                      maxlength="80"
                      autocomplete="name"
                      class="mt-1 w-full rounded-md border-gray-300"
                    />
                    <span class="text-xs text-gray-500"
                      >Sonuçlarda bu adla görünürsünüz; devam ederken de bu adı yazacaksınız.</span
                    >
                  </label>
                  <label class="block text-sm">
                    <span class="text-gray-700">Kurum</span>
                    <input
                      v-model="form.institution"
                      maxlength="120"
                      class="mt-1 w-full rounded-md border-gray-300"
                    />
                  </label>
                  <label class="block text-sm">
                    <span class="text-gray-700">Patolojide deneyim (yıl)</span>
                    <input
                      v-model.number="form.experience"
                      type="number"
                      min="0"
                      max="70"
                      class="mt-1 w-32 rounded-md border-gray-300"
                    />
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <label class="block text-sm">
                      <span class="text-gray-700">4 haneli PIN *</span>
                      <input
                        v-model="form.pin"
                        required
                        type="password"
                        inputmode="numeric"
                        pattern="[0-9]{4}"
                        maxlength="4"
                        autocomplete="new-password"
                        class="mt-1 w-full rounded-md border-gray-300 tracking-widest"
                      />
                    </label>
                    <label class="block text-sm">
                      <span class="text-gray-700">PIN tekrar *</span>
                      <input
                        v-model="form.pin2"
                        required
                        type="password"
                        inputmode="numeric"
                        pattern="[0-9]{4}"
                        maxlength="4"
                        autocomplete="new-password"
                        class="mt-1 w-full rounded-md border-gray-300 tracking-widest"
                      />
                    </label>
                  </div>
                  <p class="text-xs text-gray-500">
                    PIN'i başka bir cihazdan devam etmek için kullanacaksınız; bir yere not edin.
                  </p>
                  <label class="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      v-model="form.consent"
                      type="checkbox"
                      class="mt-0.5 rounded border-gray-300"
                    />
                    <span>
                      Adımın, kurumumun, deneyim yılımın, cevaplarımın ve notlarımın yalnızca bu
                      araştırma kapsamında (sentetik histopatoloji görüntülerinin gerçekçiliğinin
                      değerlendirilmesi) kaydedilip kullanılmasını kabul ediyorum.
                    </span>
                  </label>
                  <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {{ error }}
                  </p>
                  <button
                    type="submit"
                    class="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
                    :disabled="sending"
                  >
                    {{ sending ? 'Gönderiliyor…' : 'Teste başla' }}
                  </button>
                </template>
              </form>

              <!-- Devam et -->
              <form v-else class="space-y-4 p-6" @submit.prevent="resume">
                <label class="block text-sm">
                  <span class="text-gray-700">Ad Soyad</span>
                  <input
                    v-model="form.name"
                    required
                    maxlength="80"
                    autocomplete="name"
                    class="mt-1 w-full rounded-md border-gray-300"
                  />
                </label>
                <label class="block text-sm">
                  <span class="text-gray-700">PIN</span>
                  <input
                    v-model="form.pin"
                    required
                    type="password"
                    inputmode="numeric"
                    pattern="[0-9]{4}"
                    maxlength="4"
                    autocomplete="current-password"
                    class="mt-1 w-32 rounded-md border-gray-300 tracking-widest"
                  />
                </label>
                <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {{ error }}
                </p>
                <button
                  type="submit"
                  class="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
                  :disabled="sending"
                >
                  {{ sending ? 'Kontrol ediliyor…' : 'Devam et' }}
                </button>
              </form>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import BlindTestTake from '@/presentation/components/blindtest/BlindTestTake.vue';
import { repositories } from '@/services';
import type {
  BlindTest,
  BlindTestGuestError,
  BlindTestInviteInfo,
  BlindTestParticipantApi,
} from '@/core/repositories/IBlindTestRepository';

const props = defineProps<{ token: string }>();

const repo = repositories.blindTestGuest(props.token);
const storageKey = `histopathai.blind-test.${props.token}`;

const state = ref<'loading' | 'invalid' | 'closed' | 'form' | 'test'>('loading');
const info = ref<BlindTestInviteInfo | null>(null);
const tab = ref<'join' | 'resume'>('join');
const session = ref<{ token: string; name: string } | null>(null);
const test = ref<BlindTest | null>(null);
const api = ref<BlindTestParticipantApi | null>(null);
const sending = ref(false);
const error = ref('');
const form = reactive({
  name: '',
  institution: '',
  experience: null as number | null,
  pin: '',
  pin2: '',
  consent: false,
});

function saved(): { token: string; name: string } | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    return null;
  }
}

function save(s: { token: string; name: string } | null) {
  try {
    if (s) localStorage.setItem(storageKey, JSON.stringify(s));
    else localStorage.removeItem(storageKey);
  } catch {
    // tarayıcı saklamaya izin vermiyorsa her girişte ad + PIN istenir
  }
}

function message(e: BlindTestGuestError): string {
  switch (e.code) {
    case 'name_invalid':
      return 'Ad en az 2, en fazla 80 karakter olmalı ve harf içermeli.';
    case 'pin_invalid':
      return 'PIN 4 rakamdan oluşmalı.';
    case 'consent_required':
      return 'Devam etmek için onay kutusunu işaretleyin.';
    case 'experience_invalid':
      return 'Deneyim yılı 0 ile 70 arasında olmalı.';
    case 'institution_invalid':
      return 'Kurum adı en fazla 120 karakter olabilir.';
    case 'name_taken':
      return "Bu adla daha önce katılım yapılmış. Siz iseniz PIN'inizi girerek devam edin.";
    case 'invite_full':
      return 'Bu linkin katılımcı sınırı doldu.';
    case 'invite_expired':
      return 'Bu linkin yeni katılım süresi doldu.';
    case 'wrong_credentials':
      return e.details.attempts_left !== undefined
        ? `Ad veya PIN hatalı. Kalan deneme: ${e.details.attempts_left}.`
        : 'Ad veya PIN hatalı.';
    case 'locked': {
      const until = e.details.locked_until ? new Date(e.details.locked_until) : null;
      return `Çok fazla hatalı deneme. ${until ? until.toLocaleTimeString('tr-TR', { timeStyle: 'short' }) + "'e kadar" : 'Bir süre'} bekleyip tekrar deneyin.`;
    }
    case 'network':
      return 'Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.';
    default:
      return e.message || 'Bir hata oluştu.';
  }
}

async function open(s: { token: string; name: string }) {
  const loaded = await repo.test(s.token);
  session.value = s;
  test.value = loaded.test;
  api.value = loaded.api;
  state.value = 'test';
}

async function start() {
  try {
    info.value = await repo.info();
  } catch (e: any) {
    state.value = e?.status === 404 ? 'invalid' : 'form';
    if (e?.status !== 404) error.value = message(e);
    return;
  }
  if (info.value.closed) {
    state.value = 'closed';
    return;
  }
  const s = saved();
  if (s) {
    try {
      await open(s);
      return;
    } catch (e: any) {
      if (e?.code === 'invite_closed') {
        state.value = 'closed';
        return;
      }
      save(null); // bu cihazın oturumu geçersiz: ad + PIN ile devam edilir
      form.name = s.name;
      tab.value = 'resume';
    }
  } else if (!info.value.joinable) {
    tab.value = 'resume';
  }
  state.value = 'form';
}

async function join() {
  error.value = '';
  if (form.pin !== form.pin2) {
    error.value = "PIN'ler aynı değil.";
    return;
  }
  sending.value = true;
  try {
    const s = await repo.join({
      name: form.name,
      pin: form.pin,
      institution: form.institution,
      experienceYears:
        form.experience === null || (form.experience as any) === '' ? null : form.experience,
      consent: form.consent,
    });
    const stored = { token: s.sessionToken, name: s.name };
    save(stored);
    await open(stored);
  } catch (e: any) {
    error.value = message(e);
    if (e?.code === 'name_taken') {
      tab.value = 'resume';
      form.pin = form.pin2 = '';
    }
  } finally {
    sending.value = false;
  }
}

async function resume() {
  error.value = '';
  sending.value = true;
  try {
    const s = await repo.resume(form.name, form.pin);
    const stored = { token: s.sessionToken, name: s.name };
    save(stored);
    await open(stored);
  } catch (e: any) {
    if (e?.code === 'invite_closed') state.value = 'closed';
    else error.value = message(e);
  } finally {
    sending.value = false;
  }
}

function forget() {
  if (
    !confirm(
      "Bu cihazda çıkış yapılsın mı? Cevaplarınız kayıtlı kalır; tekrar girmek için adınız ve PIN'iniz gerekir."
    )
  )
    return;
  save(null);
  session.value = null;
  test.value = null;
  api.value = null;
  form.pin = form.pin2 = '';
  tab.value = 'resume';
  state.value = 'form';
}

function retry() {
  error.value = '';
  state.value = 'loading';
  start();
}

onMounted(start);
</script>
