import { describe, expect, it } from 'vitest';
import { formatDate } from '../utils/date';

describe('formatDate', () => {
  it('formats as DD/MM/YYYY with zero padding', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
    expect(formatDate(new Date(2026, 9, 29, 14, 26))).toBe('29/10/2026');
  });
});
