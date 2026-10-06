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

/** Notes are at most this many characters (main-service port.BlindTestNoteMaxLen). */
export const BLIND_TEST_NOTE_MAX = 2000;

export interface BlindTestProgress {
  /** image id -> the participant's answer */
  answers: Record<string, BlindTestLabel>;
  /** image id -> the participant's note (why real / synthetic); writable even after completion */
  notes: Record<string, string>;
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

/** Who joined through an invitation link (no platform account). */
export interface BlindTestGuestProfile {
  /** In capitals, Turkish letters in ASCII ("AYSE YILMAZ"). */
  name: string;
}

export interface BlindTestUserResult {
  userId: string;
  userRole: string;
  /** Set for people who joined through an invitation link. */
  guest: BlindTestGuestProfile | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  score: BlindTestScore;
}

export interface BlindTestImageNote {
  userId: string;
  /** The author's answer to this image; empty if not answered. */
  answer: BlindTestLabel | '';
  /** Whether the author's test is completed. */
  completed: boolean;
  note: string;
  updatedAt: string;
}

export interface BlindTestImageResult {
  imageId: string;
  label: BlindTestLabel;
  source: Record<string, string>;
  votedReal: number;
  votedSynthetic: number;
  notes: BlindTestImageNote[];
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

/** A shared invitation link to a set (admins). The link is /kor-test/katil/{token}. */
export interface BlindTestInvite {
  id: string;
  token: string;
  maxParticipants: number;
  participants: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

/** What a participant's test screen needs; the same for users and invited guests. */
export interface BlindTestParticipantApi {
  answer(imageId: string, label: BlindTestLabel): Promise<BlindTestProgress>;
  note(imageId: string, text: string): Promise<BlindTestProgress>;
  complete(): Promise<BlindTestProgress>;
  image(imageId: string): Promise<Blob>;
}

export interface IBlindTestRepository {
  list(): Promise<BlindTestSummary[]>;
  get(id: string): Promise<BlindTest>;
  answer(id: string, imageId: string, label: BlindTestLabel): Promise<BlindTestProgress>;
  complete(id: string): Promise<BlindTestProgress>;
  /** Writes the caller's note on an image; empty text removes it. */
  note(id: string, imageId: string, text: string): Promise<BlindTestProgress>;
  image(id: string, imageId: string): Promise<Blob>;
  results(id: string): Promise<BlindTestResults>;

  listInvites(id: string): Promise<BlindTestInvite[]>;
  createInvite(
    id: string,
    maxParticipants: number,
    expiresAt?: string | null
  ): Promise<BlindTestInvite>;
  updateInvite(
    id: string,
    inviteId: string,
    change: { active?: boolean; maxParticipants?: number }
  ): Promise<BlindTestInvite>;
}

// ── Invited guests (public, no platform account) ─────────────────────────────

export interface BlindTestInviteInfo {
  setName: string;
  description: string;
  images: number;
  participants: number;
  max: number;
  joinable: boolean;
  closed: boolean;
  expired: boolean;
}

export interface BlindTestJoin {
  name: string;
  pin: string;
  consent: boolean;
}

export interface BlindTestGuestSession {
  sessionToken: string;
  name: string;
}

/** Errors of the guest routes carry main-service's details.code (name_taken, invite_full, …). */
export interface BlindTestGuestError {
  status: number;
  code: string;
  message: string;
  details: Record<string, any>;
}

export interface IBlindTestGuestRepository {
  info(): Promise<BlindTestInviteInfo>;
  join(join: BlindTestJoin): Promise<BlindTestGuestSession>;
  resume(name: string, pin: string): Promise<BlindTestGuestSession>;
  /** The test of the session's person; the returned api answers as them. */
  test(session: string): Promise<{ test: BlindTest; api: BlindTestParticipantApi }>;
}
