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
import { chatJson } from '../_shared/foundry.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface GenerateRequest {
  projectId: string;
  /** Optional override of the donor standard for this generation. */
  donorStandard?: 'un_oecd_dac' | 'world_bank' | 'usaid' | 'eu' | 'generic';
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
  "proposal_markdown": "# Title\\n\\n## Executive Summary\\n..."
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
- Output ONLY valid JSON. No markdown fences around the JSON.`;

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
      wizard_data: project.wizard_data,
    };

    const { data: result, usage, model } = await chatJson<{
      matrix: LfaMatrix;
      proposal_markdown: string;
    }>({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
