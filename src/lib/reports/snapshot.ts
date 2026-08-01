// src/lib/reports/snapshot.ts
import { supabase } from '@/integrations/supabase/client';
import { UnifiedReportPayload, ReportSnapshotRecord, ReportTemplateType } from './types';

/**
 * Saves an immutable snapshot of a compiled Sustainability Report to Supabase.
 */
export async function saveReportSnapshot(
  orgId: string,
  templateType: ReportTemplateType,
  payload: UnifiedReportPayload
): Promise<ReportSnapshotRecord> {
  const period = payload.metadata.period;
  const reportTitle = `Laporan Keberlanjutan ${templateType} - ${period}`;

  try {
    const { data, error } = await supabase
      .from('esg_report_snapshots' as any)
      .insert({
        org_id: orgId,
        report_title: reportTitle,
        report_type: templateType,
        report_period: period,
        snapshot_json: payload as any,
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

    return data as unknown as ReportSnapshotRecord;
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
    return data as unknown as ReportSnapshotRecord[];
  } catch (err) {
    console.warn('Could not fetch report snapshots:', err);
    return [];
  }
}
