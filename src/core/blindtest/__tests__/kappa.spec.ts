import { describe, expect, it } from 'vitest';
import { cohenKappa, fleissKappa, kappaLabel } from '../kappa';

const conf = (rr: number, rs: number, sr: number, ss: number) => ({
  realAsReal: rr,
  realAsSynthetic: rs,
  syntheticAsReal: sr,
  syntheticAsSynthetic: ss,
});

describe('cohenKappa', () => {
  it('is 2 × accuracy − 1 on a balanced set', () => {
    expect(cohenKappa(conf(75, 25, 25, 75))).toBeCloseTo(0.5); // accuracy 0.75
    expect(cohenKappa(conf(50, 50, 50, 50))).toBeCloseTo(0);
    expect(cohenKappa(conf(100, 0, 0, 100))).toBeCloseTo(1);
    expect(cohenKappa(conf(0, 100, 100, 0))).toBeCloseTo(-1);
  });

  it('gives 0 to someone who always answers the same', () => {
    expect(cohenKappa(conf(100, 0, 100, 0))).toBeCloseTo(0); // 50% accuracy, all "real"
  });

  it('matches a textbook example on an unbalanced table', () => {
    // po = 0.7, pe = 0.5·0.6 + 0.5·0.4 = 0.5 -> κ = 0.4
    expect(cohenKappa(conf(20, 5, 10, 15))).toBeCloseTo(0.4);
  });

  it('is undefined without answers', () => {
    expect(cohenKappa(conf(0, 0, 0, 0))).toBeNull();
  });
});

describe('fleissKappa', () => {
  it('is 1 when every rater agrees on every image', () => {
    const r = fleissKappa([
      { real: 3, synthetic: 0 },
      { real: 0, synthetic: 3 },
      { real: 3, synthetic: 0 },
    ]);
    expect(r).toMatchObject({ raters: 3, images: 3 });
    expect(r.kappa).toBeCloseTo(1);
  });

  it('matches the Wikipedia-style hand computation', () => {
    // 4 raters; P_i = 1, 1/3, 1/2·…: items (4,0) (2,2) (3,1) (0,4)
    // P_i = 1, 1/3, 1/2, 1 -> P̄ = 0.7083; p_real = 9/16 -> Pe = 0.5078 -> κ ≈ 0.4074
    const r = fleissKappa([
      { real: 4, synthetic: 0 },
      { real: 2, synthetic: 2 },
      { real: 3, synthetic: 1 },
      { real: 0, synthetic: 4 },
    ]);
    expect(r.kappa).toBeCloseTo(0.4074, 3);
  });

  it('needs at least two raters and ignores images not rated by all', () => {
    expect(fleissKappa([{ real: 1, synthetic: 0 }]).kappa).toBeNull();
    const r = fleissKappa([
      { real: 2, synthetic: 0 },
      { real: 0, synthetic: 2 },
      { real: 1, synthetic: 0 },
    ]);
    expect(r.images).toBe(2);
    expect(r.kappa).toBeCloseTo(1);
  });
});

describe('kappaLabel', () => {
  it('uses the Landis & Koch bands', () => {
    expect(kappaLabel(-0.1)).toBe('şanstan kötü');
    expect(kappaLabel(0.1)).toBe('çok zayıf');
    expect(kappaLabel(0.3)).toBe('zayıf');
    expect(kappaLabel(0.5)).toBe('orta');
    expect(kappaLabel(0.7)).toBe('iyi');
    expect(kappaLabel(0.9)).toBe('neredeyse tam');
    expect(kappaLabel(null)).toBe('hesaplanamaz');
  });
});
