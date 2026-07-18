// supabase/functions/grant-writer-generate/index.ts
// Generates a complete LFA matrix + donor-ready proposal markdown for a
// Grant Writer project, using Azure AI Foundry as the brain.
//
// FLOW
//   1. Authenticate caller from JWT.
//   2. Load the gw_projects row (RLS auto-checks org membership).
//   3. Send wizard_data to Foundry as a structured prompt that REQUIRES
//      a JSON response shaped like { matrix, proposal_markdown }.
//   4. Insert a new gw_lfa_documents row with version = max+1, is_current=true.
//      The pre-existing trg_gw_lfa_set_current trigger flips other versions.
//   5. Mark project as completed.
//   6. Log to ai_generations.
//   7. Return the new document.
//
// Frontend: replace the rule-based generator.ts call in GrantWriterWizard
//           with: supabase.functions.invoke('grant-writer-generate', { body: { projectId } })

import { authenticate, AuthError } from '../_shared/auth.ts';
import { chatJson, foundryEmbed } from '../_shared/foundry.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface GenerateRequest {
  projectId: string;
  lfa_project_id?: string;
  org_id?: string;
  /** Optional override of the donor standard for this generation. */
  donorStandard?: 'un_oecd_dac' | 'world_bank' | 'usaid' | 'eu' | 'generic';
  /** Optional beneficiaryCount passed from frontend */
  beneficiaryCount?: number;
}

