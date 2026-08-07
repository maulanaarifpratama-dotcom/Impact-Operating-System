import { supabase } from '@/integrations/supabase/client';

export interface BaselineRow {
  id: string;
  project_id: string;
  version: number;
  created_by: string;
  created_at: string;
}

export function createProjectBaseline(projectId: string) {
  return (supabase.rpc as any)('create_project_baseline', {
    p_project_id: projectId,
  });
}

export async function fetchProjectBaseline(projectId: string): Promise<BaselineRow | null> {
  const { data, error } = await (supabase as any)
    .from('project_baselines')
    .select('id, project_id, version, created_by, created_at')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data as BaselineRow | null;
}
