import { createI18n } from 'vue-i18n';
import trErrors from '@/locales/tr/errors.json';
import enErrors from '@/locales/en/errors.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'tr', // default dil
  messages: {
    tr: { errors: trErrors },
    en: { errors: enErrors },
  },
});
