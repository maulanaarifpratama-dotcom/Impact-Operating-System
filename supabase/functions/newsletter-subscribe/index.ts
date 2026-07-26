// supabase/functions/newsletter-subscribe/index.ts
// Public newsletter signup.
//
// This exists because the Brevo API key must never reach the browser. The
// previous implementation called api.brevo.com directly from NewsletterSection
// with import.meta.env.VITE_BREVO_API_KEY, and Vite inlines every VITE_* value
// into the client bundle — which published the key to every visitor.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

/** Brevo contact list to subscribe to. */
const NEWSLETTER_LIST_ID = 2;

// Deliberately conservative: one address, no display name, no comments.
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { email } = await req.json();

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254) {
      return errorResponse('Alamat email tidak valid.', 400);
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY is not configured in Supabase environment variables.');
      return errorResponse('Sistem newsletter tidak terkonfigurasi.', 500);
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        email: email.trim(),
        listIds: [NEWSLETTER_LIST_ID],
        updateEnabled: true,
      }),
    });

    // Brevo returns 400 duplicate_parameter when the contact already exists.
    // From the subscriber's point of view that is success, not failure.
    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 400 && detail.includes('duplicate_parameter')) {
        return jsonResponse({ success: true, alreadySubscribed: true });
      }
      console.error(`Brevo contact create failed: ${response.status}. Details: ${detail}`);
      return errorResponse('Gagal mendaftarkan email. Coba lagi nanti.', 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error in newsletter-subscribe edge function:', error);
    return errorResponse('Internal Server Error', 500);
  }
});
