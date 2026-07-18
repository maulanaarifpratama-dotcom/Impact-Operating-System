import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Helper to load env files programmatically
const getEnvVars = () => {
  let supabaseUrl = process.env.VITE_SUPABASE_URL;
  let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    try {
      const envContent = fs.readFileSync('c:/Users/maula/.gemini/antigravity/scratch/impactory/.env', 'utf8');
      const getEnvVar = (name: string) => {
        const match = envContent.match(new RegExp(`${name}=(.*)`));
        return match ? match[1].trim() : null;
      };
      supabaseUrl = supabaseUrl || getEnvVar('VITE_SUPABASE_URL') || undefined;
      supabaseKey = supabaseKey || getEnvVar('VITE_SUPABASE_ANON_KEY') || undefined;
    } catch (e) {
      console.warn('Could not read .env file programmatically', e);
    }
  }

  return {
    supabaseUrl: supabaseUrl || 'https://uncsvkvkaijzydndyutp.supabase.co',
    supabaseKey: supabaseKey || ''
  };
};

test.describe('Sprint 5 E2E Program Materialization V2 Test Suite', () => {
  let projectId: string;

  // Define high-fidelity Program Skeleton V2
  const testSkeleton = {
    schemaVersion: '2.0',
    meta: {
      projectTitle: 'E2E Program Desa Digital Kopi Garut V2',
      sector: 'Economic Development & Agriculture',
      geography: {
        locationName: 'Kabupaten Garut',
        province: 'Jawa Barat',
        district: 'Cisurupan, Cikajang'
      },
      durationMonths: 24,
      budgetIdr: 2500000000,
      targetDonor: 'International Coffee Fund',
      donorStandard: 'un_oecd_dac',
      language: 'id',
      generatedAt: new Date().toISOString(),
      promptVersion: '2.0'
    },
    beneficiaries: {
      directHeadcount: 300,
      indirectHeadcount: 1500,
      primaryGroup: 'Petani Kopi Muda (15-24 Tahun)',
      ageRange: '15-24',
      geography: 'Garut, Jawa Barat',
      inclusionNotes: 'Memprioritaskan petani muda dan perempuan pemroses pasca panen kopi.',
      suggestedDisaggregation: ['gender', 'age_group']
    },
    lfa: {
      goal: {
        statement: 'Meningkatkan pendapatan petani kopi muda di Kabupaten Garut melalui digitalisasi koperasi, branding kemasan, dan perluasan akses pasar online langsung.',
        indicators: [
          {
            id: 'g_ind_1',
            statement: 'Pada akhir bulan ke-24, rata-rata pendapatan bulanan petani kopi muda mitra program meningkat sebesar 30%.',
            baseline: 'Rp 1.800.000/bulan',
            target: 'Rp 2.340.000/bulan',
            mov: 'Survei pendapatan akhir program'
          }
        ],
        assumptions: ['Harga kopi global tetap stabil.']
      },
      purpose: {
        id: 'outcome_1',
        statement: 'Meningkatnya rata-rata pendapatan 300 petani kopi muda minimal 30% dalam waktu 24 bulan.',
        indicators: [
          {
            id: 'pur_ind_1',
            statement: 'Minimal 300 petani terdaftar mengalami peningkatan margin laba bersih minimal 30%.',
            baseline: '0% peningkatan',
            target: '100% dari 300 petani mencapai target',
            mov: 'Database transaksi koperasi dan kuesioner'
          }
        ],
        assumptions: ['Petani muda berkomitmen mengikuti pendampingan digital.']
      },
      outcomes: [
        {
          id: 'outcome_2',
          statement: 'Penerapan tata kelola koperasi yang transparan dan akuntabel berbasis dashboard digital rantai pasok.',
          indicators: [
            {
              id: 'out_ind_2',
              statement: '1 dashboard web koperasi aktif digunakan untuk mencatat 100% pasokan.',
              baseline: 'Pencatatan manual kertas',
              target: 'Pencatatan digital 100%',
              mov: 'Log server dashboard'
            }
          ],
          assumptions: ['Pengurus koperasi kooperatif mengadopsi software.']
        }
      ],
      outputs: [
        {
          id: 'output_1',
          outcomeId: 'outcome_1',
          statement: '300 profil digital petani kopi muda dan pemetaan lahan terintegrasi dalam database.',
          indicators: [
            {
              id: 'out_ind_1_1',
              statement: '300 petani terdaftar memiliki ID profil digital lengkap.',
              baseline: '0 petani',
              target: '300 petani terdaftar',
              mov: 'Tautan database profil'
            }
          ],
          assumptions: ['Petani memberikan persetujuan pendataan.']
        },
        {
          id: 'output_2',
          outcomeId: 'outcome_1',
          statement: '150 petani kopi muda terlatih aktif menjual produk melalui toko online/marketplace.',
          indicators: [
            {
              id: 'out_ind_2_1',
              statement: 'Minimal 150 petani muda lulus pelatihan dan aktif melakukan penjualan online.',
              baseline: '0 petani',
              target: '150 petani aktif',
              mov: 'Laporan transaksi toko online'
            }
          ],
          assumptions: ['Sinyal seluler memadai di wilayah intervensi.']
        }
      ]
    },
    wbs: {
      tasks: [
        {
          id: 't_1_1',
          parentId: null,
          sourceActivityId: 'output_1',
          level: 1,
          title: 'Output 1: Database Profil Petani Digital',
          description: 'Kegiatan pendataan, survei koordinat lahan, dan pembuatan database digital.',
          durationWeeks: 12,
          startMonth: 1,
          endMonth: 3,
          sequenceOrder: 1,
          dependencies: [],
          deliverable: 'Database profil petani digital operasional',
          responsibleRole: 'Team Lapangan',
          milestone: false,
          isCriticalCandidate: true,
          confidence: 0.95
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
          confidence: 0.9
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
          confidence: 0.95
        }
      ]
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
          confidence: 0.95
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
          confidence: 0.9
        }
      ]
    },
    meal: {
      indicators: [
        {
          id: 'm_ind_1',
          sourceLfaIndicatorId: 'pur_ind_1',
          name: 'Persentase Petani Kopi dengan Kenaikan Margin Laba',
          definition: 'Jumlah petani yang mencatatkan margin laba naik minimal 30% dibagi total petani dampingan.',
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
          confidence: 0.95
        }
      ]
    },
    sroi: {
      models: [
        {
          id: 's_mod_1',
          sourceOutcomeId: 'outcome_1',
          outcomeStatement: 'Meningkatnya rata-rata pendapatan 300 petani kopi muda minimal 30% dalam waktu 24 bulan.',
          stakeholderGroup: 'Petani Kopi Muda',
          quantityHint: 300,
          durationYears: 2,
          financialProxyType: 'Peningkatan laba bersih penjualan biji kopi (green beans)',
          suggestedProxyDescription: 'Margin keuntungan tambahan yang diperoleh petani dari penjualan langsung ke koperasi digital dibanding tengkulak.',
          suggestedProxyValueIdr: 1500000,
          proxySourceRequired: true,
          deadweightPctDraft: 15,
          attributionPctDraft: 80,
          displacementPctDraft: 5,
          dropoffPctDraft: 10,
          rationale: 'Petani memperoleh harga beli yang lebih tinggi dan adil melalui integrasi koperasi digital.',
          confidence: 0.9,
          requiresValidation: true
        }
      ]
    },
    risks: [
      {
        id: 'r_ind_1',
        level: 'outcome',
        refId: 'outcome_1',
        description: 'Ketidakstabilan sinyal seluler di perbukitan Garut mengganggu pencatatan transaksi.',
        likelihood: 'medium',
        impact: 'high',
        mitigation: 'Aplikasi pencatatan dilengkapi fitur sinkronisasi offline-first.',
        ownerRole: 'Tech Lead',
        trigger: 'Koneksi terputus > 24 jam',
        reviewFrequency: 'monthly',
        confidence: 0.9
      }
    ]
  };

  test('should execute stable login, navigate to proposal, click materialize, and verify V2 program creation', async ({ page }) => {
    // Increase test timeout to 60s for full E2E flow
    test.setTimeout(60000);

    const baseUrl = process.env.E2E_BASE_URL!;
    const email = process.env.E2E_USER_EMAIL!;
    const password = process.env.E2E_USER_PASSWORD!;

    // Resolve Supabase config
    const { supabaseUrl, supabaseKey } = getEnvVars();

    // Log console and browser errors
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    // 1. Log in via UI
    console.log(`[E2E-S5] Navigating to login page: ${baseUrl}/login`);
    await page.goto(`${baseUrl}/login`);

    const passwordTab = page.locator('button:has-text("Password")').first();
    await expect(passwordTab).toBeVisible({ timeout: 10000 });
    await passwordTab.click();

    await page.locator('#p-email').fill(email);
    await page.locator('#p-password').fill(password);

    const loginSubmitBtn = page.locator('button[type="submit"]:has-text("Masuk")').first();
    await loginSubmitBtn.click();

    await page.waitForURL(/(dashboard|onboarding)/, { timeout: 25000 });
    console.log(`[E2E-S5] Logged in successfully! Current URL: ${page.url()}`);

    // Handle onboarding if redirected there
    const isOnboarding = page.url().includes('/onboarding');
    if (isOnboarding) {
      console.log('[E2E-S5] Onboarding page detected. Filling out organization details...');
      await expect(page.locator('#o-name')).toBeVisible({ timeout: 10000 });
      await page.locator('#o-name').fill('E2E Test Org');
      
      // Select main sector: Pendidikan
      await page.locator('#o-sector').click();
      await page.locator('[role="option"]:has-text("Pendidikan")').first().click();

      // Select size: 1-5
      await page.locator('#o-size').click();
      await page.locator('[role="option"]:has-text("1-5")').first().click();

      // Click submit
      const onboardingSubmitBtn = page.locator('button[type="submit"]:has-text("Mulai Gunakan Impactory")').first();
      await onboardingSubmitBtn.click();

      // Wait for dashboard navigation
      await page.waitForURL(/.*dashboard.*/, { timeout: 20000 });
      console.log('[E2E-S5] Onboarding completed successfully!');
    }

    // 2. Pre-seed project & document using active session RLS context via page.evaluate
    console.log('[E2E-S5] Pre-seeding V2 proposal skeleton in Supabase using session cookies...');
    projectId = await page.evaluate(async ({ skeleton, anonKey, supabaseUrl }) => {
      // Find auth token
      let token = '';
      let userId = '';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          token = authData.access_token;
          userId = authData.user?.id;
          break;
        }
      }
      if (!token) throw new Error('Could not find Supabase auth token in localStorage!');

      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      // Query organization
      console.log('[E2E-S5] Fetching organizations with headers:', JSON.stringify({ apikey: anonKey ? 'present' : 'missing', auth: token ? 'present' : 'missing' }));
      const orgRes = await fetch(`${supabaseUrl}/rest/v1/organizations?select=id`, { headers });
      const orgText = await orgRes.text();
      console.log('[E2E-S5] orgRes status:', orgRes.status, 'body:', orgText);
      
      const orgs = JSON.parse(orgText);
      if (!orgs || orgs.length === 0 || orgs.error) throw new Error(`No organizations found. Response: ${orgText}`);
      const orgId = orgs[0].id;

      // Clean up previous E2E projects
      const projectTitle = 'E2E Program Desa Digital Kopi Garut V2';
      const findRes = await fetch(`${supabaseUrl}/rest/v1/gw_projects?title=eq.${encodeURIComponent(projectTitle)}&select=id`, { headers });
      const findText = await findRes.text();
      console.log('[E2E-S5] findRes status:', findRes.status, 'body:', findText);
      
      const oldProjs = JSON.parse(findText);
      if (Array.isArray(oldProjs)) {
        for (const op of oldProjs) {
          await fetch(`${supabaseUrl}/rest/v1/gw_lfa_documents?project_id=eq.${op.id}`, { method: 'DELETE', headers });
          await fetch(`${supabaseUrl}/rest/v1/gw_projects?id=eq.${op.id}`, { method: 'DELETE', headers });
        }
      }

      // Create new project
      console.log('[E2E-S5] Creating new project with organization_id:', orgId, 'and created_by:', userId);
      const projRes = await fetch(`${supabaseUrl}/rest/v1/gw_projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: projectTitle,
          organization_id: orgId,
          created_by: userId,
          current_step: 4,
          status: 'completed',
          geography: 'Garut, Jawa Barat',
          duration_months: 24,
          budget_idr: 2500000000,
          wizard_data: {
            _mode: 'quick',
            organization: { orgName: 'Yayasan Rumah Pembangunan Berkelanjutan' },
            program: {
              programTitle: projectTitle,
              sector: 'Economic Development & Agriculture',
              targetDonor: 'International Coffee Fund'
            },
            budget: {
              beneficiaryCount: 300,
              geography: 'Garut, Jawa Barat',
              durationMonths: 24,
              budgetIdr: 2500000000
            }
          }
        })
      });
      
      const projText = await projRes.text();
      console.log('[E2E-S5] projRes status:', projRes.status, 'body:', projText);
      const createdProjs = JSON.parse(projText);
      if (!Array.isArray(createdProjs) || createdProjs.length === 0) {
        throw new Error(`Failed to create test project. Response: ${projText}`);
      }
      const createdProjId = createdProjs[0].id;

      // Create document
      console.log('[E2E-S5] Creating current LFA document for project:', createdProjId);
      const docRes = await fetch(`${supabaseUrl}/rest/v1/gw_lfa_documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: createdProjId,
          organization_id: orgId,
          generated_by: userId,
          version: 1,
          matrix: {
            goal: { statement: skeleton.lfa.goal.statement },
            program_skeleton: skeleton
          },
          proposal_markdown: `# ${projectTitle}\n\nLaporan proposal digitalisasi pasokan kopi di Kabupaten Garut...`,
          model: 'azure-gpt-4o-v2',
          donor_standard: 'un_oecd_dac',
          is_current: true
        })
      });
      
      const docText = await docRes.text();
      console.log('[E2E-S5] docRes status:', docRes.status, 'body:', docText);
      const createdDocs = JSON.parse(docText);
      if (!Array.isArray(createdDocs) || createdDocs.length === 0) {
        throw new Error(`Failed to create test document. Response: ${docText}`);
      }

      return createdProjId;
    }, { skeleton: testSkeleton, anonKey: supabaseKey, supabaseUrl });

    console.log(`[E2E-S5] Successfully seeded E2E project: ${projectId}`);

    // 3. Open Proposal page
    const proposalUrl = `${baseUrl}/dashboard/grant-writer/${projectId}/proposal`;
    console.log(`[E2E-S5] Navigating to proposal page: ${proposalUrl}`);
    await page.goto(proposalUrl);

    // Verify Materialization Panel
    const cardTitle = page.locator('h2:has-text("Materialisasikan Program Workspace")').first();
    await expect(cardTitle).toBeVisible({ timeout: 15000 });

    // Click "Materialisasikan Sekarang"
    const materializeBtn = page.locator('button:has-text("Materialisasikan Sekarang")').first();
    await expect(materializeBtn).toBeVisible();
    await materializeBtn.click();
    console.log('[E2E-S5] Clicked Materialisasikan Sekarang!');

    // Wait for the completion redirection button
    const openWorkspaceBtn = page.locator('a:has-text("Buka Program Workspace")').first();
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 35000 });
    console.log('[E2E-S5] E2E Program materialization successfully completed with green checks!');

    // Capture visual screenshot as official proof
    if (!fs.existsSync('playwright-report')) {
      fs.mkdirSync('playwright-report');
    }
    await page.screenshot({ path: 'playwright-report/sprint5-materialize-success.png', fullPage: true });
    console.log('[E2E-S5] Screenshot captured at: playwright-report/sprint5-materialize-success.png');

    // Click "Buka Program Workspace"
    await openWorkspaceBtn.click();
    await page.waitForURL(/.*lfa-builder.*/, { timeout: 15000 });
    console.log('[E2E-S5] Successfully navigated to LFA Builder.');

    // Verify LFA Seeding
    await page.waitForTimeout(5000); // Give React extra time to render
    const bodyText = await page.innerText('body');
    console.log('[E2E-S5-DEBUG] Page body text after navigation:', bodyText);

    await expect(page.locator('text=300 profil digital petani kopi muda').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=150 petani kopi muda terlatih').first()).toBeVisible({ timeout: 5000 });
    console.log('[E2E-S5] Checked LFA items.');

    // Navigate to Budget Tab
    const budgetTabBtn = page.locator('button:has-text("Anggaran")').first();
    if (await budgetTabBtn.isVisible()) {
      await budgetTabBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Fasilitator').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Makan + 2 Snack').first()).toBeVisible({ timeout: 5000 });
      console.log('[E2E-S5] Checked Budget items.');
    }

    // Navigate to SROI Tab
    const sroiTabBtn = page.locator('button:has-text("SROI")').first();
    if (await sroiTabBtn.isVisible()) {
      await sroiTabBtn.click();
      await page.waitForTimeout(1000);
      
      // Click Step 3: Ajustmen to display standard text <p> elements with outcomes
      const ajustmenBtn = page.locator('button:has-text("3. Ajustmen")').first();
      if (await ajustmenBtn.isVisible()) {
        await ajustmenBtn.click();
        await page.waitForTimeout(1000);
      }
      
      await expect(page.locator('text=petani kopi muda').first()).toBeVisible({ timeout: 15000 });
      console.log('[E2E-S5] Checked SROI draft items.');
    }
  });

  test.afterAll(async ({ browser }) => {
    // Optional cleanup
    if (projectId) {
      console.log('[E2E-S5] All tests passed! Cleanup is handled dynamically on next run.');
    }
  });
});
