// src/pages/dashboard/SustainabilityReports.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Sparkles, History, CheckCircle2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { compileSustainabilityReport } from '@/lib/reports/compiler';
import { saveReportSnapshot, getOrgReportSnapshots } from '@/lib/reports/snapshot';
import { exportReportToPDF, exportReportToDOCX } from '@/lib/reports/exporters';
import { REPORT_TEMPLATES } from '@/lib/reports/templates';
import { ReportTemplateType, ReportSnapshotRecord } from '@/lib/reports/types';
import { formatCurrency } from '@/lib/carbon/formatters';

export default function SustainabilityReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('GRI');
  const [currentSnapshot, setCurrentSnapshot] = useState<ReportSnapshotRecord | null>(null);
  const [snapshots, setSnapshots] = useState<ReportSnapshotRecord[]>([]);

  useEffect(() => {
    async function loadOrgAndSnapshots() {
      if (!user?.id) return;

      try {
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, organizations(id, name)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        const orgId = member?.organization_id || 'demo-org';
        const orgName = (member?.organizations as any)?.name || 'Organisasi Impactory';
        setOrgInfo({ id: orgId, name: orgName });

        const history = await getOrgReportSnapshots(orgId);
        setSnapshots(history);
      } catch (err) {
        console.error('Error loading organization:', err);
      }
    }

    loadOrgAndSnapshots();
  }, [user?.id]);

  const handleGenerateReport = async () => {
    if (!orgInfo) return;
    setLoading(true);

    try {
      // 1. Automatically compile LFA + WBS + Budget + MEAL + SROI + EROI + ESG data
      const compiledPayload = await compileSustainabilityReport(orgInfo.id, undefined, selectedTemplate);

      // 2. Save immutable snapshot into esg_report_snapshots
      const snapshot = await saveReportSnapshot(orgInfo.id, selectedTemplate, compiledPayload);

      if (snapshot) {
        setCurrentSnapshot(snapshot);
        setSnapshots((prev) => [snapshot, ...prev]);
      }
    } catch (err) {
      console.error('Failed to generate report snapshot:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!currentSnapshot) return;
    exportReportToPDF(currentSnapshot.snapshot_json, currentSnapshot.report_type);
  };

  const handleDownloadDOCX = () => {
    if (!currentSnapshot) return;
    exportReportToDOCX(currentSnapshot.snapshot_json, currentSnapshot.report_type);
  };

  const activeMeta = REPORT_TEMPLATES[selectedTemplate];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
              <FileText className="w-3.5 h-3.5 mr-1" /> Sustainability Intelligence
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sustainability Report Generator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Kompilasi otomatis LFA, WBS, Budget, MEAL, SROI, EROI, dan ESG ke dalam Laporan Keberlanjutan imutabel (GRI, SEOJK, SDGs) tanpa *double entry*.
          </p>
        </div>
      </div>

      {/* GENERATOR CONTROLS & TEMPLATE SELECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pilih Template Laporan</CardTitle>
            <CardDescription className="text-xs">
              Pilih standar pelaporan nasional atau internasional yang sesuai.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Standard / Kerangka Kerja</label>
              <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as ReportTemplateType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Kerangka Pelaporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRI">GRI Standards (GRI 302/305/413)</SelectItem>
                  <SelectItem value="SEOJK">SEOJK No. 16/SEOJK.04/2021 (OJK)</SelectItem>
                  <SelectItem value="SDG">UN SDGs Contribution Matrix</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive Brief (3 Halaman)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-xs space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{activeMeta.title}</div>
              <p className="text-slate-500">{activeMeta.description}</p>
              <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Audiens Utama:</strong> {activeMeta.target_audience}
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengompilasi Data...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Sustainability Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* COMPILED SNAPSHOT PREVIEW & DOWNLOAD ACTIONS */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Hasil Kompilasi Snapshot Terakhir</CardTitle>
                <CardDescription className="text-xs">
                  {currentSnapshot ? `Snapshot ID: ${currentSnapshot.id}` : 'Belum ada laporan yang digenerate pada sesi ini'}
                </CardDescription>
              </div>
              {currentSnapshot && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Immutable Snapshot Saved
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!currentSnapshot ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <FileText className="w-10 h-10 text-slate-400" />
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Siap Mengompilasi Laporan Keberlanjutan
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Klik tombol <strong>"Generate Sustainability Report"</strong> untuk mengompilasi data LFA, WBS, Budget, MEAL, SROI, dan Carbon Engine secara otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tipe Laporan</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentSnapshot.report_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Penerima Manfaat</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentSnapshot.snapshot_json.social_impact.total_beneficiaries} Jiwa</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Net Impact Karbon</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentSnapshot.snapshot_json.environmental_impact.net_impact_co2e_tons} Tons CO₂e</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Net Social Value</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(currentSnapshot.snapshot_json.social_impact.social_value_generated_idr)}</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl space-y-2">
                  <div className="font-semibold text-emerald-900 dark:text-emerald-300">Narasi Eksekutif Hasil Kompilasi:</div>
                  <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    "{currentSnapshot.snapshot_json.ai_narratives?.executive_statement}"
                  </p>
                </div>

                {/* DOWNLOAD BUTTONS ROW */}
                <div className="pt-2 border-t flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    onClick={handleDownloadDOCX}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" /> Download DOCX
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* HISTORICAL SNAPSHOTS TABLE */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Riwayat Snapshot Laporan Imutabel (esg_report_snapshots)
          </CardTitle>
          <CardDescription className="text-xs">
            Daftar snapshot versi laporan yang tersimpan secara imutabel tanpa izin pengubahan data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-xs text-slate-500 p-4 text-center">Belum ada riwayat snapshot tersimpan.</div>
          ) : (
            <div className="divide-y text-xs">
              {snapshots.map((snap) => (
                <div key={snap.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{snap.report_title}</div>
                    <div className="text-[11px] text-slate-500">
                      Waktu Pembuatan: {new Date(snap.created_at).toLocaleString('id-ID')} | Periode: {snap.report_period}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 px-2 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => exportReportToPDF(snap.snapshot_json, snap.report_type)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 px-2 text-blue-700 hover:bg-blue-50"
                      onClick={() => exportReportToDOCX(snap.snapshot_json, snap.report_type)}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> DOCX
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
