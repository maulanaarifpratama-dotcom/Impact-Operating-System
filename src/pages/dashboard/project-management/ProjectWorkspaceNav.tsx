import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Lock, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOrgRole } from '@/hooks/useOrgRole';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { createProjectBaseline, fetchProjectBaseline, type BaselineRow } from '@/lib/project-management/baselineRpc';
import { openPmPdfReport } from '@/lib/project-management/pmPdfExport';

export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { role: orgRole } = useOrgRole();
  const isOwner = orgRole === 'owner';

  const [baseline, setBaseline] = useState<BaselineRow | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const loadBaseline = useCallback(async () => {
    setBaselineLoading(true);
    try {
      const b = await fetchProjectBaseline(projectId);
      setBaseline(b);
    } catch {
      setBaseline(null);
    } finally {
      setBaselineLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadBaseline(); }, [loadBaseline]);

  useEffect(() => {
    supabase.from('lfa_projects').select('org_id').eq('id', projectId).single().then(({ data }) => {
      if (data) setOrgId((data as any).org_id);
    });
  }, [projectId]);

  const handleLock = async () => {
    if (!confirm('Kunci baseline proyek? Baseline akan merekam snapshot jadwal dan aktivitas saat ini.')) return;
    setLocking(true);
    try {
      const { error } = await createProjectBaseline(projectId);
      if (error) throw error;
      toast({ title: 'Baseline terkunci' });
      void loadBaseline();
    } catch (e: any) {
      toast({ title: 'Gagal mengunci baseline', description: e?.message, variant: 'destructive' });
    } finally {
      setLocking(false);
    }
  };

  const handlePrint = async () => {
    if (!orgId) return;
    setPrinting(true);
    try {
      await openPmPdfReport(projectId, orgId);
    } catch (e: any) {
      toast({ title: 'Gagal export PDF', description: e?.message, variant: 'destructive' });
    } finally {
      setPrinting(false);
    }
  };

  const tabs = [
    { name: 'Work Plan', href: `/dashboard/project-management/${projectId}/wbs` },
    { name: 'Budget', href: `/dashboard/project-management/${projectId}/budget` },
    { name: 'MEAL', href: `/dashboard/project-management/${projectId}/meal` },
  ];

  return (
    <div className="flex items-center gap-1 border-b pb-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          {tab.name}
        </NavLink>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          disabled={printing || !orgId}
          className="text-xs"
          title="Export Project Report (PDF)"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Report
        </Button>
        {isOwner && !baselineLoading && !baseline && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLock}
            disabled={locking}
            className="text-xs"
          >
            {locking ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Lock className="mr-1.5 h-3 w-3" />}
            Lock Baseline
          </Button>
        )}
        {isOwner && baseline && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>Baseline v{baseline.version}</span>
            <span className="text-slate-400">
              {new Date(baseline.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
