import { describe, expect, it } from 'vitest';
import { orderBlocks } from '../orderEffect';

describe('orderBlocks', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];
  const truth = { a: 'real', b: 'real', c: 'synthetic', d: 'synthetic', e: 'real' } as const;

  it('scores consecutive blocks of the participant order', () => {
    const answers = { a: 'real', b: 'synthetic', c: 'synthetic', d: 'real', e: 'real' } as const;
    expect(orderBlocks(order, answers, truth, 2)).toEqual([
      { from: 1, to: 2, answered: 2, correct: 1, accuracy: 0.5 },
      { from: 3, to: 4, answered: 2, correct: 1, accuracy: 0.5 },
      { from: 5, to: 5, answered: 1, correct: 1, accuracy: 1 },
    ]);
  });

  it('leaves unanswered images out of the accuracy', () => {
    expect(orderBlocks(order, { a: 'real' }, truth, 5)).toEqual([
      { from: 1, to: 5, answered: 1, correct: 1, accuracy: 1 },
    ]);
    expect(orderBlocks(order, {}, truth, 5)[0]!.accuracy).toBeNull();
  });
});
