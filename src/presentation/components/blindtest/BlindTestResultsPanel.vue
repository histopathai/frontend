<template>
  <div class="h-full overflow-y-auto bg-gray-50">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ results.name }} — sonuçlar</h2>
          <p class="text-sm text-gray-500">
            Yalnızca admin görür. Model koşusu: <span class="font-mono">{{ results.runId }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="exportUsers"
          >
            Katılımcılar CSV
          </button>
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="exportImages"
          >
            Görseller CSV
          </button>
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="exportNotes"
          >
            Notlar CSV ({{ noteCount }})
          </button>
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Her satır: bir katılımcının, kendi sırasındaki bir görsele cevabı"
            @click="exportAnswers"
          >
            Cevaplar CSV
          </button>
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="$emit('refresh')"
          >
            Yenile
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-6 p-6">
      <!-- Özet -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">
          Havuzlanmış sonuç (tamamlayan {{ completedCount }} katılımcı,
          {{ results.pooled.answered }} cevap)
        </h3>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">Doğru ayırt etme</div>
            <div class="text-2xl font-semibold tabular-nums">
              {{ pct(results.pooled.accuracy) }}
            </div>
            <div class="text-xs text-gray-500">şans düzeyi %50</div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">p (şansa karşı, iki yönlü binom)</div>
            <div class="text-2xl font-semibold tabular-nums">{{ pval(results.pooled.pValue) }}</div>
            <div class="text-xs text-gray-500">
              {{
                results.pooled.pValue < 0.05 ? 'şanstan anlamlı farklı' : 'şanstan ayırt edilemiyor'
              }}
            </div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">κ — cevaplar ile gerçek etiket (Cohen)</div>
            <div class="text-2xl font-semibold tabular-nums">{{ kfmt(pooledKappa) }}</div>
            <div class="text-xs text-gray-500">{{ kappaLabel(pooledKappa) }}; 0 = şans düzeyi</div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">κ — katılımcılar arası uyum (Fleiss)</div>
            <div class="text-2xl font-semibold tabular-nums">{{ kfmt(fleiss.kappa) }}</div>
            <div class="text-xs text-gray-500">
              {{
                fleiss.kappa === null
                  ? 'en az 2 tamamlanmış test gerekir'
                  : `${kappaLabel(fleiss.kappa)}; ${fleiss.raters} kişi, ${fleiss.images} görsel`
              }}
            </div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">Sentetiklerin "gerçek" sanılma oranı</div>
            <div class="text-2xl font-semibold tabular-nums">
              {{ pct(results.pooled.syntheticCalledReal) }}
            </div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">Karışıklık matrisi (satır: doğru, sütun: cevap)</div>
            <table class="mt-1 text-sm tabular-nums">
              <tbody>
                <tr class="text-xs text-gray-500">
                  <td></td>
                  <td class="px-2">gerçek</td>
                  <td class="px-2">sentetik</td>
                </tr>
                <tr>
                  <td class="pr-2 text-xs text-gray-500">gerçek</td>
                  <td class="px-2">{{ results.pooled.confusion.realAsReal }}</td>
                  <td class="px-2">{{ results.pooled.confusion.realAsSynthetic }}</td>
                </tr>
                <tr>
                  <td class="pr-2 text-xs text-gray-500">sentetik</td>
                  <td class="px-2">{{ results.pooled.confusion.syntheticAsReal }}</td>
                  <td class="px-2">{{ results.pooled.confusion.syntheticAsSynthetic }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Yorumlama -->
      <details
        open
        class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-gray-700"
      >
        <summary class="cursor-pointer font-semibold text-gray-800">
          Bu değerler nasıl yorumlanır?
        </summary>
        <div class="mt-2 space-y-2">
          <p>
            <strong>Doğru ayırt etme (doğruluk):</strong> cevapların gerçek etiketle uyuşma oranı.
            <strong>%50 şans düzeyidir</strong> — yazı-tura atan biri de ortalama %50 tutturur.
            Doğruluk %50'ye yakınsa uzman gerçek ile sentetiği <em>ayırt edemiyor</em> demektir;
            hedeflenen sonuç budur. %50'nin belirgin üstü, sentetik görüntülerin tanınabildiğini
            gösterir. %50'nin belirgin altı ise sistematik ters karar demektir (ör. sentetikleri
            gerçeklerden daha "gerçek" bulmak) — bu da görüntülerin ayırt edilebildiğini, ama ters
            yönde, gösterir.
          </p>
          <p>
            <strong>p değeri:</strong> kişi gerçekte ayırt edemiyor olsaydı (gerçek doğruluk %50),
            yalnızca şans eseri bu kadar ya da daha uç bir doğruluk çıkma olasılığı (iki yönlü binom
            testi). <strong>p &lt; 0.05</strong>: sonuç şansla açıklanamaz; doğruluk %50'nin
            üstündeyse ayırt edebiliyor, altındaysa sistematik yanılıyor. <strong>p ≥ 0.05</strong>:
            şanstan ayırt edilemiyor. Bu "kesinlikle ayırt edemiyor" demek değildir; az cevapla
            (yarım kalmış testler) test zayıftır. Örnek: 200 cevapta p &lt; 0.05 için en az 115
            doğru (%57,5) ya da en fazla 85 doğru (%42,5) gerekir; 100 cevapta %61 / %39.
          </p>
          <p>
            <strong>Sentetik → gerçek oranı:</strong> sentetik görüntülerin "gerçek" sanılma payı.
            %50 civarı sentetiklerin gerçeklerden ayrılamadığını, yüksek değer modelin özellikle
            inandırıcı olduğunu, düşük değer sentetiklerin kolayca yakalandığını gösterir.
            Karışıklık matrisi aynı cevapları dört hücreye ayırır (doğru etiket → verilen cevap).
          </p>
          <p>
            <strong>κ (kappa):</strong> şansın ötesindeki uyumu ölçer;
            <strong>0 = şans düzeyi</strong>, 1 = tam uyum, eksi değer = sistematik ters uyum. Yorum
            (Landis &amp; Koch): 0–0,20 çok zayıf, 0,21–0,40 zayıf, 0,41–0,60 orta, 0,61–0,80 iyi,
            0,81–1 neredeyse tam. <em>Cevaplar ile gerçek etiket</em> arasındaki κ (Cohen)
            doğruluğun şansa göre düzeltilmiş hâlidir; setler dengeli (yarı gerçek, yarı sentetik)
            olduğundan tamamlanmış bir testte κ = 2 × doğruluk − 1'dir — bu testte hedeflenen κ ≈
            0'dır. <em>Katılımcılar arası</em> κ (Fleiss) gerçek etiketten bağımsızdır: patologların
            hangi görüntüyü gerçek / sentetik bulduklarında birbirleriyle ne kadar hemfikir
            olduklarını gösterir. Doğruluk ~%50 iken katılımcılar arası κ yüksekse, patologlar ortak
            bir görsel ipucuna göre karar veriyor ama bu ipucu gerçek–sentetik ayrımıyla örtüşmüyor
            demektir. Yalnızca tamamlanmış testlerden hesaplanır.
          </p>
          <p class="text-xs text-gray-500">
            Havuzlanmış sonuç tüm tamamlanmış testlerin cevaplarını birleştirir; kişiler arası
            farkları değil grubun genel ayırt etme gücünü gösterir. Kişi bazında yorum için
            Katılımcılar tablosuna bakın.
          </p>
        </div>
      </details>

      <!-- Katılımcılar -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Katılımcılar</h3>
        <p class="mb-2 text-xs text-gray-500">
          Her satır o kullanıcının kendi cevaplarından hesaplanır; yarım kalan testler de kendi
          satırında görünür (havuzlanmış sonuca yalnızca tamamlananlar girer).
        </p>
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table class="min-w-full whitespace-nowrap text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Kullanıcı</th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Rol</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">Cevap</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">Doğru</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">Doğruluk</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">p</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">κ (gerçeğe karşı)</th>
                <th colspan="4" class="border-x border-gray-200 px-3 pt-2 text-center">
                  Karışıklık matrisi (doğru → cevap)
                </th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">
                  Sentetik → gerçek oranı
                </th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Başladı</th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Son cevap</th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Durum</th>
              </tr>
              <tr>
                <th class="border-l border-gray-200 px-3 pb-2 text-right">gerçek → gerçek</th>
                <th class="px-3 pb-2 text-right">gerçek → sentetik</th>
                <th class="px-3 pb-2 text-right">sentetik → gerçek</th>
                <th class="border-r border-gray-200 px-3 pb-2 text-right">sentetik → sentetik</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="u in results.users" :key="u.userId">
                <td class="px-3 py-2">
                  <div class="font-medium text-gray-900">{{ userLabel(u.userId).name }}</div>
                  <div v-if="userLabel(u.userId).email" class="text-xs text-gray-500">
                    {{ userLabel(u.userId).email }}
                  </div>
                  <div class="font-mono text-xs text-gray-400">{{ u.userId }}</div>
                </td>
                <td class="px-3 py-2">{{ roleText(u.userRole) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ u.score.answered }} / {{ total }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{{ u.score.correct }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ pct(u.score.accuracy) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ pval(u.score.pValue) }}</td>
                <td
                  class="px-3 py-2 text-right tabular-nums"
                  :title="kappaLabel(cohenKappa(u.score.confusion))"
                >
                  {{ kfmt(cohenKappa(u.score.confusion)) }}
                </td>
                <td class="border-l border-gray-100 px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.realAsReal }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.realAsSynthetic }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.syntheticAsReal }}
                </td>
                <td class="border-r border-gray-100 px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.syntheticAsSynthetic }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ pct(u.score.syntheticCalledReal) }}
                </td>
                <td class="px-3 py-2 tabular-nums">{{ date(u.startedAt) }}</td>
                <td class="px-3 py-2 tabular-nums">{{ date(u.updatedAt) }}</td>
                <td class="px-3 py-2">
                  <span
                    class="rounded px-2 py-0.5 text-xs"
                    :class="
                      u.completedAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    "
                  >
                    {{ u.completedAt ? `tamamladı ${date(u.completedAt)}` : 'devam ediyor' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!results.users.length">
                <td colspan="15" class="px-3 py-6 text-center text-gray-500">
                  Henüz katılımcı yok.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Görseller -->
      <section>
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-gray-700">
            Görseller (oylar yalnızca tamamlanmış testlerden; notlar tüm katılımcılardan — ayrıntı
            ve notlar için görsele tıklayın)
          </h3>
          <div class="flex items-center gap-2 text-sm">
            <label class="flex items-center gap-1 text-gray-600">
              <input v-model="onlyNoted" type="checkbox" class="rounded border-gray-300" />
              Yalnızca notlu
            </label>
            <select v-model="labelFilter" class="rounded-md border-gray-300 py-1 text-sm">
              <option value="all">Tümü</option>
              <option value="real">Gerçek</option>
              <option value="synthetic">Sentetik</option>
            </select>
            <select v-model="sortBy" class="rounded-md border-gray-300 py-1 text-sm">
              <option value="order">Set sırası</option>
              <option value="fooled">En çok yanıltan önce</option>
              <option value="participant" :disabled="!results.users.length">
                Katılımcının sırası
              </option>
            </select>
            <select
              v-if="sortBy === 'participant'"
              v-model="orderOf"
              class="max-w-56 rounded-md border-gray-300 py-1 text-sm"
            >
              <option v-for="u in results.users" :key="u.userId" :value="u.userId">
                {{ userLabel(u.userId).name }}
              </option>
            </select>
          </div>
        </div>
        <div v-if="participant" class="mb-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <div class="text-gray-700">
            <strong>{{ userLabel(participant.userId).name }}</strong> görselleri bu sırayla gördü
            ({{ participant.score.answered }} / {{ total }} cevaplı,
            {{ participant.completedAt ? 'test tamamlandı' : 'test devam ediyor' }}). Kartlarda sıra
            numarası ve bu kişinin cevabı var.
          </div>
          <div class="mt-2 text-xs text-gray-500">
            Sıraya göre doğruluk (20'şer görsel; testin sonuna doğru değişiyorsa yorgunluk ya da
            öğrenme etkisi olabilir):
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <span
              v-for="b in participantBlocks"
              :key="b.from"
              class="rounded bg-gray-100 px-2 py-0.5 text-xs tabular-nums text-gray-700"
              :title="`${b.correct} / ${b.answered} doğru`"
            >
              {{ b.from }}–{{ b.to }}: {{ b.accuracy === null ? '—' : pct(b.accuracy) }}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          <button
            v-for="img in shownImages"
            :key="img.imageId"
            class="overflow-hidden rounded-md border border-gray-200 bg-white text-left hover:ring-2 hover:ring-indigo-300"
            :title="sourceText(img)"
            @click="detail = img"
          >
            <div class="relative aspect-square bg-gray-100">
              <span
                v-if="participant"
                class="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
                >#{{ position[img.imageId] }}</span
              >
              <span
                v-if="img.notes.length"
                class="absolute right-1 top-1 rounded bg-amber-400 px-1.5 text-xs font-medium text-gray-900"
                >{{ img.notes.length }} not</span
              >
              <img
                v-if="urls[img.imageId]"
                :src="urls[img.imageId]"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="flex items-center justify-between px-1.5 py-1 text-xs">
              <span
                class="rounded px-1.5 py-0.5 font-medium"
                :class="
                  img.label === 'real'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-fuchsia-100 text-fuchsia-800'
                "
              >
                {{ img.label === 'real' ? 'gerçek' : 'sentetik' }}
              </span>
              <span class="tabular-nums text-gray-600" title="gerçek / sentetik oyu">
                {{ img.votedReal }}G · {{ img.votedSynthetic }}S
              </span>
            </div>
            <div
              v-if="participant"
              class="flex items-center justify-between border-t border-gray-100 px-1.5 py-1 text-xs"
            >
              <span
                class="rounded px-1.5 py-0.5"
                :class="
                  !participant.answers[img.imageId]
                    ? 'bg-gray-100 text-gray-500'
                    : participant.answers[img.imageId] === img.label
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                "
              >
                {{
                  !participant.answers[img.imageId]
                    ? 'cevapsız'
                    : `${participant.answers[img.imageId] === 'real' ? 'gerçek' : 'sentetik'} ${
                        participant.answers[img.imageId] === img.label ? '✓' : '✗'
                      }`
                }}
              </span>
              <span
                v-if="img.notes.some((n) => n.userId === participant!.userId)"
                class="text-amber-700"
                title="Bu kişinin notu var"
                >not</span
              >
            </div>
          </button>
        </div>
      </section>
    </div>

    <!-- Görsel ayrıntısı ve notlar -->
    <div
      v-if="detail"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="detail = null"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-4xl gap-5 overflow-hidden rounded-lg bg-white p-5 shadow-xl"
      >
        <div class="w-72 flex-shrink-0 space-y-2 text-sm">
          <img
            v-if="urls[detail.imageId]"
            :src="urls[detail.imageId]"
            class="aspect-square w-full rounded object-cover"
          />
          <div>
            <span
              class="rounded px-1.5 py-0.5 text-xs font-medium"
              :class="
                detail.label === 'real'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-fuchsia-100 text-fuchsia-800'
              "
            >
              {{ detail.label === 'real' ? 'gerçek' : 'sentetik' }}
            </span>
            <span class="ml-2 tabular-nums text-gray-600">
              oylar: {{ detail.votedReal }} gerçek · {{ detail.votedSynthetic }} sentetik
            </span>
          </div>
          <dl class="text-xs text-gray-500">
            <template v-for="(v, k) in detail.source" :key="k">
              <dt class="inline font-medium">{{ k }}:</dt>
              <dd class="mb-0.5 ml-1 inline break-all font-mono">{{ v }}</dd>
              <br />
            </template>
          </dl>
          <div class="font-mono text-xs text-gray-400">{{ detail.imageId }}</div>
        </div>
        <div class="flex min-w-0 flex-1 flex-col">
          <div class="mb-2 flex items-center justify-between">
            <h4 class="font-semibold text-gray-900">Notlar ({{ detail.notes.length }})</h4>
            <button
              class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              @click="detail = null"
            >
              Kapat
            </button>
          </div>
          <p v-if="!detail.notes.length" class="text-sm text-gray-500">
            Bu görsel için not yazılmamış.
          </p>
          <ul class="flex-1 space-y-3 overflow-y-auto pr-1">
            <li
              v-for="n in detail.notes"
              :key="n.userId"
              class="rounded-md border border-gray-200 p-3"
            >
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="font-medium text-gray-900">{{ userLabel(n.userId).name }}</span>
                <span
                  class="rounded px-1.5 py-0.5"
                  :class="
                    !n.answer
                      ? 'bg-gray-100 text-gray-600'
                      : n.answer === detail.label
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                  "
                >
                  cevap: {{ n.answer ? (n.answer === 'real' ? 'gerçek' : 'sentetik') : 'yok' }}
                  {{ n.answer ? (n.answer === detail.label ? '(doğru)' : '(yanlış)') : '' }}
                </span>
                <span class="text-gray-500">{{
                  n.completed ? 'test tamamlandı' : 'test devam ediyor'
                }}</span>
                <span class="ml-auto text-gray-400">{{ date(n.updatedAt) }}</span>
              </div>
              <p class="mt-2 whitespace-pre-wrap text-sm text-gray-800">{{ n.note }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBlindTestImages } from '@/presentation/composables/blindtest/useBlindTestImages';
import { repositories } from '@/services';
import type {
  BlindTestImageResult,
  BlindTestResults,
} from '@/core/repositories/IBlindTestRepository';
import type { User } from '@/core/entities/User';
import { cohenKappa, fleissKappa, kappaLabel } from '@/core/blindtest/kappa';
import { orderBlocks } from '@/core/blindtest/orderEffect';

const props = defineProps<{ results: BlindTestResults; users: Record<string, User> }>();
defineEmits<{ (e: 'refresh'): void }>();

const { urls, load, clear } = useBlindTestImages();
const labelFilter = ref<'all' | 'real' | 'synthetic'>('all');
const sortBy = ref<'order' | 'fooled' | 'participant'>('order');
const orderOf = ref('');
const onlyNoted = ref(false);
const detail = ref<BlindTestImageResult | null>(null);
const noteCount = computed(() => props.results.images.reduce((s, i) => s + i.notes.length, 0));

const total = computed(() => props.results.images.length);
const pooledKappa = computed(() => cohenKappa(props.results.pooled.confusion));
const fleiss = computed(() =>
  fleissKappa(props.results.images.map((i) => ({ real: i.votedReal, synthetic: i.votedSynthetic })))
);
const kfmt = (k: number | null) => (k === null ? '—' : k.toFixed(3));
const completedCount = computed(() => props.results.users.filter((u) => u.completedAt).length);

/** How often an image was taken for the other kind. */
function fooled(img: BlindTestImageResult) {
  return img.label === 'real' ? img.votedSynthetic : img.votedReal;
}

/** The participant whose order the grid follows ("Katılımcının sırası"). */
const participant = computed(() =>
  sortBy.value === 'participant'
    ? (props.results.users.find((u) => u.userId === orderOf.value) ??
      props.results.users[0] ??
      null)
    : null
);
/** 1-based position of each image in that participant's order. */
const position = computed<Record<string, number>>(() =>
  Object.fromEntries((participant.value?.order ?? []).map((id, i) => [id, i + 1]))
);
const truth = computed(() =>
  Object.fromEntries(props.results.images.map((i) => [i.imageId, i.label]))
);
const participantBlocks = computed(() =>
  participant.value
    ? orderBlocks(participant.value.order, participant.value.answers, truth.value)
    : []
);

const shownImages = computed(() => {
  let list = props.results.images.filter(
    (i) =>
      (labelFilter.value === 'all' || i.label === labelFilter.value) &&
      (!onlyNoted.value || i.notes.length > 0)
  );
  if (sortBy.value === 'fooled') list = [...list].sort((a, b) => fooled(b) - fooled(a));
  if (participant.value) {
    const pos = position.value;
    list = [...list].sort((a, b) => (pos[a.imageId] ?? 1e9) - (pos[b.imageId] ?? 1e9));
  }
  return list;
});

watch(sortBy, (v) => {
  if (v === 'participant' && !orderOf.value) orderOf.value = props.results.users[0]?.userId ?? '';
});

watch(
  () => props.results.id,
  () => {
    clear();
    const id = props.results.id;
    load(
      props.results.images.map((i) => i.imageId),
      (imageId) => repositories.blindTest.image(id, imageId)
    );
  },
  { immediate: true }
);

const guests = computed(() =>
  Object.fromEntries(props.results.users.filter((u) => u.guest).map((u) => [u.userId, u.guest!]))
);

/** Name and a second line: e-mail for platform users; "davet linkiyle" for invited guests. */
function userLabel(userId: string) {
  const g = guests.value[userId];
  if (g) return { name: g.name, email: 'davet linkiyle' };
  const u = props.users[userId];
  return u
    ? { name: u.displayName || u.email, email: u.email }
    : { name: '(kullanıcı bulunamadı)', email: '' };
}

const roleText = (role: string) => (role === 'guest' ? 'davetli' : role);

const pct = (x: number) => `%${(100 * (x || 0)).toFixed(1)}`;
const pval = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const date = (s: string) =>
  new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
const sourceText = (img: BlindTestImageResult) =>
  Object.entries(img.source)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

function download(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function exportUsers() {
  const header = [
    'user_id',
    'name',
    'email',
    'role',
    'answered',
    'correct',
    'accuracy',
    'p_value',
    'cohen_kappa',
    'synthetic_called_real',
    'real_as_real',
    'real_as_synthetic',
    'synthetic_as_real',
    'synthetic_as_synthetic',
    'started_at',
    'completed_at',
  ];
  const rows = props.results.users.map((u) => {
    const c = u.score.confusion;
    const user = props.users[u.userId];
    return [
      u.userId,
      u.guest?.name ?? user?.displayName ?? '',
      user?.email ?? '',
      roleText(u.userRole),
      u.score.answered,
      u.score.correct,
      u.score.accuracy,
      u.score.pValue,
      cohenKappa(u.score.confusion) ?? '',
      u.score.syntheticCalledReal,
      c.realAsReal,
      c.realAsSynthetic,
      c.syntheticAsReal,
      c.syntheticAsSynthetic,
      u.startedAt,
      u.completedAt ?? '',
    ];
  });
  download(`${props.results.id}_participants.csv`, [header, ...rows]);
}

/** Long format for order-effect analysis: one row per participant and image, in their own order. */
function exportAnswers() {
  const header = [
    'user_id',
    'name',
    'role',
    'test_completed',
    'position',
    'image_id',
    'label',
    'answer',
    'answer_correct',
  ];
  const rows = props.results.users.flatMap((u) =>
    u.order.map((imageId, i) => {
      const answer = u.answers[imageId] ?? '';
      return [
        u.userId,
        userLabel(u.userId).name,
        roleText(u.userRole),
        String(!!u.completedAt),
        i + 1,
        imageId,
        truth.value[imageId] ?? '',
        answer,
        answer ? String(answer === truth.value[imageId]) : '',
      ];
    })
  );
  download(`${props.results.id}_answers.csv`, [header, ...rows]);
}

function exportNotes() {
  const header = [
    'image_id',
    'label',
    'dataset',
    'user_id',
    'name',
    'email',
    'answer',
    'answer_correct',
    'test_completed',
    'note',
    'updated_at',
  ];
  const rows = props.results.images.flatMap((i) =>
    i.notes.map((n) => {
      const user = props.users[n.userId];
      return [
        i.imageId,
        i.label,
        i.source.dataset ?? '',
        n.userId,
        guests.value[n.userId]?.name ?? user?.displayName ?? '',
        user?.email ?? '',
        n.answer,
        n.answer ? String(n.answer === i.label) : '',
        String(n.completed),
        n.note,
        n.updatedAt,
      ];
    })
  );
  download(`${props.results.id}_notes.csv`, [header, ...rows]);
}

function exportImages() {
  const keys = ['dataset', 'image_id', 'patch_id', 'cond_patch_id', 'seed'];
  const header = [
    'image_id',
    'label',
    'voted_real',
    'voted_synthetic',
    ...keys.map((k) => `source_${k}`),
  ];
  const rows = props.results.images.map((i) => [
    i.imageId,
    i.label,
    i.votedReal,
    i.votedSynthetic,
    ...keys.map((k) => i.source[k] ?? ''),
  ]);
  download(`${props.results.id}_images.csv`, [header, ...rows]);
}
</script>