interface LfaMatrix {
  meta: {
    donorStandard: string;
    projectTitle: string;
    targetDonor?: string;
    durationMonths?: number;
    budgetIdr?: number;
  };
  goal: { statement: string; indicators: string[]; assumptions: string[] };
  outcomes: Array<{
    statement: string;
    indicators: string[];
    means_of_verification: string[];
    assumptions: string[];
  }>;
  outputs: Array<{
    outcome_index: number;
    statement: string;
    indicators: string[];
    means_of_verification: string[];
    assumptions: string[];
  }>;
  activities: Array<{
    output_index: number;
    statement: string;
    timeline_months: string;
    responsible: string;
  }>;
  risks: Array<{
    description: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

const SYSTEM_PROMPT = `You are an expert grant proposal writer for Indonesian
foundations, NGOs, and social enterprises. You produce proposals that meet
international donor standards (UN/OECD-DAC LFA, World Bank, USAID, EU).

When given a wizard data payload, you MUST return JSON with this exact shape:

{
  "matrix": {
    "meta": { "donorStandard": "...", "projectTitle": "...", "targetDonor": "...", "durationMonths": 0, "budgetIdr": 0 },
    "goal": { "statement": "...", "indicators": ["..."], "assumptions": ["..."] },
    "outcomes": [{ "statement": "...", "indicators": ["..."], "means_of_verification": ["..."], "assumptions": ["..."] }],
    "outputs":  [{ "outcome_index": 0, "statement": "...", "indicators": ["..."], "means_of_verification": ["..."], "assumptions": ["..."] }],
    "activities": [{ "output_index": 0, "statement": "...", "timeline_months": "M1-M3", "responsible": "..." }],
    "risks": [{ "description": "...", "likelihood": "low|medium|high", "impact": "low|medium|high", "mitigation": "..." }]
  },
  "proposal_markdown": "# Title\\n\\n## Executive Summary\\n...",
  "program_skeleton": {
    "schemaVersion": "2.0",
    "meta": {
      "projectTitle": "...",
      "sector": "...",
      "geography": { "locationName": "...", "province": "...", "district": "..." },
      "durationMonths": 12,
      "budgetIdr": 1200000000,
      "targetDonor": "...",
      "donorStandard": "...",
      "language": "id",
      "generatedAt": "...",
      "promptVersion": "2.0",
      "schemaVersion": "2.0"
    },
    "beneficiaries": {
      "directHeadcount": 0,
      "indirectHeadcount": 0,
      "primaryGroup": "...",
      "ageRange": "...",
      "geography": "...",
      "inclusionNotes": "...",
      "suggestedDisaggregation": ["gender", "age_group"]
    },
    "lfa": {
      "goal": { "statement": "...", "indicators": [{ "id": "goal_ind_1", "statement": "...", "baseline": "...", "target": "...", "mov": "..." }], "assumptions": ["..."] },
      "purpose": { "statement": "...", "indicators": [{ "id": "purp_ind_1", "statement": "...", "baseline": "...", "target": "...", "mov": "..." }], "assumptions": ["..."] },
      "outcomes": [{ "id": "outcome_1", "statement": "...", "indicators": [{ "id": "out_ind_1", "statement": "...", "baseline": "...", "target": "...", "mov": "..." }], "assumptions": ["..."] }],
      "outputs": [{ "id": "output_1", "outcomeId": "outcome_1", "statement": "...", "indicators": [{ "id": "output_ind_1", "statement": "...", "baseline": "...", "target": "...", "mov": "..." }], "assumptions": ["..."] }]
    },
    "wbs": {
      "tasks": [{
        "id": "t_1_1",
        "parentId": null,
        "sourceActivityId": "output_1",
        "level": 1,
        "title": "...",
        "description": "...",
        "durationWeeks": 4,
        "startMonth": 1,
        "endMonth": 2,
        "sequenceOrder": 1,
        "dependencies": [],
        "deliverable": "...",
        "responsibleRole": "...",
        "milestone": false,
        "isCriticalCandidate": false,
        "confidence": 0.95
      }]
    },
    "budget_hints": {
      "items": [{
        "id": "bh_1",
        "taskId": "t_1_1",
        "scope": "activity_level",
        "category": "training",
        "itemType": "Fasilitator",
        "description": "...",
        "engineRule": "sbm_lookup",
        "quantity": 2,
        "unit": "Hari",
        "duration": 1,
        "participantCount": 25,
        "suggestedRole": "Fasilitator",
        "province": "...",
        "requiresUserConfirmation": true,
        "justification": "...",
        "confidence": 0.9
      }]
    },
    "meal": {
      "indicators": [{
        "id": "meal_ind_1",
        "sourceLfaIndicatorId": "out_ind_1",
        "name": "...",
        "definition": "...",
        "baselineValue": null,
        "baselineText": "Rp 0",
        "targetValue": 100,
        "targetText": "Rp 100",
        "unit": "...",
        "frequency": "quarterly",
        "dataSource": "...",
        "collectionMethod": "...",
        "responsibleRole": "...",
        "verificationMethod": "...",
        "disaggregation": ["gender"],
        "formula": null,
        "targetDeadlineMonth": 24,
        "draftStatus": "draft_ai_generated",
        "confidence": 0.9
      }]
    },
    "sroi": {
      "models": [{
        "id": "sroi_m_1",
        "sourceOutcomeId": "outcome_1",
        "outcomeStatement": "...",
        "stakeholderGroup": "...",
        "quantityHint": 300,
        "durationYears": 2,
        "financialProxyType": "...",
        "suggestedProxyDescription": "...",
        "suggestedProxyValueIdr": null,
        "proxySourceRequired": true,
        "deadweightPctDraft": 15,
        "attributionPctDraft": 10,
        "displacementPctDraft": 0,
        "dropoffPctDraft": 20,
        "rationale": "...",
        "confidence": 0.85,
        "requiresValidation": true
      }]
    },
    "risks": [{
      "id": "risk_1",
      "level": "outcome",
      "refId": "outcome_1",
      "description": "...",
      "likelihood": "low",
      "impact": "medium",
      "mitigation": "...",
      "ownerRole": "...",
      "trigger": "...",
      "reviewFrequency": "monthly",
      "confidence": 0.9
    }]
  }
}

Rules:
- Write in the SAME language as the wizard input (default Bahasa Indonesia).
- Indicators MUST be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
- Cite real Indonesian context (BPS data, SDGs, RPJMN, sectoral policies) where relevant.
- The proposal_markdown must include: Executive Summary, Problem Statement,
  Theory of Change, Objectives, Methodology, Results Framework (LFA table),
  Risk Management, Budget Narrative, Sustainability, Monitoring & Evaluation.
- Do not invent specific numbers that were not provided. Use ranges and
  qualitative framing when data is missing, and explicitly mark assumptions.
- If "lfa_context" is present in the payload, you MUST strictly align your intervention logic (Goal, Outcomes, Outputs, Activities, Indicators, and Assumptions) with the data inside "lfa_context.entries". Elaborate upon and enrich this exact structure rather than inventing divergent outcomes/outputs.
- Jumlah penerima manfaat terverifikasi: {{beneficiaries}} orang. Anda wajib menyebutkan angka {{beneficiaries}} penerima manfaat terverifikasi secara eksplisit di dalam narasi proposal (misalnya pada bagian Executive Summary atau Problem Statement) sebagai data aktual. Namun, jika angka ini adalah 0, jangan merekayasa atau memalsukan angka, melainkan sebutkan bahwa saat ini terdapat 0 penerima manfaat terverifikasi di dalam sistem. Tetap patuhi batasan dan jangan menimpa angka target pengguna lainnya.
- {{carbon_impact}}
- Output ONLY valid JSON. No markdown fences around the JSON.
- Relationships and IDs in program_skeleton MUST be fully valid:
  1. Every outcome has a unique stable ID (e.g. outcome_1).
  2. Every output has a unique stable ID (e.g. output_1) and outcomeId pointing to a valid outcome.
  3. Every task in wbs has a unique ID and parentId pointing to a parent task (null for Level 1).
  4. budget_hints items taskId references a valid WBS task.id.
  5. meal indicators sourceLfaIndicatorId references a valid LFA indicator id.
  6. sroi models sourceOutcomeId references a valid outcome id.
  7. risks refId references the appropriate level item id.
- budget_hints engineRule must be one of: "sbm_lookup", "inkindo_lookup", "direct_cost_index", "ngo_multiplier", "formula_only", "manual_market_quote".
- budget_hints category must be one of: "personnel", "consultant", "training", "workshop", "survey", "mentoring", "travel", "accommodation", "consumption", "equipment", "communication", "monitoring", "evaluation", "administration", "audit", "indirect_cost".`;

function computeCarbonSummary(rows: Array<{ carbon_factor: number | null; duration_weeks: number | null }> | null) {
  let total = 0;

  for (const item of rows || []) {
    if (item.carbon_factor == null) continue;

    // IMPORTANT:
    // duration = TEMP proxy
    const multiplier = item.duration_weeks ?? 1;

    const impact = item.carbon_factor * multiplier;

    total += impact;
  }

  return total;
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const ctx = await authenticate(req);
    const body = (await req.json()) as GenerateRequest;
    if (!body.projectId) return errorResponse('projectId is required');



    // 1. Load project (RLS enforces org membership)
    const { data: project, error: pErr } = await ctx.supabase
      .from('gw_projects')
      .select('*')
      .eq('id', body.projectId)
      .maybeSingle();

    if (pErr) return errorResponse(`Failed to load project: ${pErr.message}`, 500);
    if (!project) return errorResponse('Project not found or access denied', 404);

    const donorStandard = body.donorStandard ?? project.donor_standard ?? 'un_oecd_dac';

    // 2. Mark generating
    await ctx.supabase
      .from('gw_projects')
      .update({ status: 'generating' })
      .eq('id', body.projectId);

    // Load LFA project and entries if linked
    const lfaProjectId = (project.wizard_data as Record<string, any>)?.lfa_project_id;
    let lfaContext = null;

    if (lfaProjectId) {
      const { data: lfaProj } = await ctx.supabase
        .from('lfa_projects')
        .select('*')
        .eq('id', lfaProjectId)
        .maybeSingle();

      if (lfaProj) {
        const { data: lfaEntries } = await ctx.supabase
          .from('lfa_entries')
          .select('*')
          .eq('project_id', lfaProjectId)
          .order('sequence', { ascending: true });

        lfaContext = {
          project: lfaProj,
          entries: lfaEntries || []
        };
      }
    }

    // Retrieve beneficiary count (with fallback headcount query)
    let beneficiaryCount = body.beneficiaryCount;
    if (beneficiaryCount === undefined) {
      // Direct query from database as a redundant fallback
      const targetLfaProjectId = lfaProjectId || body.projectId;
      const { count, error: bErr } = await ctx.supabase
        .from('beneficiaries')
        .select('*', { count: 'exact', head: true })
        .eq('lfa_project_id', targetLfaProjectId);

      if (bErr) {
        console.warn('Fallback beneficiary query error:', bErr.message);
        beneficiaryCount = 0;
      } else {
        beneficiaryCount = count || 0;
      }
    }

    const targetLfaProjectId = body.lfa_project_id ?? lfaProjectId ?? body.projectId;
    const targetOrgId = body.org_id ?? project.organization_id;

    const { data: carbonRows } = await ctx.supabase
      .from('lfa_wbs_items')
      .select('carbon_factor, duration_weeks')
      .eq('lfa_project_id', targetLfaProjectId)
      .eq('org_id', targetOrgId)
      .eq('carbon_enabled', true)
      .eq('level', 2);

    const carbonImpactKg = computeCarbonSummary(carbonRows);

    // 3. Call Foundry with the wizard data
    const userPayload = {
      project: {
        title: project.title,
        summary: project.summary,
        sector: project.sector,
        geography: project.geography,
        duration_months: project.duration_months,
        budget_idr: project.budget_idr,
        donor_standard: donorStandard,
        target_donor: project.target_donor,
      },
      beneficiaries: beneficiaryCount,
      wizard_data: project.wizard_data,
      ...(lfaContext ? { lfa_context: lfaContext } : {})
    };

    // Retrieve library RAG context if organization has any library documents.
    let ragContext = '';
    try {
      const { count, error: countErr } = await ctx.supabase
        .from('library_documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', project.organization_id);

      if (countErr) {
        console.error('Failed to pre-check library documents count:', countErr.message);
      } else if (count && count > 0) {
        const baseQuery = `${project.title || ''} ${project.sector || ''} ${project.summary || ''}`.trim();
        if (baseQuery) {
          const embedding = await foundryEmbed(baseQuery);
          const { data: chunks, error: rpcErr } = await ctx.supabase.rpc('match_library_chunks', {
            _org_id: project.organization_id,
            _query_embedding: embedding,
            _match_count: 5,
            _min_similarity: 0.35,
            _user_id: ctx.userId,
          });

          if (rpcErr) {
            console.error('match_library_chunks RPC error in grant-writer-generate:', rpcErr);
          } else if (chunks && chunks.length > 0) {
            const chunkContents = (chunks as any[])
              .map((c: any) => c.content || '')
              .filter(Boolean)
              .join('\n');

            if (chunkContents) {
              ragContext = `\n\n---REFERENSI DARI IMPACT LIBRARY ORGANISASI---\n${chunkContents}\n---END REFERENSI---\n\nGunakan referensi ini sebagai konteks tambahan saat membantu \nuser menulis proposal. Prioritaskan pendekatan, data, dan \nframing yang konsisten dengan dokumen organisasi tersebut.`;
            }
          }
        }
      }
    } catch (ragErr) {
      console.error('Failed to inject RAG context in grant-writer-generate:', (ragErr as Error).message);
    }

    const finalSystemPrompt = SYSTEM_PROMPT + ragContext;
    let systemPrompt = finalSystemPrompt.replaceAll('{{beneficiaries}}', String(beneficiaryCount));

    if (systemPrompt.includes('{{carbon_impact}}')) {
      if (carbonImpactKg !== 0) {
        const absValue = Math.abs(carbonImpactKg).toFixed(1);

        const carbonDirection = carbonImpactKg < 0
          ? `diproyeksikan dapat mengurangi emisi karbon sebesar ${absValue} kg CO₂`
          : `diproyeksikan menghasilkan emisi karbon sebesar ${absValue} kg CO₂`;

        const carbonNote = carbonImpactKg < 0
          ? `Dampak ini setara dengan penyerapan karbon dari ${Math.round(Math.abs(carbonImpactKg) / 5)} pohon per tahun.`
          : `Program ini berkomitmen untuk meminimalkan jejak karbon melalui pendekatan berbasis bukti.`;

        const carbonText =
          `Program ini ${carbonDirection}, berdasarkan estimasi saat ini. ${carbonNote} (Estimasi berbasis faktor emisi IPCC 2019 + PLN Indonesia 2023.)`;

        systemPrompt = systemPrompt.replaceAll(
          '{{carbon_impact}}',
          carbonText
        );
      } else {
        systemPrompt = systemPrompt
          .replaceAll('- {{carbon_impact}}', '')
          .replaceAll('{{carbon_impact}}', '')
          .replace(/\n\s*\n/g, '\n');
      }
    }

    const { data: result, usage, model } = await chatJson<{
      matrix: LfaMatrix;
      proposal_markdown: string;
      program_skeleton?: any;
    }>({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate the LFA matrix and donor-ready proposal for this project.\\n\\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
      // gpt-5.5 / o-series reasoning deployments consume tokens for hidden
      // reasoning before producing visible content. The full LFA matrix +
      // proposal markdown can be ~6-10k visible tokens, so we budget more
      // headroom here. Other features keep the smaller default.
      temperature: 0.4,
      max_tokens: 16000,
    });

    if (!result?.matrix || !result?.proposal_markdown) {
      throw new Error('Foundry returned incomplete payload');
    }

    // Ensure meta.donorStandard is set
    result.matrix.meta = {
      ...result.matrix.meta,
      donorStandard,
      projectTitle: project.title,
    };

    // Embed the Canonical Program Skeleton into result.matrix for single-transaction persistence.
    if (result.program_skeleton) {
      (result.matrix as any).program_skeleton = result.program_skeleton;
    }

    // 4. Get next version
    const { data: existing } = await ctx.supabase
      .from('gw_lfa_documents')
      .select('version')
      .eq('project_id', body.projectId)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;

    // 4.5. Explicitly unset is_current on existing documents to avoid unique constraint idx_gw_lfa_current
    const { error: unsetErr } = await ctx.supabase
      .from('gw_lfa_documents')
      .update({ is_current: false })
      .eq('project_id', body.projectId)
      .eq('is_current', true);
    
    if (unsetErr) {
      console.error('Failed to unset previous current document:', unsetErr.message || 'unknown error');
      throw new Error(`Failed to update existing documents: ${unsetErr.message}`);
    }

    // 5. Insert the new document
    const { data: doc, error: dErr } = await ctx.supabase
      .from('gw_lfa_documents')
      .insert({
        project_id: body.projectId,
        organization_id: project.organization_id,
        generated_by: ctx.userId,
        version: nextVersion,
        matrix: result.matrix as never,
        proposal_markdown: result.proposal_markdown,
        donor_standard: donorStandard,
        is_current: true,
        model,
      })
      .select()
      .single();

    if (dErr) {
      if (dErr.message?.includes('duplicate key value') || dErr.code === '23505') {
        throw new Error(`Duplicate current LFA conflict for project: ${dErr.message}`);
      }
      throw new Error(`Failed to save new LFA document: ${dErr.message}`);
    }

    // 6. Mark project completed
    await ctx.supabase
      .from('gw_projects')
      .update({ status: 'completed' })
      .eq('id', body.projectId);

    // 7. Log to ai_generations (use admin client to bypass RLS for audit logging)
    await ctx.supabaseAdmin.from('ai_generations').insert({
      organization_id: project.organization_id,
      user_id: ctx.userId,
      feature: 'grant_writer_generate',
      model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      metadata: {
        kind: 'lfa_generate',
        project_id: body.projectId,
        version: nextVersion,
        donor_standard: donorStandard,
      },
    });

    return jsonResponse({ document: doc, version: nextVersion });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('grant-writer-generate error:', (err as Error).message || 'unknown error');
    return errorResponse((err as Error).message ?? 'Internal error', 500);
  }
});
