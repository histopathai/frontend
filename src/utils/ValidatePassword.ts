import { i18n } from '@/i18n';

export interface PasswordCheckResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordCheckResult {
  const t = i18n.global.t;
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push(t('auth.password_too_short'));
  }
  if (!/[A-Z]/.test(password)) {
    errors.push(t('auth.password_need_upper'));
  }
  if (!/[a-z]/.test(password)) {
    errors.push(t('auth.password_need_lower'));
  }
  if (!/[0-9]/.test(password)) {
    errors.push(t('auth.password_need_number'));
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push(t('auth.password_need_special'));
  }

  if (/(\w)\1\1/.test(password)) {
    errors.push(t('auth.password_repeating_chars'));
  }

  const weakList = ['123456', 'password', 'qwerty', '111111', '123123'];
  if (weakList.includes(password.toLowerCase())) {
    errors.push(t('auth.password_too_common'));
  }

  return { valid: errors.length === 0, errors };
}
