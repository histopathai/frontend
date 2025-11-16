import { createI18n } from 'vue-i18n';

const messages: {
  en: Record<string, any>;
  tr: Record<string, any>;
} = {
  en: {},
  tr: {},
};

function extractFileName(path: string) {
  return path.split('/').pop()!.replace('.json', '');
}

// EN files
const enModules = import.meta.glob('@/locales/en/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, any> }
>;
for (const path in enModules) {
  const fileName = extractFileName(path);
  messages.en[fileName] = enModules[path]?.default ?? {};
}

// TR files
const trModules = import.meta.glob('@/locales/tr/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, any> }
>;
for (const path in trModules) {
  const fileName = extractFileName(path);
  messages.tr[fileName] = trModules[path]?.default ?? {};
}

export const i18n = createI18n({
  legacy: false,
  locale: 'tr',
  fallbackLocale: 'en',
  messages,
});
