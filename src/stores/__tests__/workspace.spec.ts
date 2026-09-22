import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const list = vi.fn();
vi.mock('@/services', () => ({ repositories: { workspace: { list: (...a: any[]) => list(...a) } } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }));

import { useWorkspaceStore } from '../workspace';

const fakes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `ws-${i}` }));

describe('fetchAllWorkspaces', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    list.mockReset();
  });

  it('pages past the first page until a short page comes back', async () => {
    const all = fakes(250);
    list.mockImplementation(async ({ pagination }: any) => ({
      data: all.slice(pagination.offset, pagination.offset + pagination.limit),
      pagination: {},
    }));
    const store = useWorkspaceStore();

    await store.fetchAllWorkspaces();

    expect(store.allWorkspaces).toHaveLength(250);
    expect(list.mock.calls.map((c) => c[0].pagination.offset)).toEqual([0, 100, 200]);
    expect(list.mock.calls.every((c) => c[0].pagination.limit === 100)).toBe(true);
  });

  it('leaves the paged list view and its pagination alone', async () => {
    list.mockImplementation(async ({ pagination }: any) => ({
      data: fakes(25).slice(pagination.offset, pagination.offset + pagination.limit),
      pagination: {},
    }));
    const store = useWorkspaceStore();
    await store.fetchWorkspaces({ limit: 10, offset: 10 });

    await store.fetchAllWorkspaces();

    expect(store.workspaces.map((w) => w.id)).toEqual(fakes(20).slice(10).map((w) => w.id));
    expect(store.pagination.offset).toBe(10);
    expect(store.allWorkspaces).toHaveLength(25);
  });

  it('shares one load between callers asking at the same time', async () => {
    list.mockResolvedValue({ data: fakes(3), pagination: {} });
    const store = useWorkspaceStore();

    await Promise.all([store.fetchAllWorkspaces(), store.fetchAllWorkspaces()]);

    expect(list).toHaveBeenCalledTimes(1);
  });
});
