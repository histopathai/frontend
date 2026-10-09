// Ek Kontrol on made-up requests: the real tab (RecheckView), with the
// repositories faked in memory; nothing is saved. ?role=pathologist shows the
// expert's view (no "Neden ekle" / "Listeden çıkar"), the default is admin.
// Slide pixels are not served here, so the viewer stays empty.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import '@/assets/main.css';
import 'vue-toastification/dist/index.css';
import { Image } from '@/core/entities/Image';
import { Patient } from '@/core/entities/Patient';
import { User } from '@/core/entities/User';
import { Workspace } from '@/core/entities/Workspace';
import { recheckFromApi, type RecheckRequest } from '@/core/recheck';
import { i18n } from '@/i18n';
import { repositories } from '@/services';
import { useAuthStore } from '@/stores/auth';
import RecheckView from '@/presentation/views/recheck/RecheckView.vue';

const wait = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const now = '2026-10-09T10:00:00Z';

const workspaces = [
  { id: 'ws-bcnb', name: 'BCNB' },
  { id: 'ws-bracs', name: 'BRACS' },
  { id: 'ws-cmb', name: 'CMB-BRCA' },
  { id: 'ws-bcnb2', name: 'BCNB-2' },
].map((ws) => ({
  ...ws,
  creator_id: 'u1',
  organ_type: 'breast',
  organization: 'Deneme',
  description: '',
  license: 'CC',
  annotation_type_ids: [],
  created_at: now,
  updated_at: now,
}));

const images: any[] = [];
const patients: any[] = [];
const store = new Map<string, any>();

function add(wsId: string, imageName: string, patientName: string, reasons: [string, string?][], done = false) {
  const patientId = `${wsId}-p-${patientName}`;
  const imageId = `${wsId}-${imageName}`;
  if (!patients.some((p) => p.id === patientId)) {
    patients.push({ id: patientId, name: patientName, creator_id: 'u1', parent: { id: wsId, type: 'workspace' }, created_at: now, updated_at: now });
  }
  images.push({
    id: imageId, ws_id: wsId, parent: { id: patientId, type: 'patient' }, creator_id: 'u1', name: imageName,
    format: 'svs', width: 42000, height: 31000, status: 'processed', created_at: now, updated_at: now,
  });
  store.set(imageId, {
    image_id: imageId, image_name: imageName, patient_id: patientId, patient_name: patientName, ws_id: wsId,
    status: done ? 'done' : 'open',
    reasons: reasons.map(([code, note]) => ({ code, note: note ?? '', requested_by: 'u1', requested_at: now })),
    created_at: now, updated_at: now, completed_by: done ? 'u2' : '', completed_at: done ? now : null,
  });
}

add('ws-bcnb', '24.jpg', '24', [['subtype']]);
add('ws-bcnb', '140.jpg', '140', [['subtype']]);
add('ws-bcnb', '4.jpg', '4', [['subtype', 'Klinik tabloda IDC/ILC dışında bir tip olabilir']]);
add('ws-bcnb', '60.jpg', '60', [['subtype']], true);
add('ws-bracs', 'BRACS_1367', 'BRACS_1367', [['polygon']]);
add('ws-bracs', 'BRACS_1272', 'BRACS_1272', [['polygon', 'Sınır atipik ve benign alanları da içine alıyor olabilir']]);
add('ws-cmb', 'MSB-06801-03-01.svs', 'Patient_0071', [['global_label_missing']]);
add('ws-cmb', 'MSB-02664-01-02.svs', 'Patient_0033', [['other', 'Hiç etiket yok; tümör varsa poligon ve alt tip girilmeli'], ['polygon_missing']]);

for (const n of ['172', '173', '175']) {
  add('ws-bcnb2', `${n}.jpg`, n, [['dataset', 'Yeni yüklendi; poligonlar ve global etiketler gözden geçirilmeli']]);
}
add('ws-bcnb2', '176.jpg', '176', [['dataset', 'Yeni yüklendi; poligonlar ve global etiketler gözden geçirilmeli'], ['subtype']]);

const repos = repositories as any;
repos.recheck.requestWorkspace = async (wsId: string, note: string) => {
  await wait();
  const list = images.filter((i) => i.ws_id === wsId);
  for (const img of list) await repos.recheck.request(img.id, 'dataset', note);
  return list.length;
};
repos.recheck.withdrawWorkspace = async (wsId: string) => {
  await wait();
  let n = 0;
  for (const [id, doc] of store) {
    if (doc.ws_id !== wsId || !doc.reasons.some((r: any) => r.code === 'dataset')) continue;
    n++;
    doc.reasons = doc.reasons.filter((r: any) => r.code !== 'dataset');
    if (doc.reasons.length === 0) store.delete(id);
  }
  return n;
};
const fromStore = (id: string): RecheckRequest => recheckFromApi(store.get(id));
repos.recheck.list = async (status?: string) => (
  await wait(),
  [...store.keys()].map(fromStore).filter((r) => !status || r.status === status)
);
repos.recheck.request = async (imageId: string, reason: string, note: string) => {
  await wait();
  const doc = store.get(imageId) ?? (() => {
    const img = images.find((i) => i.id === imageId);
    const d = { image_id: imageId, image_name: img.name, patient_id: img.parent.id, ws_id: img.ws_id, reasons: [] as any[] };
    store.set(imageId, d);
    return d;
  })();
  const r = { code: reason, note, requested_by: 'u1', requested_at: new Date().toISOString() };
  const i = doc.reasons.findIndex((x: any) => x.code === reason && reason !== 'other');
  if (i >= 0) doc.reasons[i] = r;
  else doc.reasons.push(r);
  Object.assign(doc, { status: 'open', completed_by: '', completed_at: null });
  return fromStore(imageId);
};
repos.recheck.setDone = async (imageId: string, done: boolean) => {
  await wait();
  Object.assign(store.get(imageId), done
    ? { status: 'done', completed_by: 'u1', completed_at: new Date().toISOString() }
    : { status: 'open', completed_by: '', completed_at: null });
  return fromStore(imageId);
};
repos.recheck.cancel = async (imageId: string) => {
  await wait();
  store.delete(imageId);
};
repos.workspace.list = async () => (
  await wait(),
  { data: workspaces.map(Workspace.create), pagination: { limit: 100, offset: 0, total: workspaces.length, has_more: false } }
);
repos.workspace.getById = async (id: string) => Workspace.create(workspaces.find((ws) => ws.id === id));
repos.annotationType.listByParent = async () => ({ data: [], pagination: { limit: 100, offset: 0 } });
repos.annotation.listByImage = async () => ({ data: [], pagination: { limit: 100, offset: 0, has_more: false } });
repos.image.getById = async (id: string) => (await wait(), Image.create(images.find((i) => i.id === id)));
repos.patient.getById = async (id: string) => Patient.create(patients.find((p) => p.id === id));

const role = new URLSearchParams(location.search).get('role') === 'pathologist' ? 'pathologist' : 'admin';

const app = createApp(RecheckView).use(createPinia()).use(i18n).use(Toast, { timeout: 1500 });
useAuthStore().user = User.create({
  user_id: 'u1',
  email: 'deneme@ornek.edu.tr',
  display_name: 'Deneme',
  status: 'active',
  role,
  admin_approved: true,
  created_at: now,
  updated_at: now,
});
app.mount('#app');
