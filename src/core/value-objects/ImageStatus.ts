export class ImageStatus {
  private static readonly VALID_VALUES = ['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'] as const;
  private readonly value: typeof ImageStatus.VALID_VALUES[number];

  private constructor(value: string) {
    if (!ImageStatus.VALID_VALUES.includes(value as any)) {
      throw new Error(`Invalid image status: ${value}`);
    }
    this.value = value as typeof ImageStatus.VALID_VALUES[number];
  }

  static fromString(value: string): ImageStatus {
    return new ImageStatus(value);
  }

  static uploaded(): ImageStatus {
    return new ImageStatus('UPLOADED');
  }

  toString(): string {
    return this.value;
  }

  isProcessed(): boolean {
    return this.value === 'PROCESSED';
  }

  isFailed(): boolean {
    return this.value === 'FAILED';
  }

  canRetry(): boolean {
    return this.value === 'FAILED';
  }
}