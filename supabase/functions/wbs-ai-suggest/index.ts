// supabase/functions/wbs-ai-suggest/index.ts
// AI-powered WBS activity duration suggestion using Azure OpenAI.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { chatJson } from '../_shared/foundry.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate caller (ensures JWT session is valid)
    await authenticate(req);

    const body = await req.json();
    const { activity_name, sector, total_duration_months } = body as {
      activity_name?: string;
      sector?: string;
      total_duration_months?: number;
    };

    if (!activity_name || !activity_name.trim()) {
      return new Response(JSON.stringify({ error: 'activity_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert project planner and NGO monitoring & evaluation (M&E) specialist in Indonesia.
Your task is to estimate a realistic duration (in weeks) for the given activity based on the program sector and overall program duration.

You MUST respond with a valid JSON object matching the exact schema specified below.
The response content MUST be in Indonesian (Bahasa Indonesia) as it is tailored for local NGOs and Indonesian donors.

SCHEMA:
{
  "suggested_weeks": 6,
  "reasoning": "Rekomendasi: 6 minggu. Pelatihan digital untuk 30 peserta biasanya butuh 2 minggu persiapan + 1 minggu pelaksanaan + 3 minggu follow-up."
}

CRITICAL RULES:
1. Provide a realistic number of weeks for "suggested_weeks" (integer).
2. For "reasoning", provide a highly concise breakdown (max 3 sentences) in Bahasa Indonesia explaining why this duration is recommended (e.g. splitting into preparation, execution, and monitoring/follow-up stages).
3. Do NOT include markdown blocks or formatting outside the JSON object. Output ONLY the raw JSON object.`;

    const userMessage = `Nama Aktivitas: ${activity_name}
Sektor Program: ${sector || 'Tidak Ditentukan'}
Total Durasi Program: ${total_duration_months || 12} bulan`;

    const { data } = await chatJson<{ suggested_weeks: number; reasoning: string }>({
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
  } catch (err: any) {
    console.error('WBS suggest duration error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
