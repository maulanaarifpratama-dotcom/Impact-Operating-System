// supabase/functions/budget-sbm-suggest/index.ts
// AI-powered Budget SBM reference checker using Azure OpenAI.

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
      bucket: 'budget-sbm-suggest',
      ...SUGGEST_LIMIT,
    });

    const body = await req.json();
    const { item_name, category } = body as {
      item_name?: string;
      category?: string;
    };

    if (!item_name || !item_name.trim()) {
      return new Response(JSON.stringify({ error: 'item_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert financial consultant and NGO auditor in Indonesia.
Your task is to analyze the requested budget item name and category, map it to the closest reference in the official "SBM 2026 PMK 32/2025" guidelines, and suggest the correct reference price and a helpful brief explanation.

SBM 2026 REFERENCE DATABASE:

Honorarium:
- Narasumber Nasional: Rp 1.700.000/jam
- Narasumber Lokal: Rp 900.000/jam
- Moderator: Rp 900.000/kegiatan
- Fasilitator: Rp 750.000/hari
- Panitia: Rp 300.000/hari
- Petugas Lapangan: Rp 250.000/hari

Transport:
- Transport Dalam Kota: Rp 150.000/orang
- Transport Luar Kota (estimasi): Rp 500.000/orang
- Uang Harian Dalam Kota: Rp 380.000/hari
- Uang Harian Luar Kota: Rp 530.000/hari

Akomodasi:
- Hotel Bintang 3: Rp 750.000/malam
- Hotel Bintang 2: Rp 450.000/malam
- Penginapan Sederhana: Rp 250.000/malam

Konsumsi:
- Makan + 2 Snack: Rp 117.000/orang
- Makan Siang: Rp 60.000/orang
- Snack: Rp 30.000/orang
- Air Mineral: Rp 15.000/orang

ATK & Cetak:
- Modul/Materi Pelatihan: Rp 50.000/paket
- Spanduk 3x1m: Rp 150.000/buah
- Backdrop: Rp 500.000/buah
- Fotokopi: Rp 500/lembar

If the item name does not map clearly to any standard SBM item, try to find the closest match or provide a reasonable fallback rate based on NGO standards and specify that it's an estimated rate with justification.

You MUST respond with a valid JSON object matching the exact schema specified below.
The response explanation MUST be in Indonesian (Bahasa Indonesia) as it is tailored for local NGOs and Indonesian donors.

SCHEMA:
{
  "reference_price": 1700000,
  "explanation": "Berdasarkan SBM 2026 PMK 32/2025, narasumber nasional: Rp 1.700.000/jam. Sesuaikan dengan lokasi dan kebijakan organisasi."
}

CRITICAL RULES:
1. Provide the suggested price as an integer under "reference_price". If no SBM applies, set it to 0 or a reasonable estimate.
2. For "explanation", provide a highly concise and helpful explanation (max 2 sentences) in Bahasa Indonesia detailing the SBM baseline matched, the unit, and a small tip (e.g., "Sesuaikan dengan lokasi dan kebijakan organisasi.").
3. Do NOT include markdown blocks or formatting outside the JSON object. Output ONLY the raw JSON object.`;

    const userMessage = `Nama Item Biaya: ${item_name}
Kategori Biaya: ${category || 'Lainnya'}`;

    const { data } = await chatJson<{ reference_price: number; explanation: string }>({
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
    console.error('Budget SBM suggestion error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: err?.status ?? 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
