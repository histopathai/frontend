import type { BlindTestScore } from '@/core/repositories/IBlindTestRepository';

/**
 * Cohen's kappa between a participant's answers and the true labels:
 * (observed agreement − agreement expected by chance) / (1 − expected).
 * 0 = no better than chance, 1 = perfect, < 0 = systematically reversed.
 * On a balanced, fully answered set it equals 2 × accuracy − 1.
 * null when undefined (no answers, or chance agreement is already 1).
 */
export function cohenKappa(c: BlindTestScore['confusion']): number | null {
  const n = c.realAsReal + c.realAsSynthetic + c.syntheticAsReal + c.syntheticAsSynthetic;
  if (!n) return null;
  const observed = (c.realAsReal + c.syntheticAsSynthetic) / n;
  const truthReal = (c.realAsReal + c.realAsSynthetic) / n;
  const answerReal = (c.realAsReal + c.syntheticAsReal) / n;
  const expected = truthReal * answerReal + (1 - truthReal) * (1 - answerReal);
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}

/**
 * Fleiss' kappa: how much the raters agree with each other, beyond chance,
 * regardless of the truth. votes holds, per image, how many raters said real
 * and how many synthetic; only images rated by every one of the raters count.
 * null with fewer than 2 raters or when undefined.
 */
export function fleissKappa(votes: { real: number; synthetic: number }[]): {
  kappa: number | null;
  raters: number;
  images: number;
} {
  const raters = Math.max(0, ...votes.map((v) => v.real + v.synthetic));
  const items = votes.filter((v) => v.real + v.synthetic === raters);
  if (raters < 2 || !items.length) return { kappa: null, raters, images: items.length };
  const n = raters;
  const agreement =
    items.reduce((s, v) => s + (v.real ** 2 + v.synthetic ** 2 - n) / (n * (n - 1)), 0) /
    items.length;
  const pReal = items.reduce((s, v) => s + v.real, 0) / (items.length * n);
  const expected = pReal ** 2 + (1 - pReal) ** 2;
  return {
    kappa: expected === 1 ? null : (agreement - expected) / (1 - expected),
    raters,
    images: items.length,
  };
}

/** Landis & Koch (1977) wording for a kappa value. */
export function kappaLabel(kappa: number | null): string {
  if (kappa === null) return 'hesaplanamaz';
  if (kappa < 0) return 'şanstan kötü';
  if (kappa <= 0.2) return 'çok zayıf';
  if (kappa <= 0.4) return 'zayıf';
  if (kappa <= 0.6) return 'orta';
  if (kappa <= 0.8) return 'iyi';
  return 'neredeyse tam';
}
