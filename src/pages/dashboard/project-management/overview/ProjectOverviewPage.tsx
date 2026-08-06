import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';

/**
 * PM-3 scope only: read-only summary of each engine's own state, shown
 * separately -- WBS progress, Stage progress, Budget total, Deliverable
 * counts, MEAL indicator count, recent activity. Deliberately NOT combined
 * into one blended score: each engine measures a different thing (physical
 * completion, financial spend, deliverable lifecycle, indicator coverage)
 * and collapsing them would misrepresent all of them.
 */
interface Summary {
  wbsTotal: number;
  wbsCompleted: number;
  stageTotal: number;
  stageCompleted: number;
  budgetTotalIdr: number;
  deliverableCounts: Record<string, number>;
  mealCount: number;
  recentEventCount: number;
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [wbsRes, stagesRes, budgetRes, delivRes, mealRes, eventsRes] = await Promise.all([
          supabase.from('lfa_wbs_items').select('id, status').eq('lfa_project_id', projectId),
          (supabase as any).from('project_stages').select('id, status').eq('project_id', projectId),
          supabase.from('lfa_budget_items').select('volume, unit_price_idr').eq('lfa_project_id', projectId),
          (supabase as any).from('programme_deliverables').select('lifecycle_status').eq('lfa_project_id', projectId),
          supabase.from('lfa_meal_items').select('id').eq('lfa_project_id', projectId),
          (supabase as any)
            .from('project_activity_events')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId),
        ]);

        if (wbsRes.error) throw wbsRes.error;
        if (stagesRes.error) throw stagesRes.error;
        if (budgetRes.error) throw budgetRes.error;
        if (delivRes.error) throw delivRes.error;
        if (mealRes.error) throw mealRes.error;

        const wbsRows = wbsRes.data || [];
        const stageRows = (stagesRes.data || []) as { id: string; status: string }[];
        const budgetTotalIdr = (budgetRes.data || []).reduce(
          (acc: number, i: { volume: number; unit_price_idr: number }) =>
            acc + (Number(i.volume) || 0) * (Number(i.unit_price_idr) || 0),
          0,
        );
        const deliverableCounts: Record<string, number> = {};
        for (const d of (delivRes.data || []) as { lifecycle_status: string }[]) {
          deliverableCounts[d.lifecycle_status] = (deliverableCounts[d.lifecycle_status] || 0) + 1;
        }

        setSummary({
          wbsTotal: wbsRows.length,
          wbsCompleted: wbsRows.filter((w: { status?: string }) => w.status === 'completed').length,
          stageTotal: stageRows.length,
          stageCompleted: stageRows.filter((s) => s.status === 'completed').length,
          budgetTotalIdr,
          deliverableCounts,
          mealCount: (mealRes.data || []).length,
          recentEventCount: eventsRes.count || 0,
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/project-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {projectId && <ProjectWorkspaceNav projectId={projectId} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan tiap engine secara terpisah -- tidak digabung menjadi satu skor.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading || !summary ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">WBS Progress</CardTitle>
              <CardDescription>Item selesai / total</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summary.wbsCompleted} / {summary.wbsTotal}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Stage Progress</CardTitle>
              <CardDescription>Stage selesai / total</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summary.stageCompleted} / {summary.stageTotal}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Budget Total</CardTitle>
              <CardDescription>Seluruh Budget Item</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatIDR(summary.budgetTotalIdr)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Deliverables</CardTitle>
              <CardDescription>Per status lifecycle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.keys(summary.deliverableCounts).length === 0 ? (
                <span className="text-muted-foreground">Belum ada Deliverable</span>
              ) : (
                Object.entries(summary.deliverableCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-muted-foreground">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">MEAL Indicators</CardTitle>
              <CardDescription>Total indikator</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.mealCount}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <CardDescription>Total event tercatat</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.recentEventCount}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
