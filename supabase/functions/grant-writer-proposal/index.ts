// supabase/functions/grant-writer-proposal/index.ts
// On-demand full proposal generation derived from an ALREADY-VALIDATED LFA matrix + wizard_data narrative.

import { authenticate, adminClient, AuthError } from '../_shared/auth.ts';
import { enforceRateLimit, GENERATE_LIMIT } from '../_shared/rateLimit.ts';
import { chatCompletion } from '../_shared/foundry.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

/**
 * Completion budget for the seven-chapter narrative proposal.
 *
 * Was 7000, which is the same trap grant-writer-generate fell into: GPT-5 and
 * o-series deployments spend this budget on hidden reasoning before emitting
 * anything visible, so a seven-section document plus the skeleton context it now
 * receives can run out mid-way and come back truncated. foundry.ts names the
 * symptom when it happens — "the completion budget was consumed by reasoning
 * before any visible output was emitted."
 */
const PROPOSAL_MAX_TOKENS = 27_500;

interface ProposalRequest {
  projectId: string;
  lfaDocumentId?: string;
}

interface LfaMatrix {
  meta?: {
    donorStandard?: string;
    projectTitle?: string;
    targetDonor?: string;
    durationMonths?: number | null;
    budgetIdr?: number | null;
  };
  goal?: {
    statement?: string;
    indicators?: string[];
    assumptions?: string[];
  };
  outcomes?: Array<{
    statement: string;
    indicators?: string[];
    means_of_verification?: string[];
    assumptions?: string[];
  }>;
  outputs?: Array<{
    outcome_index?: number;
    statement: string;
    indicators?: string[];
    means_of_verification?: string[];
    assumptions?: string[];
  }>;
  activities?: Array<{
    output_index?: number;
    statement: string;
    timeline_months?: string;
    responsible?: string;
  }>;
  risks?: Array<{
    description: string;
    likelihood?: 'low' | 'medium' | 'high';
    impact?: 'low' | 'medium' | 'high';
    mitigation?: string;
  }>;
  program_skeleton?: any;
}

/**
 * Compatibility reader for wizard_data.
 * Supports flat shape, legacy nested (.program.* / .context.*) shape,
 * and clarifying question resolutions (ambiguityResolutions / missingInfoResolutions).
 */
