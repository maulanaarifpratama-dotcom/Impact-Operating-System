import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate, assertOrgMember } from '../_shared/auth.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Authenticate user
    const ctx = await authenticate(req);

    // 2. Parse Multipart Form Data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err: any) {
      return new Response(JSON.stringify({ error: `Failed to parse form data: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const file = formData.get('file');
    const organizationIdObj = formData.get('organizationId');
    const documentIdObj = formData.get('documentId');
    const fileNameObj = formData.get('fileName');
    const folderTypeObj = formData.get('folderType');

    if (!file || !organizationIdObj || !documentIdObj || !fileNameObj) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: file, organizationId, documentId, fileName' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const organizationId = organizationIdObj.toString();
    const documentId = documentIdObj.toString();
    const fileName = fileNameObj.toString();

    // 3. Verify user has access to the requested organization
    await assertOrgMember(ctx, organizationId);

    // 4. Retrieve Microsoft credentials from Env
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      console.error('Missing Microsoft env credentials:', { tenantId: !!tenantId, clientId: !!clientId, clientSecret: !!clientSecret });
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Microsoft credentials are not set in Supabase secrets' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Get drive_id from Supabase system_integrations or fallback to env
    const { data: integration, error: integrationErr } = await ctx.supabaseAdmin
      .from('system_integrations')
      .select('drive_id')
      .eq('provider', 'onedrive')
      .eq('status', 'active')
      .maybeSingle();

    if (integrationErr) {
      console.error('Database error fetching system_integrations:', integrationErr);
    }

    const driveId = integration?.drive_id || Deno.env.get('MICROSOFT_DRIVE_ID');

    if (!driveId) {
      return new Response(
        JSON.stringify({ error: 'No active OneDrive system integration or fallback MICROSOFT_DRIVE_ID found.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Get app-only token from Microsoft AD
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Microsoft token acquisition failed:', errText);
      return new Response(
        JSON.stringify({ error: `Failed to acquire Microsoft token: ${errText}` }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('Microsoft token response missing access_token field:', tokenData);
      return new Response(
        JSON.stringify({ error: 'Microsoft token response did not include an access_token' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const folderType = folderTypeObj ? folderTypeObj.toString() : 'library';

    // 7. Upload file to OneDrive via Microsoft Graph API
    let storagePath = `apps/impactory/organizations/${organizationId}/library/${documentId}/original/${fileName}`;
    if (folderType === 'wbs_evidence') {
      storagePath = `apps/impactory/organizations/${organizationId}/wbs_evidence/${documentId}/${fileName}`;
    }
    
    // We encode the storagePath to handle any special characters in the path or filename.
    const graphUploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(storagePath)}:/content`;

    const fileBlob = file as Blob;
    const fileBuffer = await fileBlob.arrayBuffer();

    const graphRes = await fetch(graphUploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': fileBlob.type || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!graphRes.ok) {
      const errText = await graphRes.text();
      console.error('Microsoft Graph file upload failed:', errText);
      return new Response(
        JSON.stringify({ error: `OneDrive Graph API upload failed: ${errText}` }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const graphData = await graphRes.json();

    // 8. Return structured metadata
    return new Response(
      JSON.stringify({
        storageItemId: graphData.id,
        driveId: driveId,
        webUrl: graphData.webUrl,
        storagePath: storagePath,
        sizeBytes: graphData.size,
        mimeType: graphData.file?.mimeType || fileBlob.type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err: any) {
    console.error('Unhandled edge function exception:', err);
    return new Response(
      JSON.stringify({ error: `Internal Server Error: ${err.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
