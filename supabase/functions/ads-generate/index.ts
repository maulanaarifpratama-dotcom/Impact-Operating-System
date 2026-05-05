// supabase/functions/ads-generate/index.ts
// Generates social-media ad copy variants for a given brief.
// Input: { brief_id?, audience, goal, platform, tone, key_points, campaign?, product_or_cause, variant_count? }
// Output: { variants: Array<{ headline, body, cta, hashtags, platform }> }
//
// NOTE: The live ads_briefs schema uses { campaign_name, audience, objective (enum),
// platforms (text[]), tone, key_message, product_or_cause (NOT NULL), ... }. The
// frontend speaks in { goal, platform, key_points } so this function maps frontend
// -> DB on insert. We DO NOT add new DB columns. We DO NOT persist brand_voice
// (column does not exist).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';
import { foundryJSON } from '../_shared/foundry.ts';

interface AdsInput {
  brief_id?: string;
  campaign?: string;
  product_or_cause?: string;
  audience: string;
  goal: string;       // frontend objective code: e.g. 'donasi','awareness','recruit_relawan','event_signup','sales_umkm'
  platform: string;   // frontend platform code: e.g. 'meta','google','tiktok','instagram','facebook','linkedin','whatsapp'
  tone?: string;
  key_points?: string[];
  variant_count?: number;
}

// Map frontend objective code to the ads_objective enum stored in the DB.
// Unknown values fall back to 'awareness' so the insert never fails on enum.
function mapObjective(goal: string): string {
  const g = (goal || '').toLowerCase();
  const map: Record<string, string> = {
    donasi: 'donation',
    donation: 'donation',
    awareness: 'awareness',
    traffic: 'traffic',
    conversions: 'conversions',
    leads: 'leads',
    engagement: 'engagement',
    recruit_relawan: 'leads',
    event_signup: 'engagement',
    sales_umkm: 'conversions',
  };
  return map[g] ?? 'awareness';
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

    // product_or_cause is NOT NULL in ads_briefs. Validate before any
    // Foundry call or DB insert so we never partially persist a brief.
    const productOrCause = (body.product_or_cause ?? '').trim();
    if (!body.brief_id && productOrCause.length === 0) {
      return json({ error: 'Produk atau isu kampanye wajib diisi.' }, 400);
    }

    const variantCount = Math.min(Math.max(body.variant_count ?? 3, 1), 6);

    const admin = adminClient();
    const objective = mapObjective(body.goal);
    const platforms = [String(body.platform)];
    const keyMessage = (body.key_points && body.key_points[0]) ? String(body.key_points[0]) : '';
    // Campaign name falls back to product_or_cause so the brief always has a
    // meaningful label even if the user only filled the product/cause field.
    const campaignName = (body.campaign && body.campaign.trim().length > 0)
      ? body.campaign.trim()
      : productOrCause;

    // Persist or update the brief row using the LIVE schema columns only.
    let briefId = body.brief_id;
    if (!briefId) {
      const { data: brief, error: be } = await admin
        .from('ads_briefs')
        .insert({
          organization_id,
          created_by: user.id,
          campaign_name: campaignName,
          product_or_cause: productOrCause,
          audience: body.audience,
          objective,
          platforms,
          tone: body.tone ?? null,
          key_message: keyMessage,
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
      'Produk/Isu: ' + productOrCause,
      'Audiens: ' + body.audience,
      'Tujuan: ' + body.goal,
      'Platform: ' + body.platform,
      body.tone ? 'Tone: ' + body.tone : '',
      body.key_points && body.key_points.length
        ? 'Poin kunci:\n' + body.key_points.map((k) => '- ' + k).join('\n')
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
