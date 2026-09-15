import { describe, expect, it } from 'vitest';

import {
  addHole,
  areaRatio,
  hitHole,
  removeHole,
  ringArea,
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

describe('tissue hole editing', () => {
  it('finds the hole under a point', () => {
    expect(hitHole([donut, island], { x: 30, y: 30 })).toEqual({ polygon: 0, hole: 0 });
    expect(hitHole([donut, island], { x: 5, y: 5 })).toBeNull();
  });

  it('fills a hole and drops the islands inside it', () => {
    const outside: TissuePolygon = { exterior: square(200, 0, 10), holes: [] };
    const filled = removeHole([donut, island, outside], 0, 0);
    expect(filled).toEqual([{ exterior: donut.exterior, holes: [] }, outside]);
    expect(polygonArea(filled[0]!)).toBe(10000);
  });

  it('cuts a drawn hole into the polygon that contains it', () => {
    const solid: TissuePolygon = { exterior: square(0, 0, 100), holes: [] };
    const result = addHole([solid], square(10, 10, 20));
    expect('polygons' in result).toBe(true);
    if (!('polygons' in result)) return;
    const hole = result.polygons[0]!.holes[0]!;
    expect(ringArea(hole)).toBeLessThan(0);
    expect(polygonArea(result.polygons[0]!)).toBe(10000 - 400);
  });

  it('refuses holes outside tissue or overlapping another hole', () => {
    expect(addHole([donut], square(90, 90, 20))).toHaveProperty('error');
    expect(addHole([donut], square(20, 20, 10))).toHaveProperty('error');
    expect(addHole([donut], square(5, 5, 10))).not.toHaveProperty('error');
  });
});
