export type BlindTestLabel = 'real' | 'synthetic';

/** A blind test as listed to a participant, with their own progress. */
export interface BlindTestSummary {
  id: string;
  name: string;
  description: string;
  total: number;
  answered: number;
  completed: boolean;
}

export interface BlindTestProgress {
  /** image id -> the participant's answer */
  answers: Record<string, BlindTestLabel>;
  completedAt: string | null;
}

/** A test as the participant takes it; imageIds are in their own order. No labels. */
export interface BlindTest extends BlindTestProgress {
  id: string;
  name: string;
  description: string;
  imageIds: string[];
}

export interface BlindTestScore {
  answered: number;
  correct: number;
  /** 0.5 = chance: real and synthetic could not be told apart. */
  accuracy: number;
  /** Two-sided exact binomial test of correct/answered against 0.5. */
  pValue: number;
  syntheticCalledReal: number;
  confusion: {
    realAsReal: number;
    realAsSynthetic: number;
    syntheticAsReal: number;
    syntheticAsSynthetic: number;
  };
}

export interface BlindTestUserResult {
  userId: string;
  userRole: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  score: BlindTestScore;
}

export interface BlindTestImageResult {
  imageId: string;
  label: BlindTestLabel;
  source: Record<string, string>;
  votedReal: number;
  votedSynthetic: number;
}

/** Admins only: carries the answer key. */
export interface BlindTestResults {
  id: string;
  name: string;
  runId: string;
  active: boolean;
  pooled: BlindTestScore;
  users: BlindTestUserResult[];
  images: BlindTestImageResult[];
}

export interface IBlindTestRepository {
  list(): Promise<BlindTestSummary[]>;
  get(id: string): Promise<BlindTest>;
  answer(id: string, imageId: string, label: BlindTestLabel): Promise<BlindTestProgress>;
  complete(id: string): Promise<BlindTestProgress>;
  image(id: string, imageId: string): Promise<Blob>;
  results(id: string): Promise<BlindTestResults>;
}
