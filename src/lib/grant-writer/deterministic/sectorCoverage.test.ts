import { describe, test, expect } from 'vitest';
import { assembleCanonicalProposalV2 } from './assemble-canonical-proposal-v2';
import type { Page1Input } from './types';

/**
 * Every sector Impactory advertises must produce a logframe, not an empty one.
 *
 * The engine builds outcomes from outcome-family candidates. If no family's
 * signals match a programme's story, expandOutcomes has nothing to work with
 * and returns an empty proposal — no outcomes, no outputs, no indicators, no
 * budget. Silently: the assembler still reports validation PASS.
 *
 * That is what happened to water supply. OF-006 declares SECTOR-WASH-009,
 * IND-WASH-USE-018 and SDG 6.1 "air minum", but every one of its predicates
 * described SDG 6.2 sanitation — jamban, ODF, buang air sembarangan. A
 * sanitation programme worked; a piped-water programme came back blank.
 *
 * A count assertion would not have caught it either, since the failure is
 * total. This checks the floor: each programme yields at least one outcome
 * carrying at least one indicator.
 */

interface Programme extends Page1Input {
  label: string;
}

const PROGRAMMES: Programme[] = [
  {
    label: 'Air bersih perpipaan desa',
    program_title: 'Air Bersih Perpipaan dan Kelembagaan BUMDes Sembalun',
    location: 'Lombok Timur, NTB',
    duration_value: 20,
    beneficiary_count: 1500,
    beneficiary_unit: 'KK',
    funding_amount: 2_000_000_000,
    program_story:
      'Warga mengambil air dari mata air jauh karena jaringan perpipaan rusak. Program membangun ' +
      'bak penampung dan jaringan pipa, melatih pengurus BUMDes air, menyusun SOP tarif dan ' +
      'pemeliharaan, serta membentuk sistem iuran warga agar layanan air berkelanjutan.',
    expected_outcomes: 'Akses air layak meningkat, kelembagaan mandiri, layanan berkelanjutan.',
  },
  {
    label: 'Sambungan rumah air minum',
    program_title: 'Perluasan Sambungan Rumah Air Minum bagi Rumah Tangga Berpenghasilan Rendah',
    location: 'Bima, NTB',
    duration_value: 30,
    beneficiary_count: 2000,
    beneficiary_unit: 'KK',
    funding_amount: 3_500_000_000,
    program_story:
      'Rumah tangga berpenghasilan rendah membeli air dari pedagang keliling dengan harga berlipat ' +
      'karena belum tersambung jaringan PDAM. Program memasang sambungan rumah bersubsidi, ' +
      'mendampingi keluarga mengurus administrasi pelanggan, dan menyusun skema pembayaran bertahap.',
    expected_outcomes: 'Akses air minum layak meningkat, pengeluaran air rumah tangga turun.',
  },
  {
    label: 'Sanitasi sekolah',
    program_title: 'Sarana Sanitasi Sekolah dan Perilaku Cuci Tangan Pakai Sabun',
    location: 'Kupang, NTT',
    duration_value: 12,
    beneficiary_count: 900,
    beneficiary_unit: 'orang',
    funding_amount: 600_000_000,
    program_story:
      'Banyak sekolah dasar tidak memiliki jamban terpisah dan sarana cuci tangan sehingga siswa ' +
      'sering absen karena diare. Program merehabilitasi jamban sekolah, memasang wastafel, melatih ' +
      'guru dan komite sekolah, serta menjalankan kampanye perubahan perilaku.',
    expected_outcomes: 'Siswa menggunakan jamban sehat rutin, angka absensi turun.',
  },
  {
    label: 'Gizi dan posyandu',
    program_title: 'Posyandu Siaga Cegah Stunting dan Kelas Gizi Ibu Balita',
    location: 'Sumba Barat Daya, NTT',
    duration_value: 24,
    beneficiary_count: 600,
    beneficiary_unit: 'orang',
    funding_amount: 1_200_000_000,
    program_story:
      'Prevalensi stunting balita tinggi karena praktik pemberian makan tidak tepat dan pemantauan ' +
      'tumbuh kembang lemah. Program melatih kader posyandu, menyelenggarakan kelas gizi bagi ibu ' +
      'balita, mengadakan alat antropometri, dan menyusun SOP rujukan kasus gizi buruk.',
    expected_outcomes: 'Cakupan pemantauan naik, praktik pemberian makan membaik.',
  },
  {
    label: 'Pertanian dan koperasi',
    program_title: 'Sekolah Lapang Kopi Arabika dan Portal Ketertelusuran Panen',
    location: 'Garut, Jawa Barat',
    duration_value: 18,
    beneficiary_count: 240,
    beneficiary_unit: 'petani',
    funding_amount: 850_000_000,
    program_story:
      'Koperasi petani kopi arabika menjual ceri basah di bawah harga pasar karena mutu tidak ' +
      'konsisten. Program menyelenggarakan sekolah lapang budidaya dan pascapanen, membangun portal ' +
      'digital ketertelusuran panen, menyusun SOP mutu, dan memfasilitasi kemitraan pasar specialty.',
    expected_outcomes: 'Pendapatan petani meningkat, mutu konsisten, koperasi mandiri memasarkan.',
  },
];

describe('Cakupan sektor — tidak ada program yang menghasilkan logframe kosong', () => {
  test.each(PROGRAMMES.map((p) => [p.label, p] as const))('%s', (_label, programme) => {
    const { proposal } = assembleCanonicalProposalV2(programme);

    expect(proposal.outcomes.length, 'tidak ada outcome yang terbentuk').toBeGreaterThan(0);

    const indicators = proposal.outcomes.flatMap((oc) => [
      ...oc.indicators,
      ...oc.outputs.flatMap((op) => op.indicators),
    ]);
    expect(indicators.length, 'outcome terbentuk tetapi tanpa indikator').toBeGreaterThan(0);

    expect(
      proposal.outcomes.flatMap((oc) => oc.outputs).length,
      'outcome terbentuk tetapi tanpa output',
    ).toBeGreaterThan(0);
  });
});
