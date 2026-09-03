import { mapWithConcurrency } from '../src/common/utils/parallelPool';

describe('mapWithConcurrency', () => {
  test('preserves order with concurrency cap', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    const result = await mapWithConcurrency(items, 2, async (n) => n * 2);
    expect(result).toEqual([2, 4, 6, 8, 10, 12]);
  });
});
