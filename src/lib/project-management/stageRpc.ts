import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical Stage RPC helpers for Project Management.
 *
 * Every call sends ALL required positional parameters, with optional
 * values defaulting to null. These MUST match the exact RPC signatures
 * defined in the Production migration:
 *
 *   create_project_stage(uuid,text,text,uuid,date,date)
 *   update_project_stage_metadata(uuid,text,text,uuid,text,date,date,date,date)
 *   reorder_project_stages(uuid,uuid[])
 *   archive_project_stage(uuid)
 *   restore_project_stage(uuid)
 */

export interface CreateStageParams {
  projectId: string;
  title: string;
  description?: string | null;
  primaryObjectiveId?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

export interface UpdateStageParams {
  stageId: string;
  title: string;
  description?: string | null;
  primaryObjectiveId?: string | null;
  status?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
}

export function createProjectStage(params: CreateStageParams) {
  return (supabase.rpc as any)('create_project_stage', {
    p_project_id: params.projectId,
    p_title: params.title,
    p_description: params.description ?? null,
    p_primary_objective_id: params.primaryObjectiveId ?? null,
    p_planned_start_date: params.plannedStartDate ?? null,
    p_planned_end_date: params.plannedEndDate ?? null,
  });
}

export function updateProjectStageMetadata(params: UpdateStageParams) {
  return (supabase.rpc as any)('update_project_stage_metadata', {
    p_stage_id: params.stageId,
    p_title: params.title,
    p_description: params.description ?? null,
    p_primary_objective_id: params.primaryObjectiveId ?? null,
    p_status: params.status ?? 'not_started',
    p_planned_start_date: params.plannedStartDate ?? null,
    p_planned_end_date: params.plannedEndDate ?? null,
    p_actual_start_date: params.actualStartDate ?? null,
    p_actual_end_date: params.actualEndDate ?? null,
  });
}

export function reorderProjectStages(projectId: string, orderedIds: string[]) {
  return (supabase.rpc as any)('reorder_project_stages', {
    p_project_id: projectId,
    p_ordered_ids: orderedIds,
  });
}

export function archiveProjectStage(stageId: string) {
  return (supabase.rpc as any)('archive_project_stage', { p_stage_id: stageId });
}

export function restoreProjectStage(stageId: string) {
  return (supabase.rpc as any)('restore_project_stage', { p_stage_id: stageId });
}
