import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import GrantWriterWizard from './GrantWriterWizard';
import GrantWriterQuickWizard from './GrantWriterQuickWizard';

export default function GrantWriterRouteGuard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [targetComponent, setTargetComponent] = useState<'standard' | 'quick' | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;

    async function checkRoute() {
      try {
        // 1. Check if proposal exists
        const { data: doc, error: docError } = await supabase
          .from('gw_lfa_documents')
          .select('proposal_markdown')
          .eq('project_id', projectId)
          .eq('is_current', true)
          .maybeSingle();

        if (docError) {
          console.error('Error fetching proposal document:', docError);
        }

        if (doc && doc.proposal_markdown && doc.proposal_markdown.trim() !== '') {
          // Redirect to proposal view
          if (isMounted) {
            navigate(`/dashboard/grant-writer/${projectId}/proposal`, { replace: true });
          }
          return;
        }

        // 2. Proposal not available, check project mode
        const { data: proj, error: projError } = await supabase
          .from('gw_projects')
          .select('wizard_data')
          .eq('id', projectId)
          .maybeSingle();

        if (projError) {
          console.error('Error fetching project:', projError);
        }

        const wd = (proj?.wizard_data ?? {}) as Record<string, any>;
        const isQuickMode = wd._mode === 'quick';

        if (isMounted) {
          if (isQuickMode) {
            if (!location.pathname.includes('/quick/')) {
              navigate(`/dashboard/grant-writer/quick/${projectId}`, { replace: true });
            } else {
              setTargetComponent('quick');
              setLoading(false);
            }
          } else {
            if (location.pathname.includes('/quick/')) {
              navigate(`/dashboard/grant-writer/${projectId}`, { replace: true });
            } else {
              setTargetComponent('standard');
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('Error in RouteGuard:', err);
        // Fallback to standard wizard in case of unexpected error to avoid blocking the user
        if (isMounted) {
          setTargetComponent('standard');
          setLoading(false);
        }
      }
    }

    checkRoute();

    return () => {
      isMounted = false;
    };
  }, [projectId, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (targetComponent === 'quick') {
    return <GrantWriterQuickWizard />;
  }

  return <GrantWriterWizard />;
}
