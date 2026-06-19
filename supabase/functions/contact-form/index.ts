// supabase/functions/contact-form/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // Ensure method is POST
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { nama, email, organisasi, pesan } = await req.json();

    // Validate fields
    if (!nama || !email || !pesan) {
      return errorResponse("Nama, Email, dan Pesan wajib diisi.", 400);
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("BREVO_API_KEY is not configured in Supabase environment variables.");
      return errorResponse("Sistem SMTP tidak terkonfigurasi.", 500);
    }

    const orgName = organisasi || "Personal / Tanpa Organisasi";
    const subject = `Pesan baru dari ${nama} - ${orgName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
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
          <div className="container">
            <h2>Pesan Kontak Baru — Impactory</h2>
            <div className="field">
              <div className="label">Nama Lengkap:</div>
              <div className="value">${nama}</div>
            </div>
            <div className="field">
              <div className="label">Alamat Email:</div>
              <div className="value">${email}</div>
            </div>
            <div className="field">
              <div className="label">Nama Organisasi:</div>
              <div className="value">${orgName}</div>
            </div>
            <div className="field">
              <div className="label">Pesan / Pertanyaan:</div>
              <div className="value">${pesan}</div>
            </div>
            <div className="footer">
              Email ini dikirim secara otomatis oleh formulir kontak situs web Impactory.
            </div>
          </div>
        </body>
      </html>
    `;

    // Call Brevo SMTP Send Email API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: "Impactory Form", email: "system@impactory.id" },
        to: [{ email: "arif@impactory.id", name: "Maulana Arif Pratama" }],
        replyTo: { email: email, name: nama },
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brevo SMTP email send failed: Status ${response.status}. Details: ${errorText}`);
      throw new Error(`SMTP API failed with status ${response.status}`);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error in contact-form edge function:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal Server Error", 500);
  }
});
