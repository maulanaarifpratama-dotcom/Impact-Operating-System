import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import WBSBuilder from '@/pages/dashboard/lfa-builder/WBSBuilder';
import { ProjectWorkspaceNav } from '../ProjectWorkspaceNav';

/**
 * PM-2 scope only: thin wrapper resolving projectId -> orgId and rendering
 * the existing WBSBuilder with productMode="project_management". No second
 * WBS engine -- this reuses lfa_wbs_items and WBSBuilder unchanged in shape,
 * only passing a mode prop it didn't previously accept.
 */
export default function ProjectWBSPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    supabase
      .from('lfa_projects')
      .select('org_id')
      .eq('id', projectId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setOrgId(data?.org_id ?? null);
        }
        setLoading(false);
      });
  }, [projectId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/project-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {projectId && <ProjectWorkspaceNav projectId={projectId} />}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error || !orgId || !projectId ? (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error || 'Proyek tidak ditemukan.'}</CardContent>
        </Card>
      ) : (
        <WBSBuilder projectId={projectId} orgId={orgId} productMode="project_management" />
      )}
    </div>
  );
}
