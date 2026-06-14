// supabase/functions/lfa-ai-draft/index.ts
// AI-powered LFA extraction from unstructured proposal text using Azure OpenAI.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate, AuthError } from '../_shared/auth.ts';
import { chatCompletion } from '../_shared/foundry.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate caller (ensures JWT session is valid)
    await authenticate(req);

    const body = await req.json();
    const { proposal_text, project_name, sector } = body as {
      proposal_text?: string;
      project_name?: string;
      sector?: string;
    };

    if (!proposal_text || !proposal_text.trim()) {
      return new Response(JSON.stringify({ error: 'proposal_text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert Monitoring & Evaluation (M&E) specialist for non-profit programs in Indonesia.
Your task is to analyze the unstructured grant proposal or program description provided by the user, and draft a complete, professional Logical Framework Approach (LFA) or Logframe.

You MUST respond with a valid JSON object matching the exact schema specified below.
The language of the output content MUST be Indonesian (Bahasa Indonesia) as it is tailored for local NGOs and Indonesian donors.

SCHEMA:
{
  "goal": {
    "description": "Long-term maco-impact of the project (Indonesian)",
    "indicator": "Clear quantitative/qualitative key performance indicator for the goal (Indonesian)",
    "means_of_verification": "Source of data or survey to verify this indicator (Indonesian)",
    "assumption": "External factors or assumptions necessary for this level (Indonesian)"
  },
  "purpose": {
    "description": "Specific objective or direct outcome of the project for beneficiaries (Indonesian)",
    "indicator": "Outcome indicator with target counts/percentages (Indonesian)",
    "means_of_verification": "Source of data or survey to verify this outcome indicator (Indonesian)",
    "assumption": "External factors or assumptions necessary for this level (Indonesian)"
  },
  "outputs": [
    {
      "sequence": 1,
      "description": "Concrete deliverable, service or product achieved by activities (Indonesian)",
      "indicator": "Output indicator (Indonesian)",
      "means_of_verification": "Source of verification, e.g. training attendance sheets (Indonesian)",
      "assumption": "External assumptions for this output (Indonesian)",
      "activities": [
        {
          "sequence": 1,
          "description": "Specific action/activity to achieve this output (Indonesian)",
          "indicator": "Activity indicator or target (Indonesian)",
          "means_of_verification": "Activity verification, e.g. photographs/reports (Indonesian)",
          "assumption": "Assumptions for the activity (Indonesian)",
          "timeline_start": 1,
          "timeline_end": 12
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Provide facts and structural elements from the provided text.
2. If certain M&E elements (e.g. specific indicators, assumptions) are missing from the proposal, draft realistic, high-quality, professional indicators, means of verification, and assumptions that align with standard Indonesian development frameworks.
3. Be highly realistic. Use Indonesian currency or standard metrics if relevant.
4. Set realistic timelines: "timeline_start" and "timeline_end" should be integers representing month indices (e.g., between 1 and 12).
5. Output ONLY the raw JSON object. Do not include markdown wraps or additional formatting.`;

    const userMessage = `Nama Program: ${project_name || 'Tidak Ditentukan'}
Sektor: ${sector || 'Tidak Ditentukan'}

Draft Proposal / Teks Proposal Mentah:
${proposal_text}`;

    const res = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    });

    const choiceText = res.choices?.[0]?.message?.content;
    if (!choiceText) {
      throw new Error('No content returned from AI model.');
    }

    // Try to parse JSON to ensure it is valid
    let jsonResult;
    try {
      jsonResult = JSON.parse(choiceText);
    } catch {
      // Fallback clean markdown blocks if model ignored raw json request
      const cleanText = choiceText.replace(/```json|```/gi, '').trim();
      jsonResult = JSON.parse(cleanText);
    }

    return new Response(JSON.stringify(jsonResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const status = err instanceof AuthError ? err.status : 500;
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
