import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import {
  computeMask,
  gray,
  maskArea,
  saturation,
  threshold,
  type Mask,
  type RGBAImage,
} from '../mask';
import { closing, dilateClipped, dilateReflect, removeSmallComponents } from '../morphology';
import { otsuThreshold } from '../otsu';
import {
  defaultTissueParams,
  TISSUE_METHODS,
  type TissueMethod,
  type TissueParams,
} from '../params';
import { computeTissue } from '../result';

// Fixtures are copied from image-processing-service/internal/tissue/testdata:
// reference.json and masks/ come from the ML notebook (gen_reference.py),
// polygons.json from the Go port. Set TISSUE_REFERENCE_DIR to also run the
// 2048px (production size) reference set.
const FIXTURES = join(__dirname, 'fixtures');

interface Reference {
  params: Omit<TissueParams, 'method' | 'simplify_tolerance'>;
  slides: {
    key: string;
    preview: string;
    width: number;
    height: number;
    level0_width: number;
    level0_height: number;
    preview_sha256: string;
    methods: Record<
      TissueMethod,
      {
        mask: string;
        otsu_threshold?: string;
        threshold: number;
        closing: number;
        remove_small_objects: number;
        remove_small_holes: number;
      }
    >;
  }[];
}

interface GoldenPolygons {
  algorithm_version: string;
  cases: {
    slide: string;
    params: TissueParams;
    result: {
      params: TissueParams;
      preview_width: number;
      preview_height: number;
      downsample_x: number;
      downsample_y: number;
      tissue_area_ratio: number;
      polygons: {
        exterior: { X: number; Y: number }[];
        holes: { points: { X: number; Y: number }[] }[];
      }[];
    };
  }[];
}

/** Minimal PNG decoder: 8-bit gray, RGB or RGBA, non-interlaced. Returns RGBA. */
function decodePNG(path: string): RGBAImage {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${path}: unsupported PNG`);
      colorType = data[9]!;
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 6: 4 }[colorType];
  if (!channels) throw new Error(`${path}: unsupported color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pix = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pix[dst + x - channels]! : 0;
      const b = y > 0 ? pix[dst + x - stride]! : 0;
      const c = x >= channels && y > 0 ? pix[dst + x - stride - channels]! : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pix[dst + x] = (raw[src + x]! + pred) & 0xff;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    data[4 * i] = pix[s]!;
    data[4 * i + 1] = pix[channels >= 3 ? s + 1 : s]!;
    data[4 * i + 2] = pix[channels >= 3 ? s + 2 : s]!;
    data[4 * i + 3] = channels === 4 ? pix[s + 3]! : 255;
  }
  return { width, height, data };
}

function rgbSHA256(img: RGBAImage): string {
  const rgb = new Uint8Array(img.width * img.height * 3);
  for (let i = 0; i < img.width * img.height; i++) {
    rgb[3 * i] = img.data[4 * i]!;
    rgb[3 * i + 1] = img.data[4 * i + 1]!;
    rgb[3 * i + 2] = img.data[4 * i + 2]!;
  }
  return createHash('sha256').update(rgb).digest('hex');
}

function parseHexFloat(s: string): number {
  // Python float.hex(): [-]0x1.<hex>p<exp>
  const m = /^(-?)0x([01])\.([0-9a-f]*)p([+-]?\d+)$/.exec(s);
  if (!m) throw new Error(`bad hex float ${s}`);
  let mant = Number(m[2]);
  for (let i = 0; i < m[3]!.length; i++) mant += parseInt(m[3]![i]!, 16) / 16 ** (i + 1);
  return (m[1] ? -1 : 1) * mant * 2 ** Number(m[4]);
}

function channel(img: RGBAImage, method: TissueMethod): Float64Array {
  const out = new Float64Array(img.width * img.height);
  const d = img.data;
  for (let i = 0; i < out.length; i++) {
    const [r, g, b] = [d[4 * i]!, d[4 * i + 1]!, d[4 * i + 2]!];
    out[i] = method === 'otsu-gray' ? gray(r, g, b) : saturation(r, g, b);
  }
  return out;
}

