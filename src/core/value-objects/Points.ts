export class Point {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Point coordinates must be finite numbers');
    }
  }

  static from(data: { x: number; y: number }): Point {
    return new Point(data.x, data.y);
  }

  equals(other: Point): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
