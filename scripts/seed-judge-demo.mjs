/**
 * Seed a self-contained demo workspace for hackathon judges.
 *
 * WHAT THIS CREATES
 *   - one auth user (the judge), email pre-confirmed so there is no inbox round-trip
 *   - one organization, dedicated to judging and separate from any real tenant
 *   - the judge as `owner` of that organization
 *   - a finished Grant Writer project + canonical LFA document
 *   - the materialised program workspace: LFA -> WBS -> Budget -> MEAL
 *
 * WHY `owner` OF ONE ORG AND NOT A PLATFORM ADMIN
 *   Impactory has no global super-admin, and that is a feature. Authority is
 *   org-scoped and enforced by RLS (see tests/e2e/tenant-isolation.spec.ts).
 *   Making the judge `owner` of a dedicated org gives them every in-product
 *   power worth demonstrating — create, edit, delete, invite, manage — while
 *   the database still refuses to show them one row of anyone else's data.
 *   A platform-wide admin would hand a stranger every tenant's records to
 *   demonstrate features that org ownership already covers.
 *
 * CREDENTIALS
 *   Supplied through the environment, never through this file. Nothing secret
 *   is committed and the password is never printed back. See
 *   docs/HACKATHON_JUDGE_ACCESS.md for how to hand them to judges.
 *
 * USAGE
 *   node scripts/seed-judge-demo.mjs           # create or refresh the workspace
 *   node scripts/seed-judge-demo.mjs --reset   # delete the seeded content first
 */

import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.judge', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const JUDGE_EMAIL = process.env.JUDGE_EMAIL ?? '';
const JUDGE_PASSWORD = process.env.JUDGE_PASSWORD ?? '';
const ORG_NAME = process.env.JUDGE_ORG_NAME ?? 'Impactory Demo Org (Hackathon Review)';
const APP_URL = (process.env.JUDGE_APP_URL ?? 'https://impactory.vercel.app').replace(/\/+$/, '');
const RESET = process.argv.includes('--reset');

/**
 * The programme name stays Indonesian — it is real product content, not a
 * placeholder. Only the parenthetical marks it as the review fixture.
 */
const PROJECT_TITLE = 'Desa Digital Kopi Garut (Review Demo)';

