// supabase/functions/contact-form/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

/** Where contact submissions are delivered. */
const RECIPIENT = { email: "arif@impactory.id", name: "Maulana Arif Pratama" };

// Anyone on the internet can post here, and whatever they send is rendered as
// HTML in someone's inbox. Cap the fields so a submission cannot be used to
// deliver a wall of content.
const LIMITS = { nama: 120, email: 254, organisasi: 200, pesan: 5000 };

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

/**
 * Escape a submitted value for interpolation into the email body.
 *
 * Without this, a "message" of `<a href="https://evil.example">Verifikasi akun
 * Anda</a>` arrives as a working link in a mail that genuinely came from
 * Impactory's own sender — a phishing vector aimed straight at the team's inbox.
 */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Collapse whitespace so a submitted value cannot break the Subject line. */
function singleLine(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const nama = singleLine(String(body?.nama ?? ""), LIMITS.nama);
    const email = singleLine(String(body?.email ?? ""), LIMITS.email);
    const organisasi = singleLine(String(body?.organisasi ?? ""), LIMITS.organisasi);
    const pesan = String(body?.pesan ?? "").slice(0, LIMITS.pesan).trim();

    if (!nama || !email || !pesan) {
      return errorResponse("Nama, Email, dan Pesan wajib diisi.", 400);
    }
    // The address becomes replyTo, so an invalid one either bounces the reply or
    // is rejected outright by Brevo.
    if (!EMAIL_RE.test(email)) {
      return errorResponse("Alamat email tidak valid.", 400);
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("BREVO_API_KEY is not configured in Supabase environment variables.");
      return errorResponse("Sistem SMTP tidak terkonfigurasi.", 500);
    }

    const orgName = organisasi || "Personal / Tanpa Organisasi";
    const subject = `Pesan baru dari ${nama} - ${orgName}`;

    // Every interpolation below is escaped. Note `class`, not `className`: this
    // is an email document, not JSX, and the previous React spelling meant none
    // of the styles above ever applied.
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(subject)}</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff; }
            h2 { color: #0f6e56; border-bottom: 2px solid #0f6e56; padding-bottom: 8px; margin-top: 0; }
            .field { margin-bottom: 16px; }
            .label { font-weight: bold; color: #4a5568; font-size: 14px; margin-bottom: 4px; text-transform: uppercase; }
            .value { background-color: #f7fafc; padding: 12px; border-radius: 6px; font-size: 14px; white-space: pre-wrap; border-left: 4px solid #cbd5e0; }
            .footer { font-size: 11px; color: #718096; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Pesan Kontak Baru — Impactory</h2>
            <div class="field">
              <div class="label">Nama Lengkap:</div>
              <div class="value">${escapeHtml(nama)}</div>
            </div>
            <div class="field">
              <div class="label">Alamat Email:</div>
              <div class="value">${escapeHtml(email)}</div>
            </div>
            <div class="field">
              <div class="label">Nama Organisasi:</div>
              <div class="value">${escapeHtml(orgName)}</div>
            </div>
            <div class="field">
              <div class="label">Pesan / Pertanyaan:</div>
              <div class="value">${escapeHtml(pesan)}</div>
            </div>
            <div class="footer">
              Email ini dikirim secara otomatis oleh formulir kontak situs web Impactory.
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: "Impactory Form", email: "system@impactory.id" },
        to: [RECIPIENT],
        replyTo: { email, name: nama },
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brevo SMTP email send failed: Status ${response.status}. Details: ${errorText}`);
      return errorResponse("Gagal mengirim pesan. Coba lagi nanti.", 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error in contact-form edge function:", error);
    return errorResponse("Internal Server Error", 500);
  }
});
