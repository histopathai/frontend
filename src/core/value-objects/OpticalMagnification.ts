export interface OpticalMagnification {
  objective: number | null;
  nativeLevel: number | null;
  scanMagnification: number | null;
}

export const OpticalMagnificationUtils = {
  create(
    objective: number | null = null,
    nativeLevel: number | null = null,
    scanMagnification: number | null = null
  ): OpticalMagnification {
    return {
      objective,
      nativeLevel,
      scanMagnification,
    };
  },

  hasValues(mag: OpticalMagnification): boolean {
    return mag.objective !== null || mag.nativeLevel !== null || mag.scanMagnification !== null;
  },

  toMap(mag: OpticalMagnification): Record<string, number> {
    const result: Record<string, number> = {};

    if (mag.objective !== null) {
      result.Objective = mag.objective;
    }
    if (mag.nativeLevel !== null) {
      result.NativeLevel = mag.nativeLevel;
    }
    if (mag.scanMagnification !== null) {
      result.ScanMagnification = mag.scanMagnification;
    }

    return result;
  },

  toJSON(mag: OpticalMagnification): Record<string, number | null> {
    return {
      objective: mag.objective,
      nativeLevel: mag.nativeLevel,
      scanMagnification: mag.scanMagnification,
    };
  },

  fromJSON(
    json: {
      objective?: number | null;
      nativeLevel?: number | null;
      scanMagnification?: number | null;
    } | null
  ): OpticalMagnification | null {
    if (!json) return null;

    return {
      objective: json.objective ?? null,
      nativeLevel: json.nativeLevel ?? null,
      scanMagnification: json.scanMagnification ?? null,
    };
  },

  getDisplayString(mag: OpticalMagnification): string {
    const parts: string[] = [];

    if (mag.objective !== null) {
      parts.push(`${mag.objective}x`);
    }
    if (mag.scanMagnification !== null) {
      parts.push(`Scan: ${mag.scanMagnification}x`);
    }
    if (mag.nativeLevel !== null) {
      parts.push(`Level: ${mag.nativeLevel}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No magnification data';
  },
};

export function isOpticalMagnification(value: unknown): value is OpticalMagnification {
  if (!value || typeof value !== 'object') return false;

  const mag = value as OpticalMagnification;
  return (
    (mag.objective === null || typeof mag.objective === 'number') &&
    (mag.nativeLevel === null || typeof mag.nativeLevel === 'number') &&
    (mag.scanMagnification === null || typeof mag.scanMagnification === 'number')
  );
}
