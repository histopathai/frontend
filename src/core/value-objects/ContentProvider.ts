export enum ContentProvider {
  Local = 'local',
  S3 = 's3',
  GCS = 'gcs',
  Azure = 'azure',
  MinIO = 'minio',
  HTTP = 'http',
}

export const ContentProviderUtils = {
  isValid(value: string): value is ContentProvider {
    return Object.values(ContentProvider).includes(value as ContentProvider);
  },

  getAll(): ContentProvider[] {
    return Object.values(ContentProvider);
  },

  isCloud(provider: ContentProvider): boolean {
    switch (provider) {
      case ContentProvider.S3:
      case ContentProvider.GCS:
      case ContentProvider.Azure:
      case ContentProvider.MinIO:
        return true;
      default:
        return false;
    }
  },

  fromString(value: string): ContentProvider | null {
    if (!value) return null;

    if (this.isValid(value)) {
      return value as ContentProvider;
    }

    return null;
  },

  getLabel(provider: ContentProvider): string {
    const labels: Record<ContentProvider, string> = {
      [ContentProvider.Local]: 'Local Storage',
      [ContentProvider.S3]: 'Amazon S3',
      [ContentProvider.GCS]: 'Google Cloud Storage',
      [ContentProvider.Azure]: 'Azure Blob Storage',
      [ContentProvider.MinIO]: 'MinIO',
      [ContentProvider.HTTP]: 'HTTP',
    };
    return labels[provider];
  },

  getIcon(provider: ContentProvider): string {
    const icons: Record<ContentProvider, string> = {
      [ContentProvider.Local]: 'folder',
      [ContentProvider.S3]: 'cloud',
      [ContentProvider.GCS]: 'cloud',
      [ContentProvider.Azure]: 'cloud',
      [ContentProvider.MinIO]: 'server',
      [ContentProvider.HTTP]: 'globe',
    };
    return icons[provider];
  },
};

export function isContentProvider(value: unknown): value is ContentProvider {
  return typeof value === 'string' && ContentProviderUtils.isValid(value);
}
