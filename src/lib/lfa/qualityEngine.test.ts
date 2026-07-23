import { describe, test, expect } from 'vitest';
import { mapToCanonicalLfaView } from './readAdapter';
import { evaluateLfaQuality } from './qualityEngine';
import { RawLfaProject, RawLfaEntry } from './types';

const mockProject: RawLfaProject = {
  id: 'proj-quality-test',
  org_id: 'org-test',
  name: 'Program Kualitas LFA',
  created_at: '2026-07-23T00:00:00Z',
  beneficiary_description: '1,200 petani skala kecil dan 50 KKG guru',
  beneficiary_count: 1200
};

const createEntry = (
  id: string,
  level: 'goal' | 'purpose' | 'output' | 'activity',
  description: string,
  indicator?: string,
  movText?: string,
  seq: number = 1,
  parentId?: string,
  projectId: string = mockProject.id,
  orgId: string = mockProject.org_id
): RawLfaEntry => ({
  id,
  project_id: projectId,
  org_id: orgId,
  level,
  description,
  sequence: seq,
  parent_id: parentId || null,
  indicator: indicator || null,
  means_of_verification: movText || null,
  created_at: '2026-07-23T00:00:00Z'
});

describe('RC-8C LFA Quality Engine Tests', () => {
  test('Task 1 & 9: Attaches qualityAssessment to CanonicalLfaView without breaking generation flow', () => {
    const entries: RawLfaEntry[] = [
      createEntry('e1', 'goal', 'Meningkatkan kesejahteraan petani'),
      createEntry('e2', 'purpose', 'Meningkatkan produktivitas dan adopsi pupuk organik', undefined, undefined, 1, 'e1'),
      createEntry('e3', 'output', '50 kelompok tani dilatih pembuatan kompos', undefined, undefined, 1, 'e2'),
      createEntry('e4', 'activity', 'Mengadakan pelatihan pupuk organik bagi kader tani', undefined, undefined, 1, 'e3')
    ];

    const view = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: entries
    });

    expect(view.qualityAssessment).toBeDefined();
    expect(view.qualityAssessment?.readinessTier).toBeDefined();
    expect(view.qualityAssessment?.vectors.causalLogic).toBeDefined();
    expect(view.qualityAssessment?.vectors.outcomeQuality).toBeDefined();
    expect(view.qualityAssessment?.vectors.actorClarity).toBeDefined();
    expect(view.qualityAssessment?.vectors.mealReadiness).toBeDefined();
    expect(view.qualityAssessment?.vectors.sustainability).toBeDefined();
  });

  test('Task 2: DIM-CAUSAL - Evaluates causal logic completeness and orphan nodes', () => {
    // Complete causal chain
    const entriesComplete = [
      createEntry('e1', 'goal', 'Meningkatkan kesehatan masyarakat'),
      createEntry('e2', 'purpose', 'Meningkatkan adopsi sanitasi Wusan oleh warga', undefined, undefined, 1, 'e1'),
      createEntry('e3', 'output', '10 unit fasilitas air bersih dibangun', undefined, undefined, 1, 'e2'),
      createEntry('e4', 'activity', 'Konstruksi fasilitas sanitasi Wusan', undefined, undefined, 1, 'e3')
    ];

    const viewComplete = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: entriesComplete
    });

    const causal = viewComplete.qualityAssessment?.vectors.causalLogic;
    expect(causal?.status).toBe('COMPLETE');
    expect(causal?.scoreConfidence).toBeGreaterThanOrEqual(0.90);

    // Incomplete causal chain (no goal/purpose)
    const entriesIncomplete = [
      createEntry('e3', 'output', '10 unit fasilitas air bersih dibangun'),
      createEntry('e4', 'activity', 'Konstruksi fasilitas sanitasi Wusan')
    ];

    const viewIncomplete = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: entriesIncomplete
    });

    const causalIncomplete = viewIncomplete.qualityAssessment?.vectors.causalLogic;
    expect(causalIncomplete?.status).toBe('INCOMPLETE');
  });

  test('Task 3: DIM-OUTCOME - Evaluates outcome materialization and activity masquerading', () => {
    const entriesTrueOutcome = [
      createEntry('e1', 'goal', 'Peningkatan resiliensi pangan'),
      createEntry('e2', 'purpose', 'Meningkatkan adopsi benih unggul dan pendapatan petani sebesar 30%', undefined, undefined, 1, 'e1'),
      createEntry('e3', 'output', '100 paket benih disalurkan', undefined, undefined, 1, 'e2'),
      createEntry('e4', 'activity', 'Distribusi benih ke kelompok tani', undefined, undefined, 1, 'e3')
    ];

    const view = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: entriesTrueOutcome
    });

    const outcomeVector = view.qualityAssessment?.vectors.outcomeQuality;
    expect(outcomeVector?.status).toBe('COMPLETE');
    expect(outcomeVector?.scoreConfidence).toBeGreaterThanOrEqual(0.85);
  });

  test('Task 4: DIM-ACTOR - Evaluates beneficiary and target actor clarity', () => {
    const story = 'Program menyasar 1,200 petani kecil dan kader tani lokal yang bertindak sebagai agen perubahan.';
    const view = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [createEntry('e1', 'goal', 'Tujuan program')]
    });

    const actorResult = evaluateLfaQuality(view, story).vectors.actorClarity;
    expect(actorResult.status).toBe('COMPLETE');
  });

  test('Task 5: DIM-MEAL - Evaluates baseline, target metric, unit, and MoV', () => {
    const storyWithMeal = 'Baseline awal tingkat adopsi adalah 15%. Target meningkat menjadi 60% petani. Verifikasi melalui survei akhir edra.';
    const view = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [
        createEntry('e1', 'goal', 'Tujuan', 'Tingkat adopsi petani', 'Survei edra')
      ]
    });

    const mealResult = evaluateLfaQuality(view, storyWithMeal).vectors.mealReadiness;
    expect(mealResult.status).toBe('COMPLETE');
    expect(mealResult.activeMissingRules).not.toContain('MISS-010');
  });

  test('Task 6: DIM-SUSTAIN - Evaluates institutional ownership and transition SOP', () => {
    const storySustain = 'Pemerintah daerah melalui Puskesmas dan Dinas Kesehatan menandatangani SOP integrasi dan MoU keberlanjutan.';
    const view = mapToCanonicalLfaView({
      rawProject: mockProject,
      rawEntries: [createEntry('e1', 'goal', 'Tujuan')]
    });

    const sustainResult = evaluateLfaQuality(view, storySustain).vectors.sustainability;
    expect(sustainResult.status).toBe('COMPLETE');
  });

  test('Task 7 & 8: Readiness Tier evaluation and Repair Prompt generation', () => {
    const view = mapToCanonicalLfaView({
      rawProject: {
        id: 'proj-empty',
        org_id: 'org-test',
        name: 'Empty Project',
        beneficiary_description: null,
        beneficiary_count: null
      },
      rawEntries: []
    });

    const assessment = view.qualityAssessment!;
    expect(assessment).toBeDefined();
    expect(assessment.readinessTier).toBe('TIER_3_NEEDS_REPAIR');
    expect(assessment.blockingIssueCount).toBeGreaterThan(0);
    expect(assessment.vectors.causalLogic.repairActionPrompts.length).toBeGreaterThan(0);
  });

  test('Task 10 & 11: Evaluate GOLD Fixture Profiles (12 Fixtures)', () => {
    const goldFixtures = [
      { id: 'FIX-GOLD-01', name: 'Agri Agritech Extension', story: '1,000 petani produktivitas meningkat 25% baseline 10% unit ton verifikasi survei edra mitra dinas pertanian SOP MoU' },
      { id: 'FIX-GOLD-02', name: 'Health Maternal Care', story: '500 ibu hamil kader kesehatan puskesmas baseline 5% target 80% verifikasi audit medis SOP dinas' },
      { id: 'FIX-GOLD-03', name: 'Edu Early Literacy', story: '2,000 siswa 100 guru sekolah KKG baseline 20% target 70% verifikasi tes egra SOP dinas pendidikan' },
      { id: 'FIX-GOLD-04', name: 'WASH Community Water', story: '3,000 warga kelompok Wusan desa air bersih baseline 30% target 90% verifikasi uji laboratorium MoU pemerintah' },
      { id: 'FIX-GOLD-05', name: 'Climate Mangrove Restoration', story: '5,000 nelayan kelompok tani mangrove baseline 0 hektar target 50 hektar verifikasi petaan drone SOP DLH' },
      { id: 'FIX-GOLD-06', name: 'Financial Literacy MSME', story: '800 UMKM pelaku usaha wanita baseline 12% target 50% verifikasi log keuangan pks bank' },
      { id: 'FIX-GOLD-07', name: 'Youth Vocational Skills', story: '400 pemuda lulusan SMK industri baseline 10% target 75% verifikasi sertifikat kaji MoU industri' },
      { id: 'FIX-GOLD-08', name: 'Nutrition Stunting Prevention', story: '1,500 balita kader posyandu puskesmas baseline 28% target 14% verifikasi pencatatan KMS SOP dinas' },
      { id: 'FIX-GOLD-09', name: 'Civic Tech Open Data', story: '50 OPD staf pemda admin publik baseline 0 portal target 10 dataset verifikasi log audit sistem MoU pks' },
      { id: 'FIX-GOLD-10', name: 'Disaster Risk Reduction', story: '20 desa pengurus KSB BPBD baseline 2 desa target 20 desa verifikasi kaji dokumen SOP BPBD' },
      { id: 'FIX-GOLD-11', name: 'Gender Empowerment', story: '600 perempuan pengurus KAP kelompok usaha baseline 15% target 65% verifikasi survei MoU dinas pemberdayaan' },
      { id: 'FIX-GOLD-12', name: 'Renewable Energy Microgrid', story: '500 KK pengurus BUMDes teknisi lokal baseline 0 kWh target 500 kWh verifikasi log PLN SOP pemda' }
    ];

    for (const fix of goldFixtures) {
      const orgId = 'org-gold';
      const view = mapToCanonicalLfaView({
        rawProject: {
          id: fix.id,
          org_id: orgId,
          name: fix.name,
          beneficiary_description: fix.story,
          beneficiary_count: 1000,
          created_at: '2026-07-23T00:00:00Z'
        },
        rawEntries: [
          createEntry('e1', 'goal', 'Meningkatkan dampak jangka panjang', undefined, undefined, 1, undefined, fix.id, orgId),
          createEntry('e2', 'purpose', 'Meningkatkan adopsi dan kinerja program', undefined, undefined, 1, 'e1', fix.id, orgId),
          createEntry('e3', 'output', 'Output pelatihan dan fasilitas disalurkan', undefined, undefined, 1, 'e2', fix.id, orgId),
          createEntry('e4', 'activity', 'Kegiatan pendampingan dan konstruksi', undefined, undefined, 1, 'e3', fix.id, orgId)
        ]
      });

      const assessment = evaluateLfaQuality(view, fix.story);
      expect(assessment.readinessTier).not.toBe('TIER_3_NEEDS_REPAIR');
      expect(['TIER_1_PRODUCTION_READY', 'TIER_2_BLUEPRINT_VIABLE']).toContain(assessment.readinessTier);
    }
  });
});