function checkReference(dir: string) {
  const ref: Reference = JSON.parse(readFileSync(join(dir, 'reference.json'), 'utf8'));
  for (const slide of ref.slides) {
    describe(slide.key, () => {
      const img = decodePNG(join(dir, slide.preview));

      it('decodes the preview to the reference pixels', () => {
        expect(rgbSHA256(img)).toBe(slide.preview_sha256);
      });

      for (const method of TISSUE_METHODS) {
        const want = slide.methods[method];
        it(`${method} matches the notebook stage by stage`, () => {
          const p: TissueParams = { ...defaultTissueParams(), ...ref.params, method };
          if (want.otsu_threshold) {
            const t = otsuThreshold(channel(img, method));
            const expected = parseHexFloat(want.otsu_threshold);
            if (method === 'otsu-saturation') expect(t).toBe(expected);
            else expect(Math.abs(t - expected)).toBeLessThan(1e-12);
          }
          const m: Mask = { width: img.width, height: img.height, pix: threshold(img, p) };
          expect(maskArea(m)).toBe(want.threshold);
          closing(m, p.closing_radius);
          expect(maskArea(m)).toBe(want.closing);
          removeSmallComponents(m, 1, p.min_object_area);
          expect(maskArea(m)).toBe(want.remove_small_objects);
          removeSmallComponents(m, 0, p.min_hole_area);
          expect(maskArea(m)).toBe(want.remove_small_holes);

          const golden = decodePNG(join(dir, want.mask));
          let diff = 0;
          for (let i = 0; i < m.pix.length; i++) {
            if (m.pix[i] !== (golden.data[4 * i]! > 0 ? 1 : 0)) diff++;
          }
          expect(diff).toBe(0);
          const direct = computeMask(img, p).pix;
          expect(direct.every((v, i) => v === m.pix[i])).toBe(true);
        }, 60_000);
      }
    });
  }
}

describe('tissue mask matches the notebook reference (512px)', () => {
  checkReference(FIXTURES);
});

const fullResolutionDir = process.env.TISSUE_REFERENCE_DIR;
if (fullResolutionDir) {
  describe('tissue mask reference (2048px)', () => {
    checkReference(fullResolutionDir);
  });
}

describe('tissue polygons match the Go port', () => {
  const golden: GoldenPolygons = JSON.parse(readFileSync(join(FIXTURES, 'polygons.json'), 'utf8'));
  const ref: Reference = JSON.parse(readFileSync(join(FIXTURES, 'reference.json'), 'utf8'));
  const images = new Map<string, RGBAImage>();

  it('uses the same algorithm version', () => {
    expect(golden.algorithm_version).toBe('tissue-v1');
  });

  golden.cases.forEach((c, n) => {
    it(`${c.slide} #${n} ${c.params.method} tol=${c.params.simplify_tolerance}`, () => {
      const slide = ref.slides.find((s) => s.key === c.slide)!;
      if (!images.has(slide.key)) images.set(slide.key, decodePNG(join(FIXTURES, slide.preview)));
      const got = computeTissue(
        images.get(slide.key)!,
        c.params,
        slide.level0_width,
        slide.level0_height
      );
      const want = c.result;
      expect(got.params).toEqual(want.params);
      expect([got.previewWidth, got.previewHeight]).toEqual([
        want.preview_width,
        want.preview_height,
      ]);
      expect(got.downsampleX).toBe(want.downsample_x);
      expect(got.downsampleY).toBe(want.downsample_y);
      expect(got.tissueAreaRatio).toBe(want.tissue_area_ratio);
      expect(got.polygons.length).toBe(want.polygons.length);
      const toXY = (pts: { X: number; Y: number }[]) => pts.map((p) => ({ x: p.X, y: p.Y }));
      want.polygons.forEach((wp, i) => {
        const gp = got.polygons[i]!;
        expect(gp.exterior).toEqual(toXY(wp.exterior));
        expect(gp.holes).toEqual(wp.holes.map((h) => toXY(h.points)));
      });
    });
  });
});

describe('morphology', () => {
  it('clipped dilation matches explicit reflect boundaries', () => {
    let seed = 1;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (const r of [1, 2, 3, 5, 8]) {
      for (let trial = 0; trial < 20; trial++) {
        const w = r + 1 + Math.floor(rand() * 20);
        const h = r + 1 + Math.floor(rand() * 20);
        const pix = new Uint8Array(w * h).map(() => (rand() < 0.25 ? 1 : 0));
        for (const value of [0, 1] as const) {
          expect(dilateClipped(pix, w, h, r, value)).toEqual(dilateReflect(pix, w, h, r, value));
        }
      }
    }
  });
});
