import { describe, expect, test } from 'vitest';
import { parseIndicatorText, cleanIndicatorText } from './indicatorUtils';

describe('indicatorUtils', () => {
  test('strips internal ID prefixes cleanly', () => {
    expect(cleanIndicatorText('IND-OP-4.1: Peningkatan Produktivitas')).toBe('Peningkatan Produktivitas');
    expect(cleanIndicatorText('IND-OC-1.1: Peningkatan Pendapatan')).toBe('Peningkatan Pendapatan');
    expect(cleanIndicatorText('IND_GOAL: penurunan stunting')).toBe('penurunan stunting');
    expect(cleanIndicatorText('Indikator tanpa prefix')).toBe('Indikator tanpa prefix');
  });

  test('parses code and text separately', () => {
    expect(parseIndicatorText('IND-OP-4.1: Peningkatan Produktivitas')).toEqual({
      code: 'IND-OP-4.1',
      text: 'Peningkatan Produktivitas'
    });
    expect(parseIndicatorText('Indikator murni')).toEqual({
      code: null,
      text: 'Indikator murni'
    });
    expect(parseIndicatorText(null)).toEqual({
      code: null,
      text: ''
    });
  });
});
