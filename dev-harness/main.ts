// Mounts the real patch grid workspace on synthetic slides. Only the network is
// faked: the four repository calls the tab makes answer from data/api.json.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import '@/assets/main.css';
import 'vue-toastification/dist/index.css';
import { Annotation } from '@/core/entities/Annotation';
import { Image } from '@/core/entities/Image';
import { tissueMaskFromApi } from '@/core/entities/TissueMask';
import { i18n } from '@/i18n';
import { repositories } from '@/services';
import api from './data/api.json';
import HarnessApp from './HarnessApp.vue';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const data = api as any;

repositories.tissueMask.getByImage = async (imageId: string) => {
  await wait(150);
  const doc = data.masks[imageId];
  return doc ? tissueMaskFromApi(doc) : null;
};

// Pages of 100, like main-service, each with a little latency — so the paged
// loading and its progress text are exercised too.
repositories.annotation.listByImage = async (imageId: string, options?: any) => {
  await wait(60);
  const all: any[] = data.annotations[imageId] ?? [];
  const limit = options?.pagination?.limit ?? 100;
  const offset = options?.pagination?.offset ?? 0;
  const page = all.slice(offset, offset + limit);
  return {
    data: page.map((a) => Annotation.create({ ...a, parent: { id: imageId, type: 'image' } })),
    pagination: { limit, offset, has_more: offset + limit < all.length } as any,
  };
};

// What main-service answers on /annotations/workspace/:id/label-sets, worked out from the same data.
repositories.annotation.labelSetsByWorkspace = async (workspaceId: string) => {
  await wait(200);
  const groups = new Map<string, any>();
  const names = new Map<string, Set<string>>();
  for (const image of data.images as any[]) {
    if (image.ws_id !== workspaceId) continue;
    for (const a of (data.annotations[image.id] ?? []) as any[]) {
      if (a.is_global || (a.polygon ?? []).length < 3) continue;
      const key = `${a.creator_id}\u0000${a.annotation_type_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          creatorId: a.creator_id,
          annotationTypeId: a.annotation_type_id,
          resources: new Set<string>(),
          polygonCount: 0,
          imageIds: new Set<string>(),
        });
      }
      const g = groups.get(key);
      g.resources.add(a.resource);
      g.polygonCount++;
      g.imageIds.add(image.id);
      if (!names.has(a.annotation_type_id)) names.set(a.annotation_type_id, new Set());
      names.get(a.annotation_type_id)!.add(a.name);
    }
  }
  return [...groups.values()].map((g) => ({
    ...g,
    resources: [...g.resources].sort(),
    imageIds: [...g.imageIds].sort(),
    name: names.get(g.annotationTypeId)!.size === 1 ? [...names.get(g.annotationTypeId)!][0] : '',
  }));
};

repositories.annotationType.getById = async (id: string) =>
  ({ id, name: data.annotation_types[id] ?? id }) as any;

repositories.auth.getPublicUser = async (uid: string) =>
  data.users[uid] ? { display_name: data.users[uid] } : null;

const images = (data.images as any[]).map((doc) => Image.create(doc));

createApp(HarnessApp, { images })
  .use(createPinia())
  .use(i18n) // the stores behind the tab call useI18n()
  .use(Toast, { timeout: 2500 })
  .mount('#app');