/** Refuse to run rather than create a weak account someone forgets to delete. */
function preflight() {
  const missing = Object.entries({
    VITE_SUPABASE_URL: SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    JUDGE_EMAIL: JUDGE_EMAIL,
    JUDGE_PASSWORD: JUDGE_PASSWORD,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    fail(
      `Missing environment: ${missing.join(', ')}.\n` +
        'Copy .env.judge.example to .env.judge and fill it in. Never commit that file.',
    );
  }
  if (JUDGE_PASSWORD.length < 16) {
    fail('JUDGE_PASSWORD must be at least 16 characters. This account is handed to strangers.');
  }
  if (/^(password|changeme|impactory|judge|demo)/i.test(JUDGE_PASSWORD)) {
    fail('JUDGE_PASSWORD looks guessable. Generate a random one.');
  }
}

function fail(message) {
  console.error(`\n[seed] ${message}\n`);
  process.exit(1);
}

/** Supabase REST/auth call that throws with the response body on failure. */
async function api(path, { key, token, method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${token ?? key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Create the judge, or reuse and re-key the existing one so reruns are safe. */
async function ensureJudgeUser() {
  const existing = await api(
    `/auth/v1/admin/users?filter=${encodeURIComponent(JUDGE_EMAIL)}`,
    { key: SERVICE_KEY },
  );
  const found = (existing?.users ?? []).find(
    (u) => u.email?.toLowerCase() === JUDGE_EMAIL.toLowerCase(),
  );

  if (found) {
    // Reset the password so a rerun always matches what the docs hand out.
    await api(`/auth/v1/admin/users/${found.id}`, {
      key: SERVICE_KEY,
      method: 'PUT',
      body: { password: JUDGE_PASSWORD, email_confirm: true },
    });
    console.log(`[seed] Reusing judge user ${found.id}`);
    return found.id;
  }

  const created = await api('/auth/v1/admin/users', {
    key: SERVICE_KEY,
    method: 'POST',
    body: {
      email: JUDGE_EMAIL,
      password: JUDGE_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Juri Hackathon', is_demo_account: true },
    },
  });
  console.log(`[seed] Created judge user ${created.id}`);
  return created.id;
}

/** One organization, owned by the judge. RLS keeps them inside it. */
async function ensureOrganization(userId) {
  const existing = await api(
    `/rest/v1/organizations?name=eq.${encodeURIComponent(ORG_NAME)}&select=id`,
    { key: SERVICE_KEY },
  );
  let orgId = existing?.[0]?.id;

  if (!orgId) {
    const created = await api('/rest/v1/organizations', {
      key: SERVICE_KEY,
      method: 'POST',
      prefer: 'return=representation',
      body: {
        name: ORG_NAME,
        slug: `demo-juri-${Date.now()}`,
        created_by: userId,
      },
    });
    orgId = created[0].id;
    console.log(`[seed] Created organization ${orgId}`);
  } else {
    console.log(`[seed] Reusing organization ${orgId}`);
  }

  const membership = await api(
    `/rest/v1/organization_members?organization_id=eq.${orgId}&user_id=eq.${userId}&select=id,role`,
    { key: SERVICE_KEY },
  );

  if (!membership?.length) {
    await api('/rest/v1/organization_members', {
      key: SERVICE_KEY,
      method: 'POST',
      body: { organization_id: orgId, user_id: userId, role: 'owner' },
    });
    console.log('[seed] Granted role: owner');
  } else if (membership[0].role !== 'owner') {
    await api(`/rest/v1/organization_members?id=eq.${membership[0].id}`, {
      key: SERVICE_KEY,
      method: 'PATCH',
      body: { role: 'owner' },
    });
    console.log('[seed] Upgraded role to owner');
  } else {
    console.log('[seed] Role already owner');
  }

  return orgId;
}

/** Sign in as the judge so everything below is written under their own RLS. */
async function signInAsJudge() {
  const session = await api('/auth/v1/token?grant_type=password', {
    key: ANON_KEY,
    method: 'POST',
    body: { email: JUDGE_EMAIL, password: JUDGE_PASSWORD },
  });
  if (!session?.access_token) fail('Could not sign in as the judge account.');
  console.log('[seed] Signed in as judge');
  return session.access_token;
}

async function removePriorFixture(token, orgId) {
  const projects = await api(
    `/rest/v1/gw_projects?organization_id=eq.${orgId}&title=eq.${encodeURIComponent(PROJECT_TITLE)}&select=id`,
    { key: ANON_KEY, token },
  );
  for (const p of projects ?? []) {
    await api(`/rest/v1/gw_lfa_documents?project_id=eq.${p.id}`, {
      key: ANON_KEY,
      token,
      method: 'DELETE',
    });
    await api(`/rest/v1/gw_projects?id=eq.${p.id}`, { key: ANON_KEY, token, method: 'DELETE' });
    console.log(`[seed] Removed previous fixture project ${p.id}`);
  }
}

async function seedProgram(token, orgId, userId) {
  const skeleton = buildSkeleton();

  const project = await api('/rest/v1/gw_projects', {
    key: ANON_KEY,
    token,
    method: 'POST',
    prefer: 'return=representation',
    body: {
      title: PROJECT_TITLE,
      organization_id: orgId,
      created_by: userId,
      current_step: 4,
      status: 'completed',
      geography: 'Garut, Jawa Barat',
      duration_months: 24,
      budget_idr: 2500000000,
      wizard_data: {
        _mode: 'quick',
        organization: { orgName: ORG_NAME },
        program: {
          programTitle: PROJECT_TITLE,
          sector: 'Economic Development & Agriculture',
          targetDonor: 'International Coffee Fund',
        },
        budget: {
          beneficiaryCount: 300,
          geography: 'Garut, Jawa Barat',
          durationMonths: 24,
          budgetIdr: 2500000000,
        },
      },
    },
  });
  const projectId = project[0].id;
  console.log(`[seed] Created program ${projectId}`);

  const doc = await api('/rest/v1/gw_lfa_documents', {
    key: ANON_KEY,
    token,
    method: 'POST',
    prefer: 'return=representation',
    body: {
      project_id: projectId,
      organization_id: orgId,
      generated_by: userId,
      version: 1,
      matrix: {
        goal: { statement: skeleton.lfa.goal.statement },
        program_skeleton: skeleton,
      },
      proposal_markdown:
        `# ${PROJECT_TITLE}\n\n` +
        'Proposal contoh untuk penjurian: digitalisasi rantai pasok kopi ' +
        'bersama petani muda di Kabupaten Garut, Jawa Barat.\n',
      model: 'azure-gpt-4o-v2',
      donor_standard: 'un_oecd_dac',
      is_current: true,
    },
  });
  console.log(`[seed] Created canonical LFA document v${doc[0].version}`);

  return { projectId, documentId: doc[0].id, version: doc[0].version };
}

/**
 * Run the product's own materialisation RPC rather than hand-writing inserts
 * into ten tables. The judge then sees exactly what a real user would.
 */
async function materialize(token, documentId, version) {
  const result = await api('/rest/v1/rpc/materialize_grantwriter_document', {
    key: ANON_KEY,
    token,
    method: 'POST',
    body: {
      p_source_document_id: documentId,
      p_expected_document_version: version,
    },
  });
  console.log('[seed] Materialised program workspace: LFA -> WBS -> Budget -> MEAL');
  return result;
}

function buildSkeleton() {
  return {
    schemaVersion: '2.0',
    meta: {
      projectTitle: PROJECT_TITLE,
      sector: 'Economic Development & Agriculture',
      geography: {
        locationName: 'Kabupaten Garut',
        province: 'Jawa Barat',
        district: 'Cisurupan, Cikajang',
      },
      durationMonths: 24,
      budgetIdr: 2500000000,
      targetDonor: 'International Coffee Fund',
      donorStandard: 'un_oecd_dac',
      language: 'id',
      generatedAt: new Date().toISOString(),
      promptVersion: '2.0',
    },
    beneficiaries: {
      directHeadcount: 300,
      indirectHeadcount: 1500,
      primaryGroup: 'Petani Kopi Muda (15-24 Tahun)',
      ageRange: '15-24',
      geography: 'Garut, Jawa Barat',
      inclusionNotes:
        'Memprioritaskan petani muda dan perempuan pemroses pasca panen kopi.',
      suggestedDisaggregation: ['gender', 'age_group'],
    },
    lfa: {
      goal: {
        statement:
          'Meningkatkan pendapatan petani kopi muda di Kabupaten Garut melalui digitalisasi koperasi, branding kemasan, dan perluasan akses pasar online langsung.',
        indicators: [
          {
            id: 'g_ind_1',
            statement:
              'Pada akhir bulan ke-24, rata-rata pendapatan bulanan petani kopi muda mitra program meningkat sebesar 30%.',
            baseline: 'Rp 1.800.000/bulan',
            target: 'Rp 2.340.000/bulan',
            mov: 'Survei pendapatan akhir program',
          },
        ],
        assumptions: ['Harga kopi global tetap stabil.'],
      },
      purpose: {
        id: 'outcome_1',
        statement:
          'Meningkatnya rata-rata pendapatan 300 petani kopi muda minimal 30% dalam waktu 24 bulan.',
        indicators: [
          {
            id: 'pur_ind_1',
            statement:
              'Minimal 300 petani terdaftar mengalami peningkatan margin laba bersih minimal 30%.',
            baseline: '0% peningkatan',
            target: '100% dari 300 petani mencapai target',
            mov: 'Database transaksi koperasi dan kuesioner',
          },
        ],
        assumptions: ['Petani muda berkomitmen mengikuti pendampingan digital.'],
      },
      outcomes: [
        {
          id: 'outcome_2',
          statement:
            'Penerapan tata kelola koperasi yang transparan dan akuntabel berbasis dashboard digital rantai pasok.',
          indicators: [
            {
              id: 'out_ind_2',
              statement:
                '1 dashboard web koperasi aktif digunakan untuk mencatat 100% pasokan.',
              baseline: 'Pencatatan manual kertas',
              target: 'Pencatatan digital 100%',
              mov: 'Log server dashboard',
            },
          ],
          assumptions: ['Pengurus koperasi kooperatif mengadopsi software.'],
        },
      ],
      outputs: [
        {
          id: 'output_1',
          outcomeId: 'outcome_1',
          statement:
            '300 profil digital petani kopi muda dan pemetaan lahan terintegrasi dalam database.',
          indicators: [
            {
              id: 'out_ind_1_1',
              statement: '300 petani terdaftar memiliki ID profil digital lengkap.',
              baseline: '0 petani',
              target: '300 petani terdaftar',
              mov: 'Tautan database profil',
            },
          ],
          assumptions: ['Petani memberikan persetujuan pendataan.'],
        },
        {
          id: 'output_2',
          outcomeId: 'outcome_1',
          statement:
            '150 petani kopi muda terlatih aktif menjual produk melalui toko online/marketplace.',
          indicators: [
            {
              id: 'out_ind_2_1',
              statement:
                'Minimal 150 petani muda lulus pelatihan dan aktif melakukan penjualan online.',
              baseline: '0 petani',
              target: '150 petani aktif',
              mov: 'Laporan transaksi toko online',
            },
          ],
          assumptions: ['Sinyal seluler memadai di wilayah intervensi.'],
        },
      ],
    },
    wbs: {
      tasks: [
        {
          id: 't_1_1',
          parentId: null,
          sourceActivityId: 'output_1',
          level: 1,
          title: 'Output 1: Database Profil Petani Digital',
          description:
            'Kegiatan pendataan, survei koordinat lahan, dan pembuatan database digital.',
          durationWeeks: 12,
          startMonth: 1,
          endMonth: 3,
          sequenceOrder: 1,
          dependencies: [],
          deliverable: 'Database profil petani digital operasional',
          responsibleRole: 'Team Lapangan',
          milestone: false,
          isCriticalCandidate: true,
          confidence: 0.95,
        },
        {
          id: 't_1_1_sub1',
          parentId: 't_1_1',
          sourceActivityId: 'output_1',
          level: 2,
          title: 'Sensus dan Pemetaan Koordinat GPS Lahan Petani Kopi',
          description: 'Survei lapangan dan plotting koordinat GPS kebun petani.',
          durationWeeks: 8,
          startMonth: 1,
          endMonth: 2,
          sequenceOrder: 2,
          dependencies: [],
          deliverable: 'Peta digital koordinat lahan petani',
          responsibleRole: 'Team Lapangan',
          milestone: false,
          isCriticalCandidate: false,
          confidence: 0.9,
        },
        {
          id: 't_1_1_sub2',
          parentId: 't_1_1',
          sourceActivityId: 'output_1',
          level: 2,
          title: 'Pelatihan Literasi Digital Dasar Petani Kopi',
          description: 'Pelatihan dasar pengenalan smartphone dan internet sehat.',
          durationWeeks: 4,
          startMonth: 2,
          endMonth: 3,
          sequenceOrder: 3,
          dependencies: ['t_1_1_sub1'],
          deliverable: 'Materi dan sertifikat literasi digital dasar',
          responsibleRole: 'Spesialis Pelatihan',
          milestone: false,
          isCriticalCandidate: false,
          confidence: 0.95,
        },
      ],
    },
    budget_hints: {
      items: [
        {
          id: 'bh_1',
          taskId: 't_1_1_sub1',
          scope: 'activity_level',
          category: 'Honorarium',
          itemType: 'Fasilitator',
          description: 'Honorarium Fasilitator Sensus Lapangan',
          engineRule: 'sbm_lookup',
          quantity: 2,
          unit: 'Hari',
          duration: 1,
          participantCount: 0,
          suggestedRole: 'Fasilitator',
          province: 'Jawa Barat',
          requiresUserConfirmation: false,
          justification: 'Sesuai SBM 2026 Honorarium Narasumber/Fasilitator',
          confidence: 0.95,
        },
        {
          id: 'bh_2',
          taskId: 't_1_1_sub2',
          scope: 'activity_level',
          category: 'Konsumsi',
          itemType: 'Makan + 2 Snack',
          description: 'Konsumsi Pelatihan Literasi Digital',
          engineRule: 'sbm_lookup',
          quantity: 30,
          unit: 'Orang',
          duration: 1,
          participantCount: 30,
          suggestedRole: '',
          province: 'Jawa Barat',
          requiresUserConfirmation: false,
          justification: 'Sesuai SBM Konsumsi Rapat/Kegiatan',
          confidence: 0.9,
        },
      ],
    },
    meal: {
      indicators: [
        {
          id: 'm_ind_1',
          sourceLfaIndicatorId: 'pur_ind_1',
          name: 'Persentase Petani Kopi dengan Kenaikan Margin Laba',
          definition:
            'Jumlah petani yang mencatatkan margin laba naik minimal 30% dibagi total petani dampingan.',
          baselineValue: 0,
          baselineText: '0%',
          targetValue: 100,
          targetText: '100%',
          unit: 'Persen',
          frequency: 'quarterly',
          dataSource: 'Database Koperasi dan Marketplace',
          collectionMethod: 'Survei Berkala & Rekapitulasi Penjualan',
          responsibleRole: 'MEAL Specialist',
          verificationMethod: 'Survei triwulanan',
          disaggregation: ['gender', 'age_group'],
          formula: '(petani_laba_naik / 300) * 100',
          targetDeadlineMonth: 24,
          draftStatus: 'draft_ai_generated',
          confidence: 0.95,
        },
      ],
    },
    /**
     * SROI ships as an unvalidated draft on purpose. At design stage there is
     * no field data, so a computed ratio here would be a fabricated number.
     * The judge sees the model and its required inputs, flagged for validation.
     */
    sroi: {
      models: [
        {
          id: 's_mod_1',
          sourceOutcomeId: 'outcome_1',
          outcomeStatement:
            'Meningkatnya rata-rata pendapatan 300 petani kopi muda minimal 30% dalam waktu 24 bulan.',
          stakeholderGroup: 'Petani Kopi Muda',
          quantityHint: 300,
          durationYears: 2,
          financialProxyType:
            'Peningkatan laba bersih penjualan biji kopi (green beans)',
          suggestedProxyDescription:
            'Margin keuntungan tambahan yang diperoleh petani dari penjualan langsung ke koperasi digital dibanding tengkulak.',
          suggestedProxyValueIdr: 1500000,
          proxySourceRequired: true,
          deadweightPctDraft: 15,
          attributionPctDraft: 80,
          displacementPctDraft: 5,
          dropoffPctDraft: 10,
          rationale:
            'Petani memperoleh harga beli yang lebih tinggi dan adil melalui integrasi koperasi digital.',
          confidence: 0.9,
          requiresValidation: true,
        },
      ],
    },
    risks: [
      {
        id: 'r_ind_1',
        level: 'outcome',
        refId: 'outcome_1',
        description:
          'Ketidakstabilan sinyal seluler di perbukitan Garut mengganggu pencatatan transaksi.',
        likelihood: 'medium',
        impact: 'high',
        mitigation: 'Aplikasi pencatatan dilengkapi fitur sinkronisasi offline-first.',
        ownerRole: 'Tech Lead',
        trigger: 'Koneksi terputus > 24 jam',
        reviewFrequency: 'monthly',
        confidence: 0.9,
      },
    ],
  };
}

async function main() {
  preflight();

  console.log(`[seed] Target: ${SUPABASE_URL}`);
  const userId = await ensureJudgeUser();
  const orgId = await ensureOrganization(userId);
  const token = await signInAsJudge();

  await removePriorFixture(token, orgId);
  if (RESET) {
    console.log('\n[seed] --reset complete. Seeded content removed; account kept.\n');
    return;
  }

  const { projectId, documentId, version } = await seedProgram(token, orgId, userId);
  await materialize(token, documentId, version);

  printHandoff(projectId);
}

/**
 * Print the block the organiser pastes into the submission form. It contains
 * the password on purpose: handing over access is the whole point, and the
 * operator already knows it — they set it in .env.judge. What matters is that
 * it goes to a private channel and never into the repository.
 */
function printHandoff(projectId) {
  const line = '  ' + '-'.repeat(66);
  console.log(
    [
      '',
      '  Judge workspace ready. Copy the block below into the hackathon',
      '  submission form, or send it through the organisers\' private channel.',
      '',
      '  This output contains a password. Do not screenshot it, paste it into',
      '  the repository or README, or leave it visible while screen sharing.',
      '',
      line,
      '  IMPACTORY — REVIEWER ACCESS',
      '',
      `  URL       : ${APP_URL}/login`,
      `  Email     : ${JUDGE_EMAIL}`,
      `  Password  : ${JUDGE_PASSWORD}`,
      '',
      '  On the login page, choose the "Password" tab (the default is a',
      '  passwordless magic link, which would send mail to an inbox you do',
      '  not control).',
      '',
      '  You sign in as owner of a demo organisation prepared for review. It',
      '  is pre-loaded with one complete programme so nothing has to be built',
      '  from scratch. Suggested 5-minute path:',
      '',
      '    1. Grant Writer  — AI-drafted proposal and canonical logframe',
      '    2. LFA Builder   — goal, purpose, outcomes, outputs + indicators',
      `                       open "${PROJECT_TITLE}"`,
      '    3. WBS           — work breakdown, dependencies, critical path',
      '    4. Budget        — cost lines linked to tasks, priced against the',
      '                       Indonesian government SBM 2026 standard',
      '    5. MEAL          — indicators with baseline, target, frequency,',
      '                       disaggregation',
      '',
      '  A note on language. Module names in the sidebar are English, so you',
      '  can navigate without help. Action buttons inside a page are',
      '  Indonesian; these are the ones the path above needs:',
      '',
      '    Masuk                     Sign in',
      '    Mulai dari Nol            Start from scratch',
      '    Buat Program              Create programme',
      '    Simpan                    Save',
      '    Materialisasikan Sekarang Materialise now',
      '    Buka Program Workspace    Open programme workspace',
      '',
      '  The programme content itself is Indonesian by design, not for want of',
      '  translation: Impactory serves Indonesian civil society organisations,',
      '  and the logframe wording is tuned to how local donors read it. The',
      '  public marketing pages carry an English/Indonesian toggle.',
      '',
      '  SROI is deliberately left as an unvalidated draft. At design stage',
      '  there is no field data, so any ratio shown would be fabricated. The',
      '  model and the inputs it still needs are visible instead.',
      line,
      '',
      `  Project id: ${projectId}`,
      '',
    ].join('\n'),
  );
}

main().catch((err) => fail(err.message));
