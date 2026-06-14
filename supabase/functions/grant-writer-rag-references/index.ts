// supabase/functions/grant-writer-rag-references/index.ts
// Secure server-side RAG search for Grant Writer project context and section-specific references.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { foundryEmbed } from '../_shared/foundry.ts';

interface ReferenceRequest {
  projectId: string;
  sectionTitle?: string;
}

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
    const ctx = await authenticate(req);
    const body = (await req.json()) as ReferenceRequest;
    const { projectId, sectionTitle } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch project details (RLS automatically restricts to user's org)
    const { data: project, error: projErr } = await ctx.supabase
      .from('gw_projects')
      .select('id, title, sector, summary, organization_id')
      .eq('id', projectId)
      .maybeSingle();

    if (projErr) {
      return new Response(JSON.stringify({ error: `Failed to load project: ${projErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Count files in the library for this org to prevent redundant Azure API embedding calls if library is empty
    const { count, error: countErr } = await ctx.supabase
      .from('library_documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', project.organization_id);

    if (countErr) {
      console.error('Failed to pre-check library documents count:', countErr.message);
    } else if (count === 0) {
      return new Response(JSON.stringify({
        chunks: [],
        hasDocuments: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build query string = "[nama_program] [sektor] [narasi_singkat] [sectionTitle]"
    const baseQuery = `${project.title || ''} ${project.sector || ''} ${project.summary || ''}`.trim();
    const queryString = sectionTitle ? `${baseQuery} ${sectionTitle}`.trim() : baseQuery;

    if (!queryString) {
      return new Response(JSON.stringify({ chunks: [], hasDocuments: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Generate query embedding using Azure OpenAI model via foundryEmbed
    let embedding: number[];
    try {
      embedding = await foundryEmbed(queryString);
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Failed to generate embedding',
        details: (err as Error).message,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Retrieve matching library chunks via Supabase RPC
    const { data: chunks, error: rpcErr } = await ctx.supabase.rpc('match_library_chunks', {
      _org_id: project.organization_id,
      _query_embedding: embedding,
      _match_count: 5,
      _min_similarity: 0.35,
      _user_id: ctx.userId,
    });

    if (rpcErr) {
      console.error('match_library_chunks RPC error:', rpcErr);
      return new Response(JSON.stringify({ error: 'Failed to search library database' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      chunks: chunks || [],
      hasDocuments: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('grant-writer-rag-references error:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
