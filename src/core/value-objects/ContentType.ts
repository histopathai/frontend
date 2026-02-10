export enum ContentType {
  ImageSVS = 'image/x-aperio-svs',
  ImageTIFF = 'image/tiff',
  ImageNDPI = 'image/x-ndpi',
  ImageVMS = 'image/x-vms',
  ImageVMU = 'image/x-vmu',
  ImageSCN = 'image/x-scn',
  ImageMIRAX = 'image/x-mirax',
  ImageBIF = 'image/x-bif',
  ImageDNG = 'image/x-adobe-dng',
  ImageBMP = 'image/bmp',
  ImageJPEG = 'image/jpeg',
  ImagePNG = 'image/png',

  ThumbnailJPEG = 'image/x-thumb-jpeg',
  ThumbnailPNG = 'image/x-thumb-png',

  ApplicationZip = 'application/zip',
  ApplicationJSON = 'application/json',

  ApplicationDZI = 'application/xml',

  ApplicationOctetStream = 'application/octet-stream',
}

export type ContentCategory = 'image' | 'archive' | 'document' | 'other';
export const ContentTypeUtils = {
  isValid(value: string): value is ContentType {
    return Object.values(ContentType).includes(value as ContentType);
  },

  getAll(): ContentType[] {
    return Object.values(ContentType);
  },
  getCategory(contentType: ContentType): ContentCategory {
    switch (contentType) {
      case ContentType.ImageSVS:
      case ContentType.ImageTIFF:
      case ContentType.ImageNDPI:
      case ContentType.ImageVMS:
      case ContentType.ImageVMU:
      case ContentType.ImageSCN:
      case ContentType.ImageMIRAX:
      case ContentType.ImageBIF:
      case ContentType.ImageDNG:
      case ContentType.ImageBMP:
      case ContentType.ImageJPEG:
      case ContentType.ImagePNG:
      case ContentType.ThumbnailJPEG:
      case ContentType.ThumbnailPNG:
        return 'image';
      case ContentType.ApplicationZip:
        return 'archive';
      case ContentType.ApplicationJSON:
      case ContentType.ApplicationDZI:
        return 'document';
      default:
        return 'other';
    }
  },

  isOriginImage(contentType: ContentType): boolean {
    return this.getCategory(contentType) === 'image' && !this.isThumbnail(contentType);
  },

  isThumbnail(contentType: ContentType): boolean {
    return contentType === ContentType.ThumbnailJPEG || contentType === ContentType.ThumbnailPNG;
  },

  isIndexMap(contentType: ContentType): boolean {
    return contentType === ContentType.ApplicationJSON;
  },

  isArchive(contentType: ContentType): boolean {
    return contentType === ContentType.ApplicationZip;
  },

  isDZI(contentType: ContentType): boolean {
    return contentType === ContentType.ApplicationDZI;
  },

  isTiles(contentType: ContentType): boolean {
    return contentType === ContentType.ApplicationOctetStream;
  },

  toStandardType(contentType: ContentType): ContentType {
    switch (contentType) {
      case ContentType.ThumbnailJPEG:
        return ContentType.ImageJPEG;
      case ContentType.ThumbnailPNG:
        return ContentType.ImagePNG;
      default:
        return contentType;
    }
  },

  fromExtension(ext: string): ContentType {
    const normalized = ext.toLowerCase().startsWith('.') ? ext : `.${ext}`;

    switch (normalized) {
      case '.svs':
        return ContentType.ImageSVS;
      case '.tif':
      case '.tiff':
        return ContentType.ImageTIFF;
      case '.ndpi':
        return ContentType.ImageNDPI;
      case '.vms':
        return ContentType.ImageVMS;
      case '.vmu':
        return ContentType.ImageVMU;
      case '.scn':
        return ContentType.ImageSCN;
      case '.mrz':
        return ContentType.ImageMIRAX;
      case '.bif':
        return ContentType.ImageBIF;
      case '.dng':
        return ContentType.ImageDNG;
      case '.bmp':
        return ContentType.ImageBMP;
      case '.jpg':
      case '.jpeg':
        return ContentType.ImageJPEG;
      case '.png':
        return ContentType.ImagePNG;
      case '.zip':
        return ContentType.ApplicationZip;
      case '.json':
        return ContentType.ApplicationJSON;
      case '.dzi':
        return ContentType.ApplicationDZI;
      default:
        return ContentType.ApplicationOctetStream;
    }
  },

  fromString(value: string): ContentType | null {
    if (!value) return null;

    if (this.isValid(value)) {
      return value as ContentType;
    }

    return null;
  },

  getLabel(contentType: ContentType): string {
    const labels: Record<ContentType, string> = {
      [ContentType.ImageSVS]: 'Aperio SVS',
      [ContentType.ImageTIFF]: 'TIFF Image',
      [ContentType.ImageNDPI]: 'NDPI Image',
      [ContentType.ImageVMS]: 'VMS Image',
      [ContentType.ImageVMU]: 'VMU Image',
      [ContentType.ImageSCN]: 'SCN Image',
      [ContentType.ImageMIRAX]: 'MIRAX Image',
      [ContentType.ImageBIF]: 'BIF Image',
      [ContentType.ImageDNG]: 'DNG Image',
      [ContentType.ImageBMP]: 'BMP Image',
      [ContentType.ImageJPEG]: 'JPEG Image',
      [ContentType.ImagePNG]: 'PNG Image',
      [ContentType.ThumbnailJPEG]: 'JPEG Thumbnail',
      [ContentType.ThumbnailPNG]: 'PNG Thumbnail',
      [ContentType.ApplicationZip]: 'ZIP Archive',
      [ContentType.ApplicationJSON]: 'JSON Document',
      [ContentType.ApplicationDZI]: 'DZI Format',
      [ContentType.ApplicationOctetStream]: 'Binary File',
    };
    return labels[contentType];
  },
};

export function isContentType(value: unknown): value is ContentType {
  return typeof value === 'string' && ContentTypeUtils.isValid(value);
}