function extractNarrativeContext(
  wizardData: Record<string, any> = {},
  fallbackTitle?: string,
  fallbackSummary?: string
) {
  const program = wizardData.program || {};
  const context = wizardData.context || {};
  const budget = wizardData.budget || {};

  const story =
    wizardData.programStory ||
    program.story ||
    program.problem_statement ||
    context.problemDescription ||
    fallbackSummary ||
    '';

  const title =
    wizardData.proposedTitle ||
    program.title ||
    fallbackTitle ||
    '';

  const geography =
    wizardData.geography ||
    program.location ||
    context.location ||
    '';

  const beneficiaryDescription =
    wizardData.beneficiaryDescription ||
    program.beneficiaries ||
    context.beneficiaries ||
    '';

  const beneficiaryCount =
    wizardData.beneficiaryCount ??
    program.beneficiary_count ??
    context.beneficiaryCount ??
    null;

  const durationMonths =
    wizardData.durationMonths ??
    program.duration_months ??
    null;

  const budgetIdr =
    wizardData.budgetIdr ??
    budget.amountIdr ??
    null;

  const targetDonor =
    wizardData.targetDonor ||
    program.target_donor ||
    '';

  const donorStandard =
    wizardData.donorStandard ||
    program.donor_standard ||
    'generic';

  const acceptedSectors =
    wizardData.acceptedSectors ||
    program.sectors ||
    [];

  const acceptedSdgs =
    wizardData.acceptedSdgs ||
    program.sdgs ||
    [];

  // Bonus sources from clarifying question answers
  const ambiguityResolutions = wizardData.ambiguityResolutions || [];
  const missingInfoResolutions = wizardData.missingInfoResolutions || [];

  return {
    story,
    title,
    geography,
    beneficiaryDescription,
    beneficiaryCount,
    durationMonths,
    budgetIdr,
    targetDonor,
    donorStandard,
    acceptedSectors,
    acceptedSdgs,
    ambiguityResolutions,
    missingInfoResolutions,
  };
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    // A seven-chapter narrative is as expensive as a full LFA generation, and
    // this endpoint had no ceiling at all while grant-writer-generate did.
    await enforceRateLimit(ctx.supabaseAdmin, ctx.userId, {
      bucket: 'grant-writer-proposal',
      ...GENERATE_LIMIT,
    });
    const user = { id: ctx.userId, email: ctx.email };
    const supabase = ctx.supabase;

    const body: ProposalRequest = await req.json().catch(() => ({ projectId: '' }));
    const { projectId, lfaDocumentId } = body;

    if (!projectId && !lfaDocumentId) {
      return errorResponse('projectId or lfaDocumentId is required', 400);
    }

    // 1. Resolve gw_projects row and gw_lfa_documents row
    let gwProjectId = projectId;
    let projectRow: any = null;

    // Check if projectId is gw_projects ID
    if (projectId) {
      const { data: p } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (p) {
        projectRow = p;
        gwProjectId = p.id;
      } else {
        // If not found directly, check if projectId is an lfa_projects ID linked in wizard_data
        const { data: pByLfa } = await supabase
          .from('gw_projects')
          .select('*')
          .eq('wizard_data->>lfa_project_id', projectId)
          .maybeSingle();

        if (pByLfa) {
          projectRow = pByLfa;
          gwProjectId = pByLfa.id;
        } else {
          // Check lfa_projects table for linked_grant_id
          const { data: lfaP } = await supabase
            .from('lfa_projects')
            .select('linked_grant_id')
            .eq('id', projectId)
            .maybeSingle();

          if (lfaP?.linked_grant_id) {
            const { data: pByGrant } = await supabase
              .from('gw_projects')
              .select('*')
              .eq('id', lfaP.linked_grant_id)
              .maybeSingle();
            if (pByGrant) {
              projectRow = pByGrant;
              gwProjectId = pByGrant.id;
            }
          }
        }
      }
    }

    // Fetch current LFA Document from gw_lfa_documents
    let docRow: any = null;
    let docQuery = supabase.from('gw_lfa_documents').select('*');
    if (lfaDocumentId) {
      docQuery = docQuery.eq('id', lfaDocumentId);
    } else if (gwProjectId) {
      docQuery = docQuery.eq('project_id', gwProjectId).eq('is_current', true);
    }

    const { data: fetchedDoc } = await docQuery.maybeSingle();
    docRow = fetchedDoc;

    const adminSupabase = adminClient();

    // Fallback: If no gw_lfa_documents row exists, construct matrix from lfa_entries table
    if (!docRow) {
      const targetSearchId = gwProjectId || projectId;
      console.log(`[grant-writer-proposal] No gw_lfa_documents found. Attempting fallback from lfa_entries for ID: ${targetSearchId}`);

      const { data: lfaEntries } = await adminSupabase
        .from('lfa_entries')
        .select('*')
        .eq('project_id', targetSearchId)
        .order('sequence', { ascending: true });

      const constructedMatrix: LfaMatrix = {
        meta: {
          donorStandard: 'un_oecd_dac',
          projectTitle: projectRow?.title || 'Program Proposal',
          targetDonor: 'Donor',
          durationMonths: projectRow?.wizard_data?.durationMonths || 12,
          budgetIdr: projectRow?.wizard_data?.budgetIdr || null,
        },
        goal: { statement: '', indicators: [], assumptions: [] },
        outcomes: [],
        outputs: [],
        activities: [],
        risks: [],
      };

      if (lfaEntries && lfaEntries.length > 0) {
        const goalEntry = lfaEntries.find((e: any) => e.level === 'goal');
        if (goalEntry) {
          constructedMatrix.goal = {
            statement: goalEntry.description || '',
            indicators: goalEntry.indicator ? [goalEntry.indicator] : [],
            assumptions: goalEntry.assumption ? [goalEntry.assumption] : [],
          };
        }

        const purposeEntries = lfaEntries.filter((e: any) => e.level === 'purpose');
        constructedMatrix.outcomes = purposeEntries.map((pe: any) => ({
          statement: pe.description || '',
          indicators: pe.indicator ? [pe.indicator] : [],
          means_of_verification: pe.means_of_verification ? [pe.means_of_verification] : [],
          assumptions: pe.assumption ? [pe.assumption] : [],
        }));

        const outputEntries = lfaEntries.filter((e: any) => e.level === 'output');
        constructedMatrix.outputs = outputEntries.map((oe: any, idx: number) => ({
          outcome_index: 0,
          statement: oe.description || '',
          indicators: oe.indicator ? [oe.indicator] : [],
          means_of_verification: oe.means_of_verification ? [oe.means_of_verification] : [],
          assumptions: oe.assumption ? [oe.assumption] : [],
        }));

        const activityEntries = lfaEntries.filter((e: any) => e.level === 'activity');
        constructedMatrix.activities = activityEntries.map((ae: any, idx: number) => ({
          output_index: 0,
          statement: ae.description || '',
          timeline_months: 'M1-M12',
          responsible: ae.responsible_party || 'Tim Lapangan',
        }));
      }

      // Insert constructed matrix into gw_lfa_documents
      try {
        const { data: newDoc } = await adminSupabase
          .from('gw_lfa_documents')
          .insert({
            project_id: targetSearchId,
            version: 1,
            is_current: true,
            matrix: constructedMatrix,
            created_at: new Date().toISOString(),
          })
          .select('*')
          .maybeSingle();

        if (newDoc) {
          docRow = newDoc;
        }
      } catch (insertErr) {
        console.warn('[grant-writer-proposal] Error inserting fallback gw_lfa_documents:', insertErr);
      }

      if (!docRow) {
        docRow = {
          id: targetSearchId,
          project_id: targetSearchId,
          matrix: constructedMatrix,
        };
      }
    }

    if (!docRow) {
      return errorResponse(`Document LFA tidak ditemukan untuk project ID ${projectId}`, 404);
    }

    if (!gwProjectId && docRow.project_id) {
      gwProjectId = docRow.project_id;
      const { data: p } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('id', gwProjectId)
        .maybeSingle();
      if (p) projectRow = p;
    }

    const matrix: LfaMatrix = docRow.matrix || {};

    /**
     * The generated programme skeleton, when the document carries one.
     *
     * grant-writer-generate produces far more than the flat matrix: a work
     * breakdown with durations, dependencies and responsible roles; budget
     * lines referenced against SBM 2026; MEAL indicators with baselines,
     * targets and collection methods; SROI models; and beneficiary figures.
     * None of it reached this prompt, yet the prompt asks for an implementation
     * plan (section 4) and a MEAL framework (section 5) — so the model invented
     * both, and what it invented did not match the WBS and MEAL tabs the
     * organisation would actually work from. Passing the skeleton makes the
     * narrative describe the plan that exists.
     */
    const skeleton = matrix.program_skeleton ?? docRow.matrix?.program_skeleton ?? null;

    const wizardData = projectRow?.wizard_data || {};
    const narrativeContext = extractNarrativeContext(
      wizardData,
      projectRow?.title,
      projectRow?.summary
    );

    // Build grounding facts for system prompt
    const goalStatement = matrix.goal?.statement || 'Belum ditentukan';
    const goalIndicators = matrix.goal?.indicators || [];
    const goalAssumptions = matrix.goal?.assumptions || [];

    const outcomesFormatted = (matrix.outcomes || []).map((o, idx) => ({
      index: idx + 1,
      statement: o.statement,
      indicators: o.indicators || [],
      means_of_verification: o.means_of_verification || [],
      assumptions: o.assumptions || [],
    }));

    const outputsFormatted = (matrix.outputs || []).map((o, idx) => ({
      index: idx + 1,
      outcome_index: o.outcome_index,
      statement: o.statement,
      indicators: o.indicators || [],
      means_of_verification: o.means_of_verification || [],
      assumptions: o.assumptions || [],
    }));

    const activitiesFormatted = (matrix.activities || []).map((a, idx) => ({
      index: idx + 1,
      output_index: a.output_index,
      statement: a.statement,
      timeline: a.timeline_months || 'Belum ditentukan',
      responsible: a.responsible || 'Belum ditentukan',
    }));

    const risksFormatted = (matrix.risks || []).map((r, idx) => ({
      index: idx + 1,
      description: r.description,
      likelihood: r.likelihood,
      impact: r.impact,
      mitigation: r.mitigation,
    }));

    const systemPrompt = `You are an expert grant proposal writer for Indonesian non-profits, foundations, and social enterprises, specializing in proposals that meet international donor standards (UN/OECD-DAC, World Bank, USAID, EU).

YOUR TASK:
Generate a complete, donor-ready 5-7 section narrative proposal derived directly from the provided Logical Framework Analysis (LFA) Matrix and narrative context.

STRICT GROUNDING & INTEGRITY RULES:
1. THE LFA MATRIX IS THE BONE & GROUND TRUTH:
   - Every Goal, Outcome, Output, Activity, Indicator, Means of Verification, Assumption, and Risk in the narrative MUST strictly reflect the matrix provided below.
   - Do NOT invent or fabricate any new outcomes or outputs not present in the matrix.
   - Use verbatim statement names for Goal, Outcomes, and Outputs from the matrix in Section 3 and 4.
2. NARRATIVE CONTEXT & STORY IS THE FLESH:
   - Use the program story, geography, beneficiary details, and clarifying resolutions for Section 2 (Latar Belakang & Rasional) and Section 7 (Keberlanjutan).
3. ABSENCE OF FACTS DISCIPLINE:
   - If duration, budget, or specific details are missing or null in both matrix and story, state "Belum ditentukan" or "Akan ditentukan sesuai kesepakatan donor". Do NOT invent random numbers or fake financial figures.
4. LANGUAGE & FORMAT:
   - Output language MUST be professional formal Indonesian (Bahasa Indonesia).
   - Provide clean GitHub Flavored Markdown formatted text.
   - Structure the document into exactly these 7 numbered sections:
     # [Title of Proposal]

     ## 1. Ringkasan Eksekutif
     ## 2. Latar Belakang & Rasional
     ## 3. Tujuan & Kerangka Logis
     ## 4. Metodologi & Rencana Implementasi
     ## 5. Kerangka MEAL / Indikator
     ## 6. Asumsi & Manajemen Risiko
     ## 7. Keberlanjutan`;

    const userPrompt = `
=== LFA MATRIX (GROUND TRUTH / BONE) ===
Project Title: ${matrix.meta?.projectTitle || narrativeContext.title || projectRow?.title || 'Program Grant'}
Target Donor: ${matrix.meta?.targetDonor || narrativeContext.targetDonor || 'Donor'}
Donor Standard: ${matrix.meta?.donorStandard || narrativeContext.donorStandard || 'UN/OECD-DAC'}
Duration: ${matrix.meta?.durationMonths ?? narrativeContext.durationMonths ?? 'Belum ditentukan'} bulan
Budget IDR: ${matrix.meta?.budgetIdr ? `Rp ${Number(matrix.meta.budgetIdr).toLocaleString('id-ID')}` : (narrativeContext.budgetIdr ? `Rp ${Number(narrativeContext.budgetIdr).toLocaleString('id-ID')}` : 'Belum ditentukan')}

GOAL:
- Statement: ${goalStatement}
- Indicators: ${goalIndicators.join('; ') || 'Belum ditentukan'}
- Assumptions: ${goalAssumptions.join('; ') || 'Tidak ada'}

OUTCOMES:
${JSON.stringify(outcomesFormatted, null, 2)}

OUTPUTS:
${JSON.stringify(outputsFormatted, null, 2)}

ACTIVITIES:
${JSON.stringify(activitiesFormatted, null, 2)}

RISKS & MITIGATION:
${JSON.stringify(risksFormatted, null, 2)}

=== PROGRAM NARRATIVE CONTEXT (FLESH) ===
Story / Background:
${narrativeContext.story || 'Tidak ada deskripsi cerita tambahan.'}

Geography / Location:
${narrativeContext.geography || 'Belum ditentukan'}

Beneficiaries:
- Description: ${narrativeContext.beneficiaryDescription || 'Belum ditentukan'}
- Count: ${narrativeContext.beneficiaryCount ?? 'Belum ditentukan'}

Clarifying Question Answers (Ambiguity Resolutions):
${JSON.stringify(narrativeContext.ambiguityResolutions, null, 2)}

Missing Info Resolutions:
${JSON.stringify(narrativeContext.missingInfoResolutions, null, 2)}
${
  skeleton
    ? `
=== PROGRAM SKELETON (THE PLAN THAT ALREADY EXISTS — DO NOT INVENT AROUND IT) ===
Sections 4 and 5 must describe THIS work breakdown and THIS MEAL framework. The
organisation will execute from these exact records, so inventing different
activities, indicators or budget lines would put the proposal at odds with the
plan it is meant to describe. Narrate and justify what is here; do not replace it.

Beneficiaries:
${JSON.stringify(skeleton.beneficiaries ?? {}, null, 2)}

Work Breakdown (tasks, durations in weeks, dependencies, deliverables, responsible roles):
${JSON.stringify(skeleton.wbs?.tasks ?? [], null, 2)}

Budget lines (referenced against SBM 2026 where engineRule says sbm_lookup):
${JSON.stringify(skeleton.budget_hints?.items ?? [], null, 2)}

MEAL indicators (baselines, targets, frequency, data source, disaggregation):
${JSON.stringify(skeleton.meal?.indicators ?? [], null, 2)}

SROI models (financial proxies and the four SVI adjustments):
${JSON.stringify(skeleton.sroi?.models ?? [], null, 2)}
`
    : ''
}
Please write the complete narrative proposal now following the 7 sections structure.`;

    const completionRes = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: PROPOSAL_MAX_TOKENS,
    });

    const choice = completionRes.choices[0];
    const proposalMarkdown = choice.message.content || '';
    const finishReason = choice.finish_reason || 'stop';

    // Count sections and word/character metrics
    const sectionHeaders = proposalMarkdown.match(/^##\s+\d+\.\s+.*$/gm) || [];
    const sectionCount = sectionHeaders.length;
    const charCount = proposalMarkdown.length;
    const wordCount = proposalMarkdown.trim().split(/\s+/).length;

    // 2. Save full proposal narrative to gw_lfa_documents.proposal_markdown
    const { error: updateErr } = await adminSupabase
      .from('gw_lfa_documents')
      .update({
        proposal_markdown: proposalMarkdown,
      })
      .eq('id', docRow.id);

    if (updateErr) {
      console.error('Error updating gw_lfa_documents proposal_markdown:', updateErr);
    }

    // 3. Log to ai_generations for audit
    try {
      await adminSupabase.from('ai_generations').insert({
        organization_id: projectRow?.org_id || null,
        user_id: user.id,
        function_name: 'grant-writer-proposal',
        prompt_tokens: completionRes.usage?.prompt_tokens ?? 0,
        completion_tokens: completionRes.usage?.completion_tokens ?? 0,
        model_name: completionRes.model || 'azure-openai',
        status: 'success',
        metadata: {
          project_id: gwProjectId,
          document_id: docRow.id,
          char_count: charCount,
          section_count: sectionCount,
          finish_reason: finishReason,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging error:', auditErr);
    }

    return jsonResponse({
      success: true,
      document_id: docRow.id,
      project_id: gwProjectId,
      proposal_markdown: proposalMarkdown,
      section_count: sectionCount,
      section_headers: sectionHeaders,
      word_count: wordCount,
      char_count: charCount,
      finish_reason: finishReason,
      usage: completionRes.usage,
    });
  } catch (err: any) {
    console.error('grant-writer-proposal error:', err);
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
