import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';

type LfaDoc = Database['public']['Tables']['gw_lfa_documents']['Row'];
type Project = Database['public']['Tables']['gw_projects']['Row'];

/** Minimal Markdown → HTML for the donor-ready preview. */
function renderMarkdown(md: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = md.split('\n');
  const out: string[] = [];
  let inTable = false;
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const flushTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/&lt;br\/&gt;/g, '<br/>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#\s+/.test(line)) { flushList(); flushTable(); out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`); continue; }
    if (/^##\s+/.test(line)) { flushList(); flushTable(); out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^###\s+/.test(line)) { flushList(); flushTable(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^---\s*$/.test(line)) { flushList(); flushTable(); out.push('<hr/>'); continue; }
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const isSep = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSep) continue;
      if (!inTable) {
        flushList();
        out.push('<table class="w-full border-collapse text-sm"><thead><tr>');
        cells.forEach((c) => out.push(`<th class="border px-2 py-1 text-left bg-muted">${inline(c)}</th>`));
        out.push('</tr></thead><tbody>');
        inTable = true;
      } else {
        out.push('<tr>');
        cells.forEach((c) => out.push(`<td class="border px-2 py-1 align-top">${inline(c)}</td>`));
        out.push('</tr>');
      }
      continue;
    }
    flushTable();
    if (/^- /.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1">'); inList = true; }
      out.push(`<li>${inline(line.replace(/^- /, ''))}</li>`);
      continue;
    }
    flushList();
    if (line.trim() === '') { out.push(''); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  flushTable();
  return out.join('\n');
}

export default function GrantWriterProposal() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<LfaDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('gw_projects').select('*').eq('id', projectId).maybeSingle(),
        supabase
          .from('gw_lfa_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setProject(p ?? null);
      setDoc(d ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const html = useMemo(() => (doc ? renderMarkdown(doc.markdown ?? '') : ''), [doc]);

  const handleDownload = () => {
    if (!doc) return;
    const blob = new Blob([doc.markdown ?? ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.title ?? 'proposal'}-v${doc.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Diunduh', description: 'File Markdown tersimpan.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat proposal…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to={`/dashboard/grant-writer/${projectId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke wizard
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project?.title ?? 'Proposal'}
          </h1>
          {doc && (
            <p className="text-sm text-muted-foreground">
              Versi {doc.version} · Dibuat {new Date(doc.created_at).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        {doc && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">LFA · UN/OECD-DAC</Badge>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Unduh Markdown
            </Button>
          </div>
        )}
      </div>

      {!doc ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-accent/10 p-4">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Belum ada proposal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Selesaikan wizard 7 langkah lalu klik "Buat Proposal" untuk menghasilkan
                dokumen donor-ready.
              </p>
            </div>
            <Button asChild>
              <Link to={`/dashboard/grant-writer/${projectId}`}>
                <Sparkles className="mr-1 h-4 w-4" /> Lanjutkan wizard
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <article
              className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h3:text-base prose-table:my-4 prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}