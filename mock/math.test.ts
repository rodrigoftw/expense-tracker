import { describe, test, expect } from '@jest/globals';
import { add } from './math.ts';

describe('Math functions', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
  });
});
