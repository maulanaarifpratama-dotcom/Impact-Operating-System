// supabase/functions/sroi-ai-suggest/index.ts
// Secure server-side SROI AI suggests using Azure OpenAI.
// Operations: proxy_suggest, narrative_generate, sensitivity_analysis.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { enforceRateLimit, SUGGEST_LIMIT } from '../_shared/rateLimit.ts';
import { chatJson } from '../_shared/foundry.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let currentOperation = 'unknown';

  try {
    // Authenticate caller, then bound spend.
    const ctx = await authenticate(req);
    await enforceRateLimit(ctx.supabaseAdmin, ctx.userId, {
      bucket: 'sroi-ai-suggest',
      ...SUGGEST_LIMIT,
    });

    const body = await req.json();
    const { operation, payload } = body as {
      operation: 'proxy_suggest' | 'narrative_generate' | 'sensitivity_analysis';
      payload: any;
    };

    if (!operation) {
      return new Response(JSON.stringify({ error: 'operation is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    currentOperation = operation;

    if (operation === 'proxy_suggest') {
      const { outcome_name, sector, location, beneficiary_type } = payload as {
        outcome_name: string;
        sector?: string;
        location?: string;
        beneficiary_type?: string;
      };

      if (!outcome_name || !outcome_name.trim()) {
        return new Response(JSON.stringify({ error: 'outcome_name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `You are an expert Social Return on Investment (SROI) consultant specializing in Indonesian non-profits and social enterprises.
Your goal is to suggest a reasonable financial proxy value (in IDR) for a given social outcome, along with credible sources, citations, and reasoning.

CRITICAL INSTRUCTIONS:
- You must suggest a realistic and defensible value in Indonesian Rupiah (IDR).
- You must explain the methodology/reasoning for the suggested proxy.
- Always include a standard, professional disclaimer about validating proxy values locally.
- Do NOT fabricate or overclaim certainty about official proxy figures. Be transparent about estimates.
- Respond in Bahasa Indonesia as the target users are local Indonesian NGOs.
- You MUST respond with a valid JSON object matching the exact schema specified below.

SCHEMA:
{
  "recommendedProxyValueIdr": number,
  "proxySource": "string",
  "proxyCitation": "string",
  "reasoning": "string",
  "confidence": "low" | "medium" | "high",
  "disclaimer": "string"
}`;

      const userMessage = `Outcome Name: ${outcome_name}
Sector: ${sector || 'Sosial / Umum'}
Location: ${location || 'Indonesia'}
Beneficiary Type: ${beneficiary_type || 'Masyarakat Umum'}`;

      const { data, model } = await chatJson<{
        recommendedProxyValueIdr: number;
        proxySource: string;
        proxyCitation: string;
        reasoning: string;
        confidence: 'low' | 'medium' | 'high';
        disclaimer: string;
      }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4000,
      });

      // Inject governance metadata in the payload
      const responsePayload = {
        ...data,
        _metadata: {
          feature: "sroi",
          operation: "proxy_suggest",
          modelTier: "standard",
          promptVersion: "1.0.0",
          modelUsed: model,
          status: "success"
        }
      };

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (operation === 'narrative_generate') {
      const {
        program_context,
        sroi_ratio,
        total_investment,
        total_present_value,
        top_outcomes,
        assumptions
      } = payload as {
        program_context: string;
        sroi_ratio: number;
        total_investment: number;
        total_present_value: number;
        top_outcomes: Array<{ name: string; value_idr: number; pct: number }>;
        assumptions: string;
      };

      const systemPrompt = `You are an expert Social Return on Investment (SROI) auditor.
Write a narrative evaluation of the program's SROI results, suitable for a donor report or executive summary.

CRITICAL INSTRUCTIONS:
- Keep the language professional, encouraging, but rigorous. Avoid overclaiming success. Use words like "estimasi", "proyeksi dampak", "nilai sosial yang dimodelkan".
- Respond in Bahasa Indonesia.
- Aim for 200-300 words.
- Explain the significance of the SROI Ratio: "${sroi_ratio}". Mention total investment "${total_investment}" and present social value "${total_present_value}".
- Address the top outcomes and any listed assumptions.
- Respond with a valid JSON object matching the exact schema specified below.

SCHEMA:
{
  "narrative": "string",
  "warnings": ["string"]
}`;

      const userMessage = `Context: ${program_context || 'Program Pemberdayaan'}
Ratio SROI: ${sroi_ratio}
Investasi: Rp ${total_investment}
Total Nilai Sosial (PV): Rp ${total_present_value}
Top Outcomes: ${JSON.stringify(top_outcomes || [])}
Asumsi: ${assumptions || 'Suku bunga diskonto 3.5%'}`;

      const { data, model } = await chatJson<{
        narrative: string;
        warnings: string[];
      }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4000,
      });

      const responsePayload = {
        ...data,
        _metadata: {
          feature: "sroi",
          operation: "narrative_generate",
          modelTier: "standard",
          promptVersion: "1.0.0",
          modelUsed: model,
          status: "success"
        }
      };

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (operation === 'sensitivity_analysis') {
      const { current_sroi_data, ratio, assumptions } = payload as {
        current_sroi_data: any;
        ratio: number;
        assumptions: string;
      };

      const systemPrompt = `You are an expert social impact analyst.
Analyze the SROI mathematical model's resilience to fluctuation. You will be provided with current data, a calculated ratio, and basic assumptions.
Explain what happens under three scenarios:
1. Pesimis (e.g. increase deadweight, decrease proxy or outcomes by 20%)
2. Moderat (base scenario, normal deviation)
3. Optimis (increased achievement or duration)

CRITICAL INSTRUCTIONS:
- Do not perform complex equations, but describe qualitatively and quantitatively (estimate ratios) how changes in parameters would shift the SROI Ratio.
- Respond in Bahasa Indonesia.
- Use realistic NGO conservative analysis.
- Respond with a valid JSON object matching the exact schema specified below.

SCHEMA:
{
  "scenarios": [
    {
      "name": "Pesimis",
      "assumptionChange": "string",
      "sroiRatio": number,
      "notes": "string"
    },
    {
      "name": "Moderat",
      "assumptionChange": "string",
      "sroiRatio": number,
      "notes": "string"
    },
    {
      "name": "Optimis",
      "assumptionChange": "string",
      "sroiRatio": number,
      "notes": "string"
    }
  ],
  "summary": "string"
}`;

      const userMessage = `Current SROI Ratio: ${ratio}
Assumptions: ${assumptions}
Data: ${JSON.stringify(current_sroi_data || {})}`;

      const { data, model } = await chatJson<{
        scenarios: Array<{ name: string; assumptionChange: string; sroiRatio: number; notes: string }>;
        summary: string;
      }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4000,
      });

      const responsePayload = {
        ...data,
        _metadata: {
          feature: "sroi",
          operation: "sensitivity_analysis",
          modelTier: "standard",
          promptVersion: "1.0.0",
          modelUsed: model,
          status: "success"
        }
      };

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: `Unsupported operation: ${operation}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) {
    console.error(`[sroi-ai-suggest] Error in operation=${currentOperation}:`, err);
    
    const isTokenExhausted = err.message?.includes('finish_reason=length') || err.message?.includes('empty content');
    const isTimeout = err.message?.includes('timeout') || err.message?.includes('AbortError');
    // Auth (401) and rate-limit (429) errors carry their own status; never
    // relabel them as an upstream/server fault.
    const httpStatus = err?.status ?? ((isTokenExhausted || isTimeout) ? 503 : 500);
    const errorCode = err?.status === 429
      ? 'RATE_LIMITED'
      : err?.status === 401
        ? 'UNAUTHORIZED'
        : isTokenExhausted
          ? 'UPSTREAM_TOKEN_EXHAUSTED'
          : (isTimeout ? 'UPSTREAM_TIMEOUT' : 'INTERNAL_ERROR');

    return new Response(JSON.stringify({
      error: err.message || 'Internal Server Error',
      code: errorCode,
      _metadata: {
        feature: "sroi",
        operation: currentOperation,
        modelTier: "standard",
        promptVersion: "1.0.0",
        status: "failure",
        fallbackHandling: "Graceful error toast shown to client"
      }
    }), {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
