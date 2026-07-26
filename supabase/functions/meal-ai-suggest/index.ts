// supabase/functions/meal-ai-suggest/index.ts
// AI-powered MEAL Intelligence handler using Azure OpenAI.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { enforceRateLimit, SUGGEST_LIMIT } from '../_shared/rateLimit.ts';
import { chatJson } from '../_shared/foundry.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate caller (ensures JWT session is valid), then bound spend.
    const ctx = await authenticate(req);
    await enforceRateLimit(ctx.supabaseAdmin, ctx.userId, {
      bucket: 'meal-ai-suggest',
      ...SUGGEST_LIMIT,
    });

    const body = await req.json();
    const { action } = body as { action?: string };

    if (!action) {
      return new Response(JSON.stringify({ error: 'action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'suggest_indicator_method') {
      const { indicator_text, lfa_level, sector } = body as {
        indicator_text?: string;
        lfa_level?: string;
        sector?: string;
      };

      if (!indicator_text || !indicator_text.trim()) {
        return new Response(JSON.stringify({ error: 'indicator_text is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `You are an expert Monitoring, Evaluation, Accountability, and Learning (MEAL) specialist for international and local NGOs in Indonesia.
Your task is to recommend the most suitable collection method, collection tool, monitoring frequency, and a brief reasoning for a given program indicator.

You MUST respond with a valid JSON object matching the exact schema specified below.
The response content MUST be in Indonesian (Bahasa Indonesia) as it is tailored for local NGOs.

OPTIONS FOR FIELDS:
- collection_method: 'Survey' | 'Wawancara' | 'FGD' | 'Observasi Lapangan' | 'Studi Dokumen' | 'Data Sekunder' | 'Lainnya'
- collection_tool: 'Kuesioner Terstruktur' | 'Panduan Wawancara' | 'Panduan FGD' | 'Lembar Observasi' | 'Form Monitoring Bulanan' | 'Data Administratif'
- frequency: 'Bulanan' | 'Triwulan' | 'Semesteran' | 'Tahunan' | 'Awal & Akhir Program' | 'Insidental'

SCHEMA:
{
  "collection_method": "Survey",
  "collection_tool": "Kuesioner Terstruktur",
  "frequency": "Awal & Akhir Program",
  "reasoning": "Rekomendasi metode Survey menggunakan Kuesioner Terstruktur pada awal dan akhir program untuk mengukur baseline dan endline peningkatan pengetahuan gizi ibu hamil secara kuantitatif."
}

CRITICAL RULES:
1. Match the field values EXACTLY to the allowed option lists.
2. For "reasoning", provide a highly concise justification (max 2 sentences) in Bahasa Indonesia explaining why these selections are most appropriate for this level of LFA and indicator text.
3. Do NOT include markdown blocks or formatting outside the JSON object. Output ONLY the raw JSON object.`;

      const userMessage = `Indikator: ${indicator_text}
Level LFA: ${lfa_level || 'output'}
Sektor Program: ${sector || 'Tidak Ditentukan'}`;

      const { data } = await chatJson<{
        collection_method: string;
        collection_tool: string;
        frequency: string;
        reasoning: string;
      }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1000,
      });

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'generate_learning_questions') {
      const { indicators, sector, duration_months } = body as {
        indicators?: string[];
        sector?: string;
        duration_months?: number;
      };

      const systemPrompt = `You are an expert MEAL (Monitoring, Evaluation, Accountability, and Learning) consultant in Indonesia.
Your task is to generate 3 to 5 realistic learning questions (Pertanyaan Pembelajaran) that will guide reflection, continuous learning, and adaptive management throughout this NGO program.

You MUST respond with a valid JSON object matching the exact schema specified below.
The response content MUST be in Indonesian (Bahasa Indonesia).

SCHEMA:
{
  "questions": [
    {
      "question_text": "Seberapa efektif model sosialisasi gizi buruk ini dalam mengubah perilaku masak ibu rumah tangga?",
      "answer_method": "FGD bersama Kelompok Ibu & Wawancara Mendalam",
      "timeline_month": 6,
      "pic": "Koordinator MEAL & Fasilitator Lapangan"
    }
  ]
}

CRITICAL RULES:
1. Generate exactly 3 to 5 highly relevant learning questions.
2. Ensure timeline_month is a realistic integer month number within the program duration (typically around midline or endline).
3. Ensure answer_method and pic are concise, practical, and highly typical for Indonesian CSOs.
4. Do NOT include markdown blocks or formatting outside the JSON object. Output ONLY the raw JSON.`;

      const userMessage = `Indikator Program:
${(indicators || []).map((ind, i) => `${i + 1}. ${ind}`).join('\n') || 'Tidak ada indikator spesifik.'}

Sektor Program: ${sector || 'Tidak Ditentukan'}
Durasi Program: ${duration_months || 12} bulan`;

      const { data } = await chatJson<{
        questions: Array<{
          question_text: string;
          answer_method: string;
          timeline_month: number;
          pic: string;
        }>;
      }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1200,
      });

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'check_meal_completeness') {
      const { meal_items } = body as {
        meal_items?: Array<{
          lfa_level: string;
          indicator_text: string;
          collection_method?: string;
          pic?: string;
        }>;
      };

      const systemPrompt = `You are an expert NGO M&E Auditor in Indonesia.
Your task is to review the current MEAL Matrix checklist and assess its quality, completeness, and rigor.
Provide a completeness score (0 to 100) and 3 to 4 actionable, highly helpful, and specific recommendations in Indonesian (Bahasa Indonesia).

You MUST respond with a valid JSON object matching the exact schema specified below.

SCHEMA:
{
  "score": 65,
  "recommendations": [
    "Indikator di tingkat Dampak (Goal) belum memiliki metode pengumpulan data. Rekomendasinya gunakan Wawancara Mendalam atau Studi Dokumen sekunder.",
    "PIC untuk monitoring di tingkat Output masih kosong pada baris 2. Tentukan penanggung jawab agar monitoring berjalan konsisten."
  ]
}

CRITICAL RULES:
1. score should be an integer between 0 and 100 representing completeness and technical rigor (e.g. lower score if indicators are missing methods, tools, or PICs; higher if they are complete).
2. recommendations must be highly relevant, practical, and directly address what is missing or weak in the provided items. Output exactly 3 to 4 recommendation strings.
3. Do NOT include markdown blocks or formatting outside the JSON object. Output ONLY the raw JSON.`;

      const userMessage = `Daftar Item MEAL Saat Ini:
${JSON.stringify(meal_items || [], null, 2)}`;

      const { data } = await chatJson<{
        score: number;
        recommendations: string[];
      }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1000,
      });

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) {
    console.error('MEAL suggest intelligence error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: err?.status ?? 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
