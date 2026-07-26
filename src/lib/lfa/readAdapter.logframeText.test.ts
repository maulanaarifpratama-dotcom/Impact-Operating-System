import { describe, test, expect } from 'vitest';
import { assembleCanonicalProposalV2 } from '@/lib/grant-writer/deterministic/assemble-canonical-proposal-v2';
import { mapCanonicalProposalToRawEntries } from './readAdapter';

/**
 * The logframe text a programme officer actually reads.
 *
 * readAdapter interpolates indicator and cost-driver fields into the strings
 * stored on lfa_entries. It used to read ind.code, ind.data_source and
 * cd.resource_name, none of which exist on IndicatorV2 or CostDriverV2, so the
 * indicator column rendered "undefined: Peningkatan Rata-rata Pendapatan..."
 * and the means-of-verification column came out empty — .filter(Boolean) was
 * dropping a list of undefined.
 *
 * That survived because every existing test checked structure and counts.
 * Nothing read the sentences. These assertions do.
 */

const SEKOLAH_LAPANG_KOPI = {
  program_title: 'Sekolah Lapang Kopi Arabika dan Portal Ketertelusuran Panen',
  location: 'Kabupaten Garut, Jawa Barat',
  duration_value: 18,
  duration_unit: 'bulan',
  beneficiary_description: 'Petani kopi arabika anggota koperasi di lereng Gunung Papandayan',
  beneficiary_count: 240,
  beneficiary_unit: 'petani',
  funding_amount: 850_000_000,
  currency: 'IDR',
  program_story:
    'Koperasi petani kopi arabika di lereng Gunung Papandayan menjual ceri basah ke tengkulak ' +
    'dengan harga jauh di bawah pasar karena mutu panen tidak konsisten dan tidak ada catatan ' +
    'asal-usul biji. Program ini menyelenggarakan sekolah lapang budidaya dan pascapanen bagi ' +
    '240 petani, membangun portal digital ketertelusuran panen yang mencatat lot, tanggal petik ' +
    'dan hasil uji cita rasa, menyusun SOP mutu pascapanen bersama koperasi, serta memfasilitasi ' +
    'kemitraan pasar dengan pembeli specialty. Sasaran akhirnya pendapatan bersih petani naik dan ' +
    'koperasi mampu menembus pasar kopi specialty secara mandiri.',
  proposed_solution:
    'Sekolah lapang, portal ketertelusuran digital, SOP mutu pascapanen, dan kemitraan offtaker.',
  expected_outcomes:
    'Pendapatan bersih petani meningkat, mutu panen konsisten, koperasi mandiri memasarkan.',
};

describe('Teks logframe tersimpan (readAdapter)', () => {
  const { proposal } = assembleCanonicalProposalV2(SEKOLAH_LAPANG_KOPI);
  const entries = mapCanonicalProposalToRawEntries(proposal);

  test('program menghasilkan entri logframe', () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.indicator)).toBe(true);
  });

  test('tidak ada "undefined" yang bocor ke teks yang dibaca pengguna', () => {
    for (const entry of entries) {
      for (const field of ['description', 'indicator', 'means_of_verification', 'responsible_party'] as const) {
        const value = entry[field];
        if (typeof value !== 'string') continue;
        expect(value, `${field} pada entri ${entry.level} memuat "undefined"`).not.toMatch(/\bundefined\b/);
        expect(value, `${field} pada entri ${entry.level} memuat "[object Object]"`).not.toContain('[object Object]');
      }
    }
  });

  test('setiap indikator membawa id dan cara verifikasinya', () => {
    const withIndicator = entries.filter((e) => e.indicator);
    expect(withIndicator.length).toBeGreaterThan(0);

    for (const entry of withIndicator) {
      // "IND-OC-1.1: Peningkatan Rata-rata Pendapatan ..." — the id prefix is
      // what links the sentence back to the canonical indicator it came from.
      expect(entry.indicator, `indikator pada ${entry.level} kehilangan awalan id`).toMatch(/IND-[A-Z0-9.-]+:/);
      expect(
        entry.means_of_verification,
        `indikator pada ${entry.level} tidak punya cara verifikasi`,
      ).toBeTruthy();
    }
  });
});
