// "Bitenleri Gizle" on made-up datasets: the real sidebar, navigation and stores,
// with the repositories faked in memory. ?mode=labeling | tissue | none picks the
// tab. The data holds the cases that went wrong before:
//   - a patient with 25 images whose newest 20 are finished (the API pages by 20),
//   - a page of patients that is finished from top to bottom,
//   - a finished dataset, and a new one without images that must stay listed.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import '@/assets/main.css';
import 'vue-toastification/dist/index.css';
import { Image } from '@/core/entities/Image';
import { Patient } from '@/core/entities/Patient';
import { User } from '@/core/entities/User';
import { Workspace } from '@/core/entities/Workspace';
import type { TissueMaskStatus } from '@/core/entities/TissueMask';
import type { CompletionMode } from '@/core/completion';
import { i18n } from '@/i18n';
import { repositories } from '@/services';
import { useAuthStore } from '@/stores/auth';
import FinishedHarness from './FinishedHarness.vue';

const wait = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const now = '2026-09-01T10:00:00Z';

const workspaces = [
  { id: 'ws-active', name: 'Aktif veri seti' },
  { id: 'ws-done', name: 'Bitmiş veri seti' },
  { id: 'ws-empty', name: 'Yeni boş veri seti' },
].map((ws) => ({
  ...ws,
  creator_id: 'u1',
  organ_type: 'prostate',
  organization: 'Deneme',
  description: '',
  license: 'CC',
  annotation_type_ids: [],
  created_at: now,
  updated_at: now,
}));

const patients: any[] = [];
const images: any[] = [];
export const masks = new Map<string, TissueMaskStatus>();

function addPatient(wsId: string, name: string, shots: { done?: boolean; mask?: TissueMaskStatus; small?: boolean }[]) {
  const id = `${wsId}-p${patients.filter((p) => p.parent.id === wsId).length}`;
  patients.push({ id, name, creator_id: 'u1', parent: { id: wsId, type: 'workspace' }, created_at: now, updated_at: now });
  shots.forEach((shot, i) => {
    const imageId = `${id}-img${i}`;
    images.push({
      id: imageId,
      ws_id: wsId,
      parent: { id, type: 'patient' },
      creator_id: 'u1',
      name: `${name} / ${String(i + 1).padStart(2, '0')}.svs`,
      format: 'svs',
      width: shot.small ? 800 : 42000,
      height: shot.small ? 600 : 31000,
      status: 'processed',
      marked_as_completed: !!shot.done,
      created_at: now,
      updated_at: now,
    });
    if (shot.mask) masks.set(imageId, shot.mask);
  });
}

const finishedShot = { done: true, mask: 'approved' as const };
// The API lists newest first; here that is simply the order given.
addPatient('ws-active', '25 görüntü, ilk 20 bitmiş', [
  ...Array.from({ length: 20 }, () => finishedShot),
  ...Array.from({ length: 5 }, () => ({ mask: 'auto' as const })),
]);
addPatient('ws-active', 'Tamamı bitmiş', [finishedShot, finishedShot, { done: true, mask: 'rejected' }]);
addPatient('ws-active', 'Görüntüsüz hasta', []);
addPatient('ws-active', '4 görüntü, 1 bitmiş', [finishedShot, { mask: 'edited' }, {}, { small: true }]);
for (let i = 4; i < 24; i++) addPatient('ws-active', `Bitmiş hasta ${i}`, [finishedShot, finishedShot]);
for (let i = 24; i < 45; i++) addPatient('ws-active', `Devam eden hasta ${i}`, [finishedShot, {}, {}]);
addPatient('ws-done', 'Bitmiş A', [finishedShot, finishedShot]);
addPatient('ws-done', 'Bitmiş B', [finishedShot]);

function page<T>(all: T[], options: any, create: (doc: T) => any) {
  const limit = options?.pagination?.limit ?? 20; // main-service default
  const offset = options?.pagination?.offset ?? 0;
  return {
    data: all.slice(offset, offset + limit).map(create),
    pagination: { limit, offset, total: all.length, has_more: offset + limit < all.length } as any,
  };
}

const repos = repositories as any;
repos.workspace.list = async (options: any) => (await wait(), page(workspaces, options, Workspace.create));
repos.workspace.getById = async (id: string) => Workspace.create(workspaces.find((ws) => ws.id === id));
repos.annotationType.listByParent = async () => ({ data: [], pagination: { limit: 100, offset: 0 } });
repos.patient.listByWorkspace = async (wsId: string, options: any) => (
  await wait(),
  page(patients.filter((p) => p.parent.id === wsId), options, Patient.create)
);
repos.image.listByPatient = async (patientId: string, options: any) => (
  await wait(),
  page(images.filter((img) => img.parent.id === patientId), options, Image.create)
);
repos.image.listByWorkspace = async (wsId: string, options: any) => (
  await wait(),
  page(images.filter((img) => img.ws_id === wsId), options, Image.create)
);
repos.image.update = async (imageId: string, data: any) => {
  await wait();
  const doc = images.find((img) => img.id === imageId);
  Object.assign(doc, data);
  return Image.create(doc);
};
repos.tissueMask.listByWorkspace = async (wsId: string) => (
  await wait(),
  images
    .filter((img) => img.ws_id === wsId && masks.has(img.id))
    .map((img) => ({ imageId: img.id, status: masks.get(img.id)! }))
);
repos.tissueMask.getWorkspaceStats = async () => {
  await wait();
  return workspaces.flatMap((ws) => {
    const needing = images.filter((img) => img.ws_id === ws.id && img.width > 3000);
    const done = needing.filter((img) => ['approved', 'rejected'].includes(masks.get(img.id) ?? '')).length;
    return needing.length
      ? [{ workspaceId: ws.id, totalImages: needing.length, done, remaining: needing.length - done }]
      : [];
  });
};

const param = new URLSearchParams(location.search).get('mode');
const mode: CompletionMode = param === 'tissue' || param === 'none' ? param : 'labeling';

const app = createApp(FinishedHarness, { mode, masks })
  .use(createPinia())
  .use(i18n)
  .use(Toast, { timeout: 1500 });
useAuthStore().user = User.create({
  user_id: 'u1',
  email: 'deneme@ornek.edu.tr',
  display_name: 'Deneme',
  status: 'active',
  role: 'admin',
  admin_approved: true,
  created_at: now,
  updated_at: now,
});
app.mount('#app');
