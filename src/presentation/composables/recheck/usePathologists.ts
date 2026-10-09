import { ref } from 'vue';
import { repositories } from '@/services';

export interface PathologistOption {
  id: string;
  name: string;
}

const pathologists = ref<PathologistOption[]>([]);
let request: Promise<void> | null = null;

/**
 * Active pathologists, for an admin to send Ek Kontrol requests to. Read once
 * from the admin user list (pages of 100) and shared by every dialog.
 */
export function usePathologists() {
  function load(force = false): Promise<void> {
    if (request && !force) return request;
    request = (async () => {
      const out: PathologistOption[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await repositories.admin.getAllUsers({ limit: 100, offset } as any);
        for (const u of page.data) {
          if (u.role.toString() === 'pathologist' && u.status.toString() === 'active') {
            out.push({ id: u.userId, name: u.displayName || u.email });
          }
        }
        // As the admin store pages it: a short page is the last one.
        if (page.data.length < 100) break;
      }
      pathologists.value = out.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    })().catch((e) => {
      request = null;
      throw e;
    });
    return request;
  }

  const nameOf = (id: string) => pathologists.value.find((p) => p.id === id)?.name ?? '';

  return { pathologists, load, nameOf };
}
