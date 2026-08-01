import { describe, expect, test } from 'vitest';
import { parseIndicatorText, cleanIndicatorText, stripRegistryCodes } from './indicatorUtils';

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

  /**
   * The shapes below are the ones the reasoning model actually emits when it
   * echoes the ontology grounding message back at us. The registry ids are
   * `IND-001`-style, not the `IND-OP-4.1` form the first pass was written for,
   * and they land mid-sentence as often as they land in front of it.
   */
  test('strips registry codes that appear mid-sentence', () => {
    expect(stripRegistryCodes('Prevalensi stunting (IND-001) di Desa Cikoneng'))
      .toBe('Prevalensi stunting di Desa Cikoneng');
    expect(stripRegistryCodes('Cakupan Posyandu [IND-WASH-USE-018] per bulan'))
      .toBe('Cakupan Posyandu per bulan');
    expect(stripRegistryCodes('Rujukan mengacu OF-003 dan SECTOR-007 sekaligus'))
      .toBe('Rujukan mengacu dan sekaligus');
  });

  test('strips the space-separated form the model produces', () => {
    expect(cleanIndicatorText('IND 01 Cakupan pemantauan pertumbuhan')).toBe('Cakupan pemantauan pertumbuhan');
    expect(cleanIndicatorText('IND 01: Cakupan pemantauan')).toBe('Cakupan pemantauan');
  });

  test('captures a leading code as a badge and keeps the rest clean', () => {
    expect(parseIndicatorText('IND-001: Persentase balita terpantau (IND-001)')).toEqual({
      code: 'IND-001',
      text: 'Persentase balita terpantau'
    });
  });

  test('leaves ordinary Indonesian text untouched', () => {
    const clean = 'Persentase balita 0-59 bulan yang dipantau setiap bulan di Posyandu';
    expect(stripRegistryCodes(clean)).toBe(clean);
    // Lowercase "of" and "act" are ordinary words, never registry codes.
    expect(stripRegistryCodes('Jumlah act of kindness tercatat')).toBe('Jumlah act of kindness tercatat');
    // "INDIKATOR" begins with the IND prefix but is not a code.
    expect(stripRegistryCodes('INDIKATOR 1 sudah terverifikasi')).toBe('INDIKATOR 1 sudah terverifikasi');
    // SDG targets look similar but are legitimate published references.
    expect(stripRegistryCodes('Selaras dengan SDG 6.1 air minum')).toBe('Selaras dengan SDG 6.1 air minum');
  });
});
