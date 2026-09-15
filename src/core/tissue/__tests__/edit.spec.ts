import { describe, expect, it } from 'vitest';

import {
  areaRatio,
  containsPoint,
  hitTest,
  insertVertex,
  moveVertex,
  orientExterior,
  polygonArea,
  removePolygon,
  removeVertex,
} from '../edit';
import type { TissuePolygon } from '../polygon';

const square = (x: number, y: number, s: number) => [
  { x, y },
  { x: x + s, y },
  { x: x + s, y: y + s },
  { x, y: y + s },
];

// A 100x100 square with a 50x50 hole, and a 10x10 island inside the hole.
const donut: TissuePolygon = { exterior: square(0, 0, 100), holes: [square(25, 25, 50)] };
const island: TissuePolygon = { exterior: square(45, 45, 10), holes: [] };

describe('tissue polygon geometry', () => {
  it('computes areas without holes', () => {
    expect(polygonArea(donut)).toBe(10000 - 2500);
    expect(areaRatio([donut, island], 200, 100)).toBe((7500 + 100) / 20000);
  });

  it('treats holes as outside', () => {
    expect(containsPoint(donut, { x: 10, y: 10 })).toBe(true);
    expect(containsPoint(donut, { x: 30, y: 30 })).toBe(false);
    expect(containsPoint(donut, { x: 150, y: 10 })).toBe(false);
  });

  it('hit tests the innermost polygon', () => {
    expect(hitTest([donut, island], { x: 50, y: 50 })).toBe(1);
    expect(hitTest([donut, island], { x: 5, y: 5 })).toBe(0);
    expect(hitTest([donut, island], { x: 30, y: 30 })).toBe(-1);
  });
});

describe('tissue polygon editing', () => {
  it('returns new arrays and leaves the input untouched', () => {
    const polygons = [donut, island];
    const moved = moveVertex(polygons, 0, 0, 2, { x: 5, y: 5 });
    expect(moved).not.toBe(polygons);
    expect(moved[0]!.holes[0]![2]).toEqual({ x: 5, y: 5 });
    expect(donut.holes[0]![2]).toEqual({ x: 75, y: 75 });
    expect(moved[1]).toBe(island);
  });

  it('inserts and removes vertices, keeping at least three', () => {
    const inserted = insertVertex([island], 0, -1, 3, { x: 40, y: 50 });
    expect(inserted[0]!.exterior).toHaveLength(5);
    expect(inserted[0]!.exterior[4]).toEqual({ x: 40, y: 50 });

    let polygons = removeVertex(inserted, 0, -1, 4);
    expect(polygons[0]!.exterior).toEqual(island.exterior);
    polygons = removeVertex(removeVertex(polygons, 0, -1, 0), 0, -1, 0);
    expect(polygons[0]!.exterior).toHaveLength(3);
  });

  it('removes polygons', () => {
    expect(removePolygon([donut, island], 0)).toEqual([island]);
  });

  it('orients drawn exteriors clockwise on screen', () => {
    const ccw = square(0, 0, 10).reverse();
    expect(orientExterior(ccw)).toEqual(square(0, 0, 10).reverse().reverse());
  });
});
