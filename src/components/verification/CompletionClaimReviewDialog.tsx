import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, XCircle, RotateCcw, Loader2, FileText, ShieldAlert,
  ClipboardCheck, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Evidence {
  id: string;
  evidence_type: string;
  title: string;
  description: string | null;
  storage_reference: string | null;
  uploaded_at: string;
}

interface ClaimDisplay {
  id: string;
  wbsItemId: string;
  claimNote: string | null;
  claimedProgress: number;
  status: string;
  submittedAt: string;
  reviewNote: string | null;
  claimedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

interface WbsContext {
  id: string;
  name: string;
  level: number;
  stageTitle: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  claim: ClaimDisplay;
  wbsContext: WbsContext;
  evidence: Evidence[];
  submitterName: string | null;
  reviewerName: string | null;
  isOwner: boolean;
  currentUserId: string | null;
  onReviewed?: () => void;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'submitted': return 'Menunggu Verifikasi';
    case 'verified': return 'Terverifikasi';
    case 'rejected': return 'Ditolak';
    case 'needs_revision': return 'Perlu Perbaikan';
    default: return status;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'verified': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'submitted': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'needs_revision': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function getLevelLabel(level: number) {
  switch (level) {
    case 2: return 'Activity';
    case 3: return 'Task';
    case 4: return 'Subtask';
    default: return 'Item';
  }
}

export default function CompletionClaimReviewDialog({
  open, onOpenChange, projectId, claim, wbsContext, evidence,
  submitterName, reviewerName, isOwner, currentUserId, onReviewed,
}: Props) {
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSelfClaim = currentUserId && claim.claimedBy === currentUserId;
  const isSubmitted = claim.status === 'submitted';

  const handleDecision = useCallback(async (decision: 'verified' | 'rejected' | 'needs_revision') => {
    if ((decision === 'rejected' || decision === 'needs_revision') && !reviewNote.trim()) {
      toast({ title: 'Catatan Diperlukan', description: 'Berikan catatan untuk penolakan atau permintaan perbaikan.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase.rpc as any)('review_wbs_completion_claim', {
        p_claim_id: claim.id,
        p_decision: decision,
        p_review_note: reviewNote.trim() || null,
      });
      if (error) throw error;
      toast({ title: decision === 'verified' ? 'Klaim Diverifikasi' : decision === 'rejected' ? 'Klaim Ditolak' : 'Revisi Diminta' });
      setReviewNote('');
      if (onReviewed) onReviewed();
    } catch (err: any) {
      toast({ title: 'Gagal memproses review', description: err?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [claim.id, reviewNote, toast, onReviewed]);

  useEffect(() => {
    if (open) setReviewNote('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ClipboardCheck className="h-4 w-4" />
            Detail Klaim Penyelesaian
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <div className="font-semibold">{wbsContext.name}</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline" className="text-[9px] py-0 h-4">{getLevelLabel(wbsContext.level)}</Badge>
              {wbsContext.stageTitle && <span>{wbsContext.stageTitle}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`text-[9px] border ${getStatusBadgeClass(claim.status)}`}>
              {getStatusLabel(claim.status)}
            </Badge>
            <span className="text-muted-foreground">
              {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString('id-ID') : '-'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Pengaju: <span className="text-foreground font-medium">{submitterName || '—'}</span></div>
            <div>Progress: <span className="text-foreground font-medium">{claim.claimedProgress}%</span></div>
          </div>

          {reviewerName && (
            <div className="text-muted-foreground">
              Reviewer: <span className="text-foreground font-medium">{reviewerName}</span>
              {claim.reviewedAt && <span className="ml-2">{new Date(claim.reviewedAt).toLocaleDateString('id-ID')}</span>}
            </div>
          )}

          {claim.claimNote && (
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border text-xs">
              {claim.claimNote}
            </div>
          )}

          {claim.reviewNote && (
            <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-200 text-xs">
              <span className="font-bold block mb-0.5">Catatan Review:</span>
              {claim.reviewNote}
            </div>
          )}

          {evidence.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-bold flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Bukti ({evidence.length})
              </Label>
              {evidence.map((ev) => (
                <div key={ev.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 border rounded flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="text-[8px] py-0">{ev.evidence_type}</Badge>
                    <span className="ml-2 font-medium">{ev.title}</span>
                  </div>
                  {ev.storage_reference && (
                    <a href={ev.storage_reference} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px] flex items-center gap-0.5">
                      <ExternalLink className="h-3 w-3" /> Buka
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {isSelfClaim && claim.status !== 'needs_revision' && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[10px]">
                <span className="font-bold block">Verifikasi Dibatasi</span>
                <span className="text-muted-foreground">Anda adalah pengaju klaim ini. Verifikasi harus dilakukan oleh pemilik organisasi.</span>
              </div>
            </div>
          )}

          {isOwner && isSubmitted && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-bold">Catatan Review (wajib untuk revisi/penolakan):</Label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Catatan untuk pengaju klaim..."
                className="text-xs h-16"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">Tutup</Button>
          {isOwner && isSubmitted && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleDecision('needs_revision')} disabled={submitting} className="text-xs text-orange-600">
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Revisi
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDecision('rejected')} disabled={submitting} className="text-xs text-red-600">
                <XCircle className="mr-1 h-3.5 w-3.5" /> Tolak
              </Button>
              <Button size="sm" onClick={() => handleDecision('verified')} disabled={submitting} className="text-xs bg-emerald-600 hover:bg-emerald-500">
                {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                Verifikasi
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
