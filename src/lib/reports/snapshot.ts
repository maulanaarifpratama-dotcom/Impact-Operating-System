// src/lib/reports/snapshot.ts
import { supabase } from '@/integrations/supabase/client';
import { UnifiedReportPayload, ReportSnapshotRecord, ReportTemplateType } from './types';
import { REPORT_TEMPLATES } from './templates';

/**
 * Saves a compiled report payload as an immutable snapshot in Supabase `esg_report_snapshots`.
 */
export async function saveReportSnapshot(
  orgId: string,
  payload: UnifiedReportPayload,
  templateType: ReportTemplateType = 'GRI',
  period: string = '2026'
): Promise<ReportSnapshotRecord | null> {
  const templateMeta = REPORT_TEMPLATES[templateType] || REPORT_TEMPLATES.GRI;
  const reportTitle = `${templateMeta.title} - ${payload.organization.name} (${period})`;

  try {
    const { data, error } = await supabase
      .from('esg_report_snapshots' as any)
      .insert({
        org_id: orgId,
        report_title: reportTitle,
        report_type: templateType,
        report_period: period,
        snapshot_json: payload,
      })
      .select()
      .single();

    if (error) {
      console.warn('Snapshot Storage Error (Falling back to local record):', error.message);
      return {
        id: `local-snap-${Date.now()}`,
        org_id: orgId,
        report_title: reportTitle,
        report_type: templateType,
        report_period: period,
        snapshot_json: payload,
        created_at: new Date().toISOString(),
      };
    }

    return data as ReportSnapshotRecord;
  } catch (err) {
    console.error('Snapshot Storage Exception:', err);
    return {
      id: `local-snap-${Date.now()}`,
      org_id: orgId,
      report_title: reportTitle,
      report_type: templateType,
      report_period: period,
      snapshot_json: payload,
      created_at: new Date().toISOString(),
    };
  }
}

/**
 * Fetches historical report snapshots for an organization.
 */
export async function getOrgReportSnapshots(orgId: string): Promise<ReportSnapshotRecord[]> {
  try {
    const { data, error } = await supabase
      .from('esg_report_snapshots' as any)
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ReportSnapshotRecord[];
  } catch (err) {
    console.warn('Could not fetch report snapshots:', err);
    return [];
  }
}
