// supabase/functions/ads-generate/index.ts
// Generates social-media ad copy variants for a given brief.
//   Input:  { brief_id?, audience, goal, platform, tone, brand_voice, key_points }
//   Output: { variants: Array<{ headline, body, cta, hashtags, platform }> }
//
// =========================================================================
// TODO (USER): set Foundry secrets, then deploy:
//   supabase functions deploy ads-generate
// =========================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryJSON } from '../_shared/foundry.ts';

interface AdsInput {
  brief_id?: string;
  audience: string;
  goal: string;          // e.g. 'awareness', 'donation', 'volunteer signup'
  platform: string;      // e.g. 'instagram', 'facebook', 'tiktok', 'linkedin', 'whatsapp'
  tone?: string;         // e.g. 'inspiratif', 'urgent', 'hangat', 'profesional'
  brand_voice?: string;
  key_points?: string[];
  variant_count?: number;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, organization_id } = await getUserAndOrg(req);
    const body = (await req.json()) as AdsInput;
    if (!body.audience || !body.goal || !body.platform) {
      return json({ error: 'audience, goal, and platform are required' }, 400);
    }
    const variantCount = Math.min(Math.max(body.variant_count ?? 3, 1), 6);

    const admin = adminClient();

    // Persist or update the brief row
    let briefId = body.brief_id;
    if (!briefId) {
      const { data: brief, error: be } = await admin
        .from('ads_briefs')
        .insert({
          organization_id,
          user_id: user.id,
          audience: body.audience,
          goal: body.goal,
          platform: body.platform,
          tone: body.tone ?? null,
          brand_voice: body.brand_voice ?? null,
          key_points: body.key_points ?? [],
        })
        .select('id')
        .single();
      if (be) return json({ error: be.message }, 500);
      briefId = brief!.id;
    }

    const schemaHint = JSON.stringify({
      variants: [
        {
          headline: 'string (max 60 char untuk IG/FB, max 25 untuk TikTok)',
          body: 'string (max 200 char)',
          cta: 'string (max 25 char)',
          hashtags: ['string', '...'],
          platform: 'string',
          why_it_works: 'string (1 kalimat alasan)',
        },
      ],
    });

    const userPrompt = [
      'Buat ' + variantCount + ' varian iklan sosial media untuk NGO/yayasan/social enterprise di Indonesia.',
      'Audiens: ' + body.audience,
      'Tujuan: ' + body.goal,
      'Platform: ' + body.platform,
      body.tone ? 'Tone: ' + body.tone : '',
      body.brand_voice ? 'Brand voice: ' + body.brand_voice : '',
      body.key_points && body.key_points.length
        ? 'Poin kunci: ' + body.key_points.map((k) => '- ' + k).join('\n')
        : '',
      'Output JSON valid sesuai schema: ' + schemaHint,
      'Hashtag harus lokal Indonesia & relevan. CTA singkat dan jelas.',
    ]
      .filter(Boolean)
      .join('\n');

    const output = await foundryJSON<any>([
      {
        role: 'system',
        content:
          'Kamu adalah copywriter ahli iklan sosial media untuk sektor sosial Indonesia. ' +
          'Selalu jawab dalam JSON valid sesuai schema yang diberikan. Bahasa Indonesia.',
      },
      { role: 'user', content: userPrompt },
    ]);

    const variants = (output.variants ?? []).slice(0, variantCount);

    // Persist generation
    await admin.from('ads_generations').insert({
      brief_id: briefId,
      organization_id,
      user_id: user.id,
      variants,
      raw_output: output,
    });
    await admin.from('ai_generations').insert({
      organization_id,
      user_id: user.id,
      feature: 'ads_generate',
      metadata: { brief_id: briefId, count: variants.length },
    });

    return json({ brief_id: briefId, variants });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
