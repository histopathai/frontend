import type { BlindTestLabel } from '@/core/repositories/IBlindTestRepository';

export interface OrderBlock {
  /** 1-based positions in the participant's order, inclusive. */
  from: number;
  to: number;
  answered: number;
  correct: number;
  /** null when nothing in the block was answered. */
  accuracy: number | null;
}

/**
 * Accuracy of one participant in consecutive blocks of their own order: does
 * telling real from synthetic change over the test (fatigue, learning)?
 * Unanswered images count in no block's accuracy.
 */
export function orderBlocks(
  order: string[],
  answers: Record<string, BlindTestLabel>,
  truth: Record<string, BlindTestLabel>,
  size = 20
): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  for (let start = 0; start < order.length; start += size) {
    const ids = order.slice(start, start + size);
    const answered = ids.filter((id) => answers[id] && truth[id]);
    const correct = answered.filter((id) => answers[id] === truth[id]).length;
    blocks.push({
      from: start + 1,
      to: start + ids.length,
      answered: answered.length,
      correct,
      accuracy: answered.length ? correct / answered.length : null,
    });
  }
  return blocks;
}
