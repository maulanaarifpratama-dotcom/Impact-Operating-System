import { createClient } from '@supabase/supabase-js';

const url = 'https://uncsvkvkaijzydndyutp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY3N2a3ZrYWlqenlkbmR5dXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTcxNTUsImV4cCI6MjA5MjU3MzE1NX0.hesnkonlwj5eaFkvem3QcjqxNJiLOTOnXoptW3pq7gY';
const supabase = createClient(url, key);

const cases = [
  {
    code: 'A',
    title: 'Pelatihan Pengolahan Limbah Organik Jadi Kompos Kelompok Tani Wanita Garut',
    facts: ['Garut', 'kelompok tani wanita', 'limbah organik', 'kompos'],
    story: 'Program pelatihan dan pendampingan pengolahan limbah organik rumah tangga dan pertanian menjadi kompos berkualitas tinggi untuk kelompok tani wanita di Kabupaten Garut.',
    beneficiaries: 150
  },
  {
    code: 'B',
    title: 'Digitalisasi dan Akses Pasar UMKM Perempuan Difabel',
    facts: ['UMKM perempuan difabel', 'literasi digital', 'pemasaran online', 'AI'],
    story: 'Program pemberdayaan ekonomi inklusif melalui pelatihan digitalisasi usaha, pemasaran online, dan pemanfaatan platform AI untuk 80 UMKM yang dikelola oleh perempuan difabel.',
    beneficiaries: 80
  },
  {
    code: 'C',
    title: 'Konservasi Terumbu Karang dan Ketahanan Pesisir Wakatobi',
    facts: ['Wakatobi', 'masyarakat pesisir', 'nelayan lokal', 'terumbu karang'],
    story: 'Program rehabilitasi terumbu karang berbasis masyarakat dan pembentukan kawasan perlindungan laut lokal bersama 200 nelayan di Kepulauan Wakatobi.',
    beneficiaries: 200
  },
  {
    code: 'D',
    title: 'Pencegahan Stunting Berbasis Posyandu dan Edukasi Komunitas',
    facts: ['stunting', 'posyandu', 'ibu hamil dan menyusui', 'PHBS'],
    story: 'Program edukasi gizi seimbang, pendampingan 1000 HPK, dan penguatan kader posyandu untuk pencegahan stunting pada balita di desa sasaran.',
    beneficiaries: 300
  }
];

async function run() {
  console.log('Signing in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'info@bisabaik.or.id',
    password: 'metaproject123'
  });
  if (authErr) {
    console.error('Auth Error:', authErr);
    return;
  }

  const token = authData.session.access_token;
  const userId = authData.user.id;
  const { data: orgMember } = await supabase.from('organization_members').select('organization_id').eq('user_id', userId).single();
  const orgId = orgMember.organization_id;

  for (const c of cases) {
    console.log(`\n====================================================`);
    console.log(`RUNNING CASE ${c.code}: ${c.title}`);
    console.log(`====================================================`);

    const { data: lfaProj } = await supabase.from('lfa_projects').insert({
      org_id: orgId,
      name: `[MVP Run] ${c.title}`
    }).select().single();

    const { data: gwProj } = await supabase.from('gw_projects').insert({
      organization_id: orgId,
      created_by: userId,
      title: c.title,
      summary: c.story,
      status: 'draft',
      wizard_data: {
        _mode: 'quick',
        program: {
          title: c.title,
          story: c.story,
          problem_statement: c.story,
          beneficiaries: `${c.beneficiaries} orang`,
          beneficiary_count: c.beneficiaries,
          location: c.facts[0]
        },
        lfa_project_id: lfaProj.id
      }
    }).select().single();

    console.log(`GW Project: ${gwProj.id}, LFA Project: ${lfaProj.id}`);

    const start = Date.now();
    const resp = await fetch('https://uncsvkvkaijzydndyutp.supabase.co/functions/v1/grant-writer-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        projectId: gwProj.id,
        lfa_project_id: lfaProj.id,
        org_id: orgId,
        beneficiaryCount: c.beneficiaries,
        ontologyContext: {
          programFacts: {
            proposedTitle: c.title,
            programStory: c.story,
            geography: c.facts[0],
            beneficiaryCount: c.beneficiaries
          }
        }
      })
    });

    const duration = Date.now() - start;
    console.log(`HTTP Status: ${resp.status} (${duration}ms)`);
    if (resp.status === 200) {
      const resJson = await resp.json();
      const doc = resJson.document;
      console.log(`Doc ID: ${doc.id}`);
      console.log(`Goal: ${doc.matrix.goal.statement}`);
      console.log(`Outcomes (${doc.matrix.outcomes.length}):`);
      doc.matrix.outcomes.forEach((o, i) => console.log(`  [OUT-${i+1}] ${o.statement}`));
      console.log(`Outputs (${doc.matrix.outputs.length}):`);
      doc.matrix.outputs.forEach((op, i) => console.log(`  [OP-${i+1}] ${op.statement}`));
      console.log(`Activities (${doc.matrix.activities.length}):`);
      doc.matrix.activities.forEach((act, i) => console.log(`  [ACT-${i+1}] ${act.statement}`));
    } else {
      const errText = await resp.text();
      console.error(`ERROR Response: ${errText.slice(0, 500)}`);
    }
  }
}

run();
