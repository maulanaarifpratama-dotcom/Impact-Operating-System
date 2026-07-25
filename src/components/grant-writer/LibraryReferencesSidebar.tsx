import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown, ChevronUp, Sparkles, AlertCircle, FileText } from 'lucide-react';

interface LibraryChunk {
  id?: string;
  document_id?: string;
  document_title?: string;
  content?: string;
  similarity?: number;
  chunk_index?: number;
}

interface LibraryReferencesSidebarProps {
  projectId: string;
  currentStepId: string;
}

// Maps step ID to a readable indonesian section title for context queries
const mapStepToSectionTitle = (stepId: string): string => {
  const mapping: Record<string, string> = {
    context: 'Konteks Proyek Latar Belakang Sektor',
    stakeholders: 'Pemangku Kepentingan Penerima Manfaat',
    problem_tree: 'Pohon Masalah Masalah Utama Penyebab Dampak',
    objectives: 'Tujuan Sasaran Dampak SMART',
    lfa_matrix: 'Aktivitas Kegiatan Sumber Daya Rencana Kerja',
    indicators: 'Indikator MoV Evaluasi',
    risks: 'Risiko Asumsi Mitigasi',
    // Quick Mode Steps
    organization: 'Profil Organisasi',
    program: 'Rencana Program Deskripsi',
    budget: 'Anggaran Biaya Durasi',
    generate: 'Draf Proposal',
  };
  return mapping[stepId] || '';
};

export function LibraryReferencesSidebar({ projectId, currentStepId }: LibraryReferencesSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [chunks, setChunks] = useState<LibraryChunk[]>([]);
  const [hasDocuments, setHasDocuments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sectionTitle = mapStepToSectionTitle(currentStepId);

  useEffect(() => {
    if (!projectId) return;

    let active = true;
    const fetchReferences = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await supabase.functions.invoke('grant-writer-rag-references', {
          body: { projectId, sectionTitle },
        });
        const data = res?.data;
        const fnError = res?.error;

        if (!active) return;

        if (fnError || data?.error) {
          setError(fnError?.message || data?.error || 'Gagal memuat referensi');
        } else {
          setChunks(data?.chunks || []);
          setHasDocuments(data?.hasDocuments ?? true);
        }
      } catch (err) {
        if (!active) return;
        console.error('Failed to load library references:', err);
        setError('Terjadi kesalahan koneksi');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchReferences();

    return () => {
      active = false;
    };
  }, [projectId, currentStepId, sectionTitle]);

  return (
    <Card className="border border-border/80 bg-card shadow-sm transition-all duration-300">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left font-semibold outline-none hover:bg-muted/30 focus:bg-muted/50 rounded-t-xl transition-all"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-indigo-50 p-1.5 dark:bg-indigo-950/40">
            <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Referensi dari Library Kamu
              {!loading && chunks.length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </h3>
            <p className="text-[10px] text-muted-foreground font-normal">Konteks personal berbasis dokumen organisasi</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <CardContent className="border-t border-border/50 p-4 space-y-3 max-h-[360px] overflow-y-auto scrollbar-thin">
          {loading ? (
            // Loading Skeletons
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border/40 p-3 animate-pulse bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
                    <div className="h-4 w-16 rounded bg-muted-foreground/15" />
                  </div>
                  <div className="h-2 w-full rounded bg-muted-foreground/10" />
                  <div className="h-2 w-5/6 rounded bg-muted-foreground/10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-amber-600 dark:text-amber-500 gap-1 bg-amber-50/20 dark:bg-amber-950/10 rounded-lg p-3 border border-amber-100 dark:border-amber-900/30">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Gagal menyinkronkan referensi library.</span>
              <span className="text-[10px] text-muted-foreground">Proposal tetap berfungsi normal.</span>
            </div>
          ) : !hasDocuments ? (
            // Empty State (No uploaded files)
            <div className="flex flex-col items-center justify-center text-center p-4 py-8 rounded-lg border border-dashed border-border/70 bg-muted/5 gap-3">
              <div className="rounded-full bg-indigo-50/50 p-2.5 dark:bg-indigo-950/20">
                <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <p className="text-xs font-medium text-foreground px-2">
                Upload dokumen ke Impact Library untuk mendapatkan referensi yang lebih personal
              </p>
            </div>
          ) : chunks.length === 0 ? (
            // Empty State (Uploaded files exist but 0 matches for this specific query)
            <div className="flex flex-col items-center justify-center text-center p-4 py-6 rounded-lg border border-border/40 bg-muted/5 gap-2">
              <FileText className="h-4 w-4 text-muted-foreground/70" />
              <p className="text-xs text-muted-foreground px-2">
                Tidak ada referensi di Library yang cukup relevan dengan topik seksi ini (kesamaan di bawah 35%).
              </p>
            </div>
          ) : (
            // Matched Chunks (Show top 2-3 matched items)
            <div className="space-y-3">
              {chunks.slice(0, 3).map((chunk, idx) => {
                const docTitle = chunk.document_title || 'Dokumen Tanpa Judul';
                const contentText = chunk.content || '';
                const similarityScore = chunk.similarity ? Math.round(chunk.similarity * 100) : 0;
                const truncatedText = contentText.length > 120 ? contentText.slice(0, 120) + '...' : contentText;

                return (
                  <div
                    key={idx}
                    className="group relative flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground group-hover:text-indigo-600 transition-colors" title={docTitle}>
                        {docTitle}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold rounded-full border-none"
                      >
                        {similarityScore}% relevan
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed leading-snug">
                      "{truncatedText}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
