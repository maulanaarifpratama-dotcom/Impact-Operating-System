// src/lib/reports/exporters.ts
import { UnifiedReportPayload, ReportTemplateType } from './types';
import { REPORT_TEMPLATES } from './templates';
import { appStylesheetTags, finalizePrintWindow } from '@/lib/print/printWindow';
import { formatCurrency, formatCarbonMass, formatTreesEquivalent } from '@/lib/carbon/formatters';

/**
 * PDF Exporter Engine
 * Renders Executive Brief template in a CSP-compliant print window for PDF export/download.
 */
export function exportReportToPDF(
  payload: UnifiedReportPayload,
  templateType: ReportTemplateType = 'EXECUTIVE'
): void {
  const meta = REPORT_TEMPLATES[templateType] || REPORT_TEMPLATES.EXECUTIVE;
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup diblokir oleh browser. Harap izinkan popup untuk mengunduh PDF.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${meta.title} - ${payload.organization.name}</title>
  ${appStylesheetTags()}
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; }
    .page-break { page-break-before: always; }
    .header-banner { border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .section-title { color: #065f46; border-left: 4px solid #10b981; padding-left: 8px; margin-top: 24px; margin-bottom: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <!-- HEADER BANNER -->
  <div class="header-banner flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">${meta.title}</h1>
      <p class="text-xs text-slate-500">${payload.organization.name} | ${payload.organization.legal_entity || 'Organisasi Impactory'}</p>
    </div>
    <div class="text-right">
      <span class="inline-block bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">${meta.code}</span>
      <p class="text-[10px] text-slate-400 mt-1">Tanggal Terbit: ${new Date().toLocaleDateString('id-ID')}</p>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="metric-card bg-emerald-50/50 border-emerald-200">
    <h3 class="text-sm font-semibold text-emerald-900 mb-1">Pernyataan Eksekutif & Ringkasan Dampak</h3>
    <p class="text-xs text-slate-700 italic">
      "${payload.ai_narratives?.executive_statement || 'Laporan ini mengompilasi kinerja keberlanjutan organisasi.'}"
    </p>
  </div>

  <!-- SECTION 1: PROGRAM OVERVIEW -->
  <h2 class="section-title text-base">1. Gambaran Umum Program & Eksekusi WBS</h2>
  <div class="grid grid-cols-2 gap-4 text-xs">
    <div class="metric-card">
      <span class="text-slate-500 block">Nama Program</span>
      <span class="font-bold text-slate-800">${payload.program.name}</span>
    </div>
    <div class="metric-card">
      <span class="text-slate-500 block">Tingkat Penyelesaian WBS</span>
      <span class="font-bold text-emerald-600">${payload.execution_summary.completion_rate_percentage}% (${payload.execution_summary.completed_activities}/${payload.execution_summary.total_wbs_activities} Aktivitas)</span>
    </div>
  </div>

  <!-- SECTION 2: FINANCIAL SUMMARY -->
  <h2 class="section-title text-base">2. Ringkasan Realisasi Keuangan & Budget</h2>
  <div class="grid grid-cols-2 gap-4 text-xs">
    <div class="metric-card">
      <span class="text-slate-500 block">Total Perencanaan Budget (RAB)</span>
      <span class="font-bold text-slate-800">${formatCurrency(payload.financial_summary.total_planned_budget_idr)}</span>
    </div>
    <div class="metric-card">
      <span class="text-slate-500 block">Realisasi Anggaran</span>
      <span class="font-bold text-blue-600">${formatCurrency(payload.financial_summary.total_actual_spend_idr)} (${payload.financial_summary.budget_realization_percentage}%)</span>
    </div>
  </div>

  <!-- SECTION 3: SOCIAL & ENVIRONMENTAL IMPACT -->
  <h2 class="section-title text-base">3. Kinerja Dampak Sosial & Lingkungan (SROI & EROI)</h2>
  <div class="grid grid-cols-2 gap-4 text-xs">
    <div class="metric-card">
      <span class="text-slate-500 block">Total Penerima Manfaat</span>
      <span class="font-bold text-slate-800">${payload.social_impact.total_beneficiaries.toLocaleString('id-ID')} Jiwa (${payload.social_impact.female_percentage}% Perempuan)</span>
    </div>
    <div class="metric-card">
      <span class="text-slate-500 block">Net Social Value (SROI Ratio)</span>
      <span class="font-bold text-purple-600">${formatCurrency(payload.social_impact.social_value_generated_idr)} (Ratio 1 : ${payload.social_impact.sroi_ratio})</span>
    </div>
    <div class="metric-card">
      <span class="text-slate-500 block">Net Impact Karbon (CO₂e)</span>
      <span class="font-bold text-emerald-600">${formatCarbonMass(payload.environmental_impact.net_impact_co2e_kg)} (Setara ${formatTreesEquivalent(payload.environmental_impact.trees_equivalent)})</span>
    </div>
    <div class="metric-card">
      <span class="text-slate-500 block">Nilai Ekonomi Karbon (EROI Ratio)</span>
      <span class="font-bold text-amber-600">${formatCurrency(payload.environmental_impact.monetized_environmental_value_idr)} (Ratio 1 : ${payload.environmental_impact.eroi_ratio})</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="mt-8 pt-4 border-t text-[10px] text-slate-400 flex justify-between">
    <span>Digenerate otomatis oleh Impactory Sustainability Intelligence Engine</span>
    <span>Halaman 1 dari 1</span>
  </div>
</body>
</html>`;

  printWin.document.write(html);
  finalizePrintWindow(printWin, { auto: true });
}

/**
 * DOCX Exporter Engine
 * Generates structured Word document (.docx) Blob and triggers browser download.
 */
export function exportReportToDOCX(
  payload: UnifiedReportPayload,
  templateType: ReportTemplateType = 'EXECUTIVE'
): void {
  const meta = REPORT_TEMPLATES[templateType] || REPORT_TEMPLATES.EXECUTIVE;
  const fileName = `${meta.code}_${payload.organization.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;

  const docxHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${meta.title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #333333; line-height: 1.4; }
    h1 { color: #065f46; font-size: 18pt; border-bottom: 2pt solid #10b981; padding-bottom: 4pt; }
    h2 { color: #047857; font-size: 14pt; margin-top: 14pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 12pt; }
    th { background-color: #f1f5f9; text-align: left; padding: 6pt; border: 1pt solid #cbd5e1; font-size: 10pt; }
    td { padding: 6pt; border: 1pt solid #cbd5e1; font-size: 10pt; }
    .box { background-color: #ecfdf5; border: 1pt solid #a7f3d0; padding: 8pt; margin-bottom: 10pt; border-radius: 4pt; }
  </style>
</head>
<body>
  <h1>${meta.title}</h1>
  <p><strong>Organisasi:</strong> ${payload.organization.name} (${payload.organization.legal_entity || 'Organisasi Nirlaba'})</p>
  <p><strong>Tanggal Terbit:</strong> ${new Date().toLocaleDateString('id-ID')}</p>

  <div class="box">
    <strong>Pernyataan Ringkasan Eksekutif:</strong><br>
    <em>"${payload.ai_narratives?.executive_statement || 'Laporan ini merangkum kinerja keberlanjutan terintegrasi.'}"</em>
  </div>

  <h2>1. Gambaran Program & Eksekusi WBS</h2>
  <table>
    <tr><th>Parameter</th><th>Nilai Capaian</th></tr>
    <tr><td>Nama Program</td><td>${payload.program.name}</td></tr>
    <tr><td>Total Aktivitas WBS</td><td>${payload.execution_summary.total_wbs_activities} Aktivitas</td></tr>
    <tr><td>Tingkat Penyelesaian WBS</td><td>${payload.execution_summary.completion_rate_percentage}%</td></tr>
    <tr><td>Verifikasi Bukti Lapangan</td><td>${payload.execution_summary.evidence_verification_rate}%</td></tr>
  </table>

  <h2>2. Kinerja Keuangan & Realisasi Budget</h2>
  <table>
    <tr><th>Kategori Budget</th><th>Jumlah (IDR)</th></tr>
    <tr><td>Perencanaan RAB Budget</td><td>${formatCurrency(payload.financial_summary.total_planned_budget_idr)}</td></tr>
    <tr><td>Realisasi Anggaran Terpakai</td><td>${formatCurrency(payload.financial_summary.total_actual_spend_idr)}</td></tr>
    <tr><td>Persentase Serapan Budget</td><td>${payload.financial_summary.budget_realization_percentage}%</td></tr>
  </table>

  <h2>3. Kinerja Dampak Sosial (SROI) & Lingkungan (EROI)</h2>
  <table>
    <tr><th>Indikator Dampak</th><th>Hasil Pengukuran</th></tr>
    <tr><td>Total Penerima Manfaat</td><td>${payload.social_impact.total_beneficiaries} Jiwa (${payload.social_impact.female_percentage}% Perempuan)</td></tr>
    <tr><td>Net Social Value (SROI)</td><td>${formatCurrency(payload.social_impact.social_value_generated_idr)} (Rasio 1 : ${payload.social_impact.sroi_ratio})</td></tr>
    <tr><td>Net Impact Karbon (CO₂e)</td><td>${formatCarbonMass(payload.environmental_impact.net_impact_co2e_kg)} (${payload.environmental_impact.net_impact_co2e_tons} Tons)</td></tr>
    <tr><td>Ekuivalensi Pohon</td><td>${formatTreesEquivalent(payload.environmental_impact.trees_equivalent)}</td></tr>
    <tr><td>Nilai Ekonomi Karbon (EROI)</td><td>${formatCurrency(payload.environmental_impact.monetized_environmental_value_idr)} (Rasio 1 : ${payload.environmental_impact.eroi_ratio})</td></tr>
  </table>

  <p><small>Laporan dikompilasi secara otomatis oleh Impactory Sustainability Intelligence Platform.</small></p>
</body>
</html>`;

  const blob = new Blob(['\ufeff', docxHtml], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
