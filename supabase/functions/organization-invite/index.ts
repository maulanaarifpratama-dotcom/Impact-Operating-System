// supabase/functions/organization-invite/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthError } from "../_shared/auth.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // 1. Authenticate caller
    const ctx = await authenticate(req);
    const body = await req.json();
    const { action = 'send', invitationId, organizationId, email, role = 'member', jobTitle = null, appUrl } = body;

    if (!organizationId || !email) {
      return errorResponse("organizationId dan email wajib diisi.", 400);
    }

    // 2. Verify caller role in org (must be owner or admin)
    const { data: callerMember, error: roleErr } = await ctx.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (roleErr || !callerMember || (callerMember.role !== 'owner' && callerMember.role !== 'admin')) {
      return errorResponse("Hanya Owner atau Admin yang dapat mengirim undangan.", 403);
    }

    // 3. Fetch Organization Name
    const { data: org, error: orgErr } = await ctx.supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgErr || !org) {
      return errorResponse("Organisasi tidak ditemukan.", 404);
    }

    let invitationRecord;

    if (action === 'resend' && invitationId) {
      // Resend: update token and expiration
      const newToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: updatedInv, error: updateErr } = await ctx.supabase
        .from('organization_invitations')
        .update({
          token: newToken,
          expires_at: expiresAt,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .select('*')
        .single();

      if (updateErr) throw updateErr;
      invitationRecord = updatedInv;
    } else {
      // Send: Insert new invitation or reuse existing pending
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Check if existing pending invite exists
      const { data: existingInv } = await ctx.supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('email', email.trim().toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInv) {
        // Refresh token & expiration
        const { data: refreshed, error: refreshErr } = await ctx.supabase
          .from('organization_invitations')
          .update({
            token,
            expires_at: expiresAt,
            role,
            job_title: jobTitle || null,
            invited_by: ctx.userId,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .eq('id', existingInv.id)
          .select('*')
          .single();

        if (refreshErr) throw refreshErr;
        invitationRecord = refreshed;
      } else {
        const { data: newInv, error: insertErr } = await ctx.supabase
          .from('organization_invitations')
          .insert({
            organization_id: organizationId,
            email: email.trim().toLowerCase(),
            role,
            job_title: jobTitle || null,
            invited_by: ctx.userId,
            token,
            status: 'pending',
            expires_at: expiresAt
          })
          .select('*')
          .single();

        if (insertErr) throw insertErr;
        invitationRecord = newInv;
      }
    }

    // 4. Construct Activation Link
    const baseUrl = appUrl || "https://impactory.id";
    const acceptUrl = `${baseUrl.replace(/\/$/, '')}/invite/accept?token=${invitationRecord.token}`;

    // 5. Send Email via Brevo API if key is present
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    let emailSent = false;

    if (brevoApiKey) {
      const subject = `Undangan Kemitraan Organisasi: ${org.name}`;
      const roleLabel = invitationRecord.role === 'admin' ? 'Administrator' : 'Staf (Member)';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; }
              .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .badge { display: inline-block; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
              h1 { font-size: 20px; color: #0f172a; margin-top: 0; }
              p { font-size: 14px; color: #475569; }
              .btn { display: inline-block; background-color: #ea580c; color: #ffffff !important; font-weight: bold; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin: 20px 0; }
              .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; }
            </style>
          </head>
          <body>
            <div className="card">
              <span className="badge">Impactory.id NGO OS</span>
              <h1>Undangan Bergabung ke Organisasi</h1>
              <p>Halo,</p>
              <p>Anda diundang untuk bergabung ke organisasi <strong>${org.name}</strong> di platform Impactory.id dengan peran hak akses <strong>${roleLabel}</strong>.</p>
              <p>Klik tombol di bawah ini untuk menerima undangan dan mengaktifkan akses ke workspace organisasi Anda:</p>
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="btn" target="_blank">Terima Undangan & Bergabung</a>
              </div>
              <p style="font-size: 12px; color: #64748b;">Atau salin tautan berikut ke peramban Anda:<br><a href="${acceptUrl}">${acceptUrl}</a></p>
              <p style="font-size: 12px; color: #94a3b8;">Tautan ini berlaku selama 7 hari.</p>
              <div className="footer">
                Impactory.id — Platform Pertumbuhan NGO & Yayasan Indonesia
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify({
            sender: { name: "Impactory.id", email: "system@impactory.id" },
            to: [{ email: invitationRecord.email }],
            subject: subject,
            htmlContent: htmlContent,
          }),
        });

        if (brevoRes.ok) {
          emailSent = true;
        } else {
          console.error("Brevo API error:", await brevoRes.text());
        }
      } catch (e) {
        console.error("Failed to call Brevo API:", e);
      }
    } else {
      console.log(`[organization-invite] Local environment notice: BREVO_API_KEY not configured. Generated activation URL: ${acceptUrl}`);
    }

    return jsonResponse({
      success: true,
      invitation: invitationRecord,
      acceptUrl,
      emailSent
    });

  } catch (err: any) {
    console.error("Error in organization-invite function:", err);
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    return errorResponse(err.message || "Internal server error", 500);
  }
});
