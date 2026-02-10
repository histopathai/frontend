export enum OrganType {
  Unknown = 'unknown',
  Brain = 'brain',
  Lung = 'lung',
  Liver = 'liver',
  Kidney = 'kidney',
  Heart = 'heart',
  Stomach = 'stomach',
  SmallIntestine = 'small_intestine',
  LargeIntestine = 'large_intestine',
  Pancreas = 'pancreas',
  Spleen = 'spleen',
  Bladder = 'bladder',
  Prostate = 'prostate',
  Testis = 'testis',
  Ovary = 'ovary',
  Uterus = 'uterus',
  Skin = 'skin',
  Bone = 'bone',
  BoneMarrow = 'bone_marrow',
  Breast = 'breast',
  Thyroid = 'thyroid',
  LymphNode = 'lymph_node',
  Esophagus = 'esophagus',
  Gallbladder = 'gallbladder',
  SalivaryGland = 'salivary_gland',
  AdrenalGland = 'adrenal_gland',
  Placenta = 'placenta',
  Eye = 'eye',
  Tongue = 'tongue',
}

export const OrganTypeUtils = {
  isValid(value: string): value is OrganType {
    return Object.values(OrganType).includes(value as OrganType);
  },

  getAll(): OrganType[] {
    return Object.values(OrganType);
  },

  getLabel(organType: OrganType): string {
    const labels: Record<OrganType, string> = {
      [OrganType.Unknown]: 'Unknown',
      [OrganType.Brain]: 'Brain',
      [OrganType.Lung]: 'Lung',
      [OrganType.Liver]: 'Liver',
      [OrganType.Kidney]: 'Kidney',
      [OrganType.Heart]: 'Heart',
      [OrganType.Stomach]: 'Stomach',
      [OrganType.SmallIntestine]: 'Small Intestine',
      [OrganType.LargeIntestine]: 'Large Intestine',
      [OrganType.Pancreas]: 'Pancreas',
      [OrganType.Spleen]: 'Spleen',
      [OrganType.Bladder]: 'Bladder',
      [OrganType.Prostate]: 'Prostate',
      [OrganType.Testis]: 'Testis',
      [OrganType.Ovary]: 'Ovary',
      [OrganType.Uterus]: 'Uterus',
      [OrganType.Skin]: 'Skin',
      [OrganType.Bone]: 'Bone',
      [OrganType.BoneMarrow]: 'Bone Marrow',
      [OrganType.Breast]: 'Breast',
      [OrganType.Thyroid]: 'Thyroid',
      [OrganType.LymphNode]: 'Lymph Node',
      [OrganType.Esophagus]: 'Esophagus',
      [OrganType.Gallbladder]: 'Gallbladder',
      [OrganType.SalivaryGland]: 'Salivary Gland',
      [OrganType.AdrenalGland]: 'Adrenal Gland',
      [OrganType.Placenta]: 'Placenta',
      [OrganType.Eye]: 'Eye',
      [OrganType.Tongue]: 'Tongue',
    };
    return labels[organType];
  },

  normalize(value: string): string {
    if (!value) return '';

    let normalized = value.trim();
    normalized = normalized.replace(/[-\s]+/g, '_');
    normalized = normalized.replace(/([a-z])([A-Z])/g, '$1_$2');
    normalized = normalized.toLowerCase();

    return normalized;
  },

  fromString(value: string): OrganType | null {
    if (!value) return OrganType.Unknown;

    const normalized = this.normalize(value);

    if (this.isValid(normalized)) {
      return normalized as OrganType;
    }

    return null;
  },

  getGrouped(): Record<string, OrganType[]> {
    return {
      'Digestive System': [
        OrganType.Esophagus,
        OrganType.Stomach,
        OrganType.SmallIntestine,
        OrganType.LargeIntestine,
        OrganType.Liver,
        OrganType.Pancreas,
        OrganType.Gallbladder,
        OrganType.SalivaryGland,
        OrganType.Tongue,
      ],
      'Respiratory System': [OrganType.Lung],
      'Cardiovascular System': [OrganType.Heart],
      'Nervous System': [OrganType.Brain, OrganType.Eye],
      'Urinary System': [OrganType.Kidney, OrganType.Bladder],
      'Reproductive System': [
        OrganType.Prostate,
        OrganType.Testis,
        OrganType.Ovary,
        OrganType.Uterus,
        OrganType.Placenta,
      ],
      'Immune/Lymphatic System': [OrganType.Spleen, OrganType.LymphNode, OrganType.BoneMarrow],
      'Endocrine System': [OrganType.Thyroid, OrganType.AdrenalGland],
      'Integumentary System': [OrganType.Skin],
      'Skeletal System': [OrganType.Bone],
      Breast: [OrganType.Breast],
      Other: [OrganType.Unknown],
    };
  },
};

export function isOrganType(value: unknown): value is OrganType {
  return typeof value === 'string' && OrganTypeUtils.isValid(value);
}
