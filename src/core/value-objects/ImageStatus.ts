export class ImageStatus {
  private static readonly VALID_VALUES = [
    'pending',
    'processing',
    'processed',
    'failed',
    'failed_permanent',
    'deleting',
    'uploaded',
  ] as const;
  private readonly value: (typeof ImageStatus.VALID_VALUES)[number];

  private constructor(value: string) {
    if (!ImageStatus.VALID_VALUES.includes(value as any)) {
      throw new Error(`Invalid image status: ${value}`);
    }
    this.value = value as (typeof ImageStatus.VALID_VALUES)[number];
  }

  static fromString(value: string): ImageStatus {
    return new ImageStatus(value);
  }

  static uploaded(): ImageStatus {
    return new ImageStatus('uploaded');
  }

  toString(): string {
    return this.value;
  }

  isProcessed(): boolean {
    return this.value === 'processed';
  }

  isFailed(): boolean {
    return this.value === 'failed';
  }

  canRetry(): boolean {
    return this.value === 'failed';
  }
}
