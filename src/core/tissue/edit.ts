import type { TissuePoint, TissuePolygon } from './polygon';

/** Identifies a ring of a polygon: -1 is the exterior, >= 0 a hole index. */
export type RingIndex = number;

export function getRing(polygon: TissuePolygon, ring: RingIndex): TissuePoint[] {
  return ring < 0 ? polygon.exterior : polygon.holes[ring]!;
}

function withRing(polygon: TissuePolygon, ring: RingIndex, points: TissuePoint[]): TissuePolygon {
  if (ring < 0) return { exterior: points, holes: polygon.holes };
  const holes = polygon.holes.slice();
  holes[ring] = points;
  return { exterior: polygon.exterior, holes };
}

function replaceAt<T>(items: T[], index: number, item: T): T[] {
  const copy = items.slice();
  copy[index] = item;
  return copy;
}

/** Signed shoelace area; positive for clockwise rings on screen (y down). */
export function ringArea(ring: TissuePoint[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % n]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function polygonArea(polygon: TissuePolygon): number {
  let area = Math.abs(ringArea(polygon.exterior));
  for (const hole of polygon.holes) area -= Math.abs(ringArea(hole));
  return Math.max(area, 0);
}

/** Tissue area as a fraction of the level-0 image. */
export function areaRatio(polygons: TissuePolygon[], width: number, height: number): number {
  if (!(width > 0 && height > 0)) return 0;
  const total = polygons.reduce((sum, p) => sum + polygonArea(p), 0);
  return Math.min(Math.max(total / (width * height), 0), 1);
}

function insideRing(ring: TissuePoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function containsPoint(polygon: TissuePolygon, point: TissuePoint): boolean {
  if (!insideRing(polygon.exterior, point.x, point.y)) return false;
  return !polygon.holes.some((h) => insideRing(h, point.x, point.y));
}

/**
 * Returns the polygon under point, preferring the smallest one when an island
 * sits inside another polygon's hole bounds; -1 when none.
 */
export function hitTest(polygons: TissuePolygon[], point: TissuePoint): number {
  let best = -1;
  let bestArea = Infinity;
  polygons.forEach((p, i) => {
    if (!containsPoint(p, point)) return;
    const area = Math.abs(ringArea(p.exterior));
    if (area < bestArea) {
      best = i;
      bestArea = area;
    }
  });
  return best;
}

/** Returns the hole under point (the smallest one), or null. */
export function hitHole(
  polygons: TissuePolygon[],
  point: TissuePoint
): { polygon: number; hole: number } | null {
  let best: { polygon: number; hole: number } | null = null;
  let bestArea = Infinity;
  polygons.forEach((p, i) => {
    if (!insideRing(p.exterior, point.x, point.y)) return;
    p.holes.forEach((h, j) => {
      if (!insideRing(h, point.x, point.y)) return;
      const area = Math.abs(ringArea(h));
      if (area < bestArea) {
        best = { polygon: i, hole: j };
        bestArea = area;
      }
    });
  });
  return best;
}

/**
 * Fills a hole. Polygons lying entirely inside the hole (islands) are dropped,
 * since the filled region already covers them.
 */
export function removeHole(
  polygons: TissuePolygon[],
  index: number,
  hole: number
): TissuePolygon[] {
  const polygon = polygons[index]!;
  const ring = polygon.holes[hole]!;
  const filled: TissuePolygon = {
    exterior: polygon.exterior,
    holes: polygon.holes.filter((_, j) => j !== hole),
  };
  return polygons
    .map((p, i) => (i === index ? filled : p))
    .filter((p, i) => i === index || !p.exterior.every((q) => insideRing(ring, q.x, q.y)));
}

/**
 * Cuts a hole drawn by the user into the polygon that contains it. Fails when
 * the ring is not inside a single polygon or overlaps an existing hole.
 */
export function addHole(
  polygons: TissuePolygon[],
  ring: TissuePoint[]
): { polygons: TissuePolygon[]; polygon: number } | { error: string } {
  if (ring.length < 3) return { error: 'Delik en az 3 noktadan oluşmalı' };
  let target = -1;
  let targetArea = Infinity;
  polygons.forEach((p, i) => {
    if (!ring.every((q) => insideRing(p.exterior, q.x, q.y))) return;
    const area = Math.abs(ringArea(p.exterior));
    if (area < targetArea) {
      target = i;
      targetArea = area;
    }
  });
  if (target < 0) return { error: 'Delik tamamen tek bir doku bölgesinin içine çizilmeli' };

  const polygon = polygons[target]!;
  const overlaps = polygon.holes.some(
    (h) => ring.some((q) => insideRing(h, q.x, q.y)) || h.some((q) => insideRing(ring, q.x, q.y))
  );
  if (overlaps) return { error: 'Delik mevcut bir delikle çakışıyor' };

  // Holes run counter-clockwise on screen, opposite to exteriors.
  const hole = ringArea(ring) > 0 ? ring.slice().reverse() : ring;
  const next = polygons.slice();
  next[target] = { exterior: polygon.exterior, holes: [...polygon.holes, hole] };
  return { polygons: next, polygon: target };
}

export function removePolygon(polygons: TissuePolygon[], index: number): TissuePolygon[] {
  return polygons.filter((_, i) => i !== index);
}

export function moveVertex(
  polygons: TissuePolygon[],
  index: number,
  ring: RingIndex,
  vertex: number,
  to: TissuePoint
): TissuePolygon[] {
  const polygon = polygons[index]!;
  const points = replaceAt(getRing(polygon, ring), vertex, { x: to.x, y: to.y });
  return replaceAt(polygons, index, withRing(polygon, ring, points));
}

/** Inserts a vertex after position `after` (wrapping at the end of the ring). */
export function insertVertex(
  polygons: TissuePolygon[],
  index: number,
  ring: RingIndex,
  after: number,
  at: TissuePoint
): TissuePolygon[] {
  const polygon = polygons[index]!;
  const points = getRing(polygon, ring).slice();
  points.splice(after + 1, 0, { x: at.x, y: at.y });
  return replaceAt(polygons, index, withRing(polygon, ring, points));
}

/** Removes a vertex; rings never drop below three vertices. */
export function removeVertex(
  polygons: TissuePolygon[],
  index: number,
  ring: RingIndex,
  vertex: number
): TissuePolygon[] {
  const polygon = polygons[index]!;
  const points = getRing(polygon, ring);
  if (points.length <= 3) return polygons;
  return replaceAt(
    polygons,
    index,
    withRing(
      polygon,
      ring,
      points.filter((_, i) => i !== vertex)
    )
  );
}

/** Clamps a point to the level-0 image bounds. */
export function clampPoint(point: TissuePoint, width: number, height: number): TissuePoint {
  return {
    x: Math.min(Math.max(point.x, 0), width),
    y: Math.min(Math.max(point.y, 0), height),
  };
}

/** Screen-clockwise orientation, matching polygons produced by extractPolygons. */
export function orientExterior(points: TissuePoint[]): TissuePoint[] {
  return ringArea(points) < 0 ? points.slice().reverse() : points;
}
