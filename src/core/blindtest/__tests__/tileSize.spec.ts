import { describe, expect, it } from 'vitest';
import { blindTestTileSize } from '../tileSize';

describe('blindTestTileSize', () => {
  it('shows images 1:1 with a mouse', () => {
    expect(blindTestTileSize(256, 1, 1200, false)).toBe(256);
    expect(blindTestTileSize(256, 2, 1200, false)).toBe(128);
  });

  it('enlarges by a whole factor to fit a phone', () => {
    expect(blindTestTileSize(256, 3, 358, true) * 3).toBe(1024); // iPhone 14: 4 × 256 screen px
    expect(blindTestTileSize(256, 2, 288, true) * 2).toBe(512); // narrow phone: 2 × 256
    expect(blindTestTileSize(256, 2.625, 380, true) * 2.625).toBeCloseTo(768); // Pixel 7: 3 × 256
  });

  it('never exceeds the available width unless 1:1 does not fit', () => {
    for (const ratio of [1, 1.5, 2, 2.625, 3, 3.5]) {
      for (const width of [300, 320, 360, 390, 412, 430]) {
        const tile = blindTestTileSize(256, ratio, width, true);
        expect(tile <= width || tile === 256 / ratio).toBe(true);
        expect(Number.isInteger(Math.round(tile * ratio * 1000) / 1000 / 256)).toBe(true);
      }
    }
  });

  it('caps tiles on tablets so more than one fits', () => {
    expect(blindTestTileSize(256, 2, 788, true)).toBe(384);
  });
});
