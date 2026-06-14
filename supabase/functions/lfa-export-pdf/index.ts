// supabase/functions/lfa-export-pdf/index.ts
// Beautiful, donor-ready landscape A4 PDF generator for Logical Frameworks.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUserAndOrg, adminClient } from '../_shared/auth.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate and get user context
    const { organization_id, supabase } = await getUserAndOrg(req);

    const body = await req.json();
    const { projectId } = body as { projectId?: string };

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch Project row
    const { data: project, error: pErr } = await supabase
      .from('lfa_projects')
      .select('*')
      .eq('id', projectId)
      .eq('org_id', organization_id)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch LFA Entries
    const { data: entries, error: eErr } = await supabase
      .from('lfa_entries')
      .select('*')
      .eq('project_id', projectId)
      .eq('org_id', organization_id)
      .order('sequence', { ascending: true });

    if (eErr) throw eErr;

    const goal = entries?.find((e) => e.level === 'goal') || { description: '', indicator: '', means_of_verification: '', assumption: '' };
    const purpose = entries?.find((e) => e.level === 'purpose') || { description: '', indicator: '', means_of_verification: '', assumption: '' };
    const outputs = entries?.filter((e) => e.level === 'output') || [];
    const activities = entries?.filter((e) => e.level === 'activity') || [];

    // Create pdf-lib document
    const pdfDoc = await PDFDocument.create();
    
    // Landscape A4 size: 841.89 x 595.27 points
    const pageWidth = 841.89;
    const pageHeight = 595.27;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2); // 761.89 pt

    // Load fonts
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add first page
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Helper: Wrap text
    function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
      if (!text) return ['-'];
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    }

    // Draw Title & Metadata
    page.drawText('MATRIKS LOGICAL FRAMEWORK (LFA)', {
      x: margin,
      y: currentY,
      size: 16,
      font: fontHelveticaBold,
      color: rgb(0.12, 0.16, 0.23), // Slate 900
    });
    currentY -= 20;

    page.drawText(`Program: ${project.name}   |   Sektor: ${project.sector || 'Lainnya'}   |   Durasi: ${project.duration_months || 12} Bulan   |   Lokasi: ${project.location || 'Tidak Ditentukan'}`, {
      x: margin,
      y: currentY,
      size: 10,
      font: fontHelvetica,
      color: rgb(0.38, 0.44, 0.54), // Slate 600
    });
    currentY -= 25;

    // Table Column Widths
    const colWidths = {
      narasi: 240,
      indicator: 170,
      mov: 170,
      assumption: 181.89,
    };

    // Draw Table Header
    const tableHeaderY = currentY;
    const headerHeight = 22;
    page.drawRectangle({
      x: margin,
      y: tableHeaderY - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(0.12, 0.16, 0.23), // Slate 900
    });

    const headerCols = [
      { text: 'Narasi Program', x: margin + 8, w: colWidths.narasi },
      { text: 'Indikator Kunci (KPI)', x: margin + colWidths.narasi + 8, w: colWidths.indicator },
      { text: 'Sumber Verifikasi (MoV)', x: margin + colWidths.narasi + colWidths.indicator + 8, w: colWidths.mov },
      { text: 'Asumsi Eksternal', x: margin + colWidths.narasi + colWidths.indicator + colWidths.mov + 8, w: colWidths.assumption },
    ];

    headerCols.forEach((col) => {
      page.drawText(col.text, {
        x: col.x,
        y: tableHeaderY - 15,
        size: 9,
        font: fontHelveticaBold,
        color: rgb(1, 1, 1),
      });
    });

    currentY -= headerHeight;

    // Helper: Draw Row
    function drawRow(
      title: string,
      narasiText: string,
      indicatorText: string,
      movText: string,
      assumptionText: string,
      titleBgColor: [number, number, number],
      textColor: [number, number, number] = [0.12, 0.16, 0.23]
    ) {
      // 1. Text wrapping for all columns
      const fontSize = 8;
      const padding = 8;
      const innerW = {
        narasi: colWidths.narasi - (padding * 2),
        indicator: colWidths.indicator - (padding * 2),
        mov: colWidths.mov - (padding * 2),
        assumption: colWidths.assumption - (padding * 2),
      };

      const wrappedNarasi = wrapText(narasiText, innerW.narasi, fontSize, fontHelvetica);
      const wrappedIndicator = wrapText(indicatorText, innerW.indicator, fontSize, fontHelvetica);
      const wrappedMov = wrapText(movText, innerW.mov, fontSize, fontHelvetica);
      const wrappedAssumption = wrapText(assumptionText, innerW.assumption, fontSize, fontHelvetica);

      // Height of row is determined by max lines of all columns
      const maxLines = Math.max(
        wrappedNarasi.length + (title ? 1.5 : 0), // account for row category title space
        wrappedIndicator.length,
        wrappedMov.length,
        wrappedAssumption.length
      );

      const rowHeight = (maxLines * 12) + (padding * 2);

      // Check if page overflow
      if (currentY - rowHeight < margin) {
        // Add new page
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - 20;

        // Re-draw small header on new page
        page.drawRectangle({
          x: margin,
          y: currentY - headerHeight,
          width: contentWidth,
          height: headerHeight,
          color: rgb(0.12, 0.16, 0.23),
        });
        headerCols.forEach((col) => {
          page.drawText(col.text, {
            x: col.x,
            y: currentY - 15,
            size: 9,
            font: fontHelveticaBold,
            color: rgb(1, 1, 1),
          });
        });
        currentY -= headerHeight;
      }

      // Draw background / borders
      page.drawRectangle({
        x: margin,
        y: currentY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.99), // light off-white
      });

      // Draw vertical column separators and boundaries
      let currentX = margin;
      
      // Category / Level tag background block
      if (title) {
        page.drawRectangle({
          x: margin,
          y: currentY - (title ? 18 : rowHeight),
          width: colWidths.narasi,
          height: 18,
          color: rgb(titleBgColor[0], titleBgColor[1], titleBgColor[2]),
        });
        // Category Label
        page.drawText(title, {
          x: margin + padding,
          y: currentY - 13,
          size: 8,
          font: fontHelveticaBold,
          color: rgb(1, 1, 1),
        });
      }

      // Draw lines / columns
      const cols = [colWidths.narasi, colWidths.indicator, colWidths.mov, colWidths.assumption];
      cols.forEach((width) => {
        page.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: width,
          height: rowHeight,
          borderColor: rgb(0.88, 0.9, 0.92),
          borderWidth: 0.5,
        });
        currentX += width;
      });

      // Draw cell text
      let textY = currentY - padding - 8;

      // Column 1 (Narasi)
      const startNarasiIdx = title ? 1.5 : 0;
      wrappedNarasi.forEach((line, idx) => {
        page.drawText(line, {
          x: margin + padding,
          y: textY - ((idx + startNarasiIdx) * 11),
          size: fontSize,
          font: fontHelvetica,
          color: rgb(textColor[0], textColor[1], textColor[2]),
        });
      });

      // Column 2 (Indicator)
      wrappedIndicator.forEach((line, idx) => {
        page.drawText(line, {
          x: margin + colWidths.narasi + padding,
          y: textY - (idx * 11),
          size: fontSize,
          font: fontHelvetica,
          color: rgb(textColor[0], textColor[1], textColor[2]),
        });
      });

      // Column 3 (MoV)
      wrappedMov.forEach((line, idx) => {
        page.drawText(line, {
          x: margin + colWidths.narasi + colWidths.indicator + padding,
          y: textY - (idx * 11),
          size: fontSize,
          font: fontHelvetica,
          color: rgb(textColor[0], textColor[1], textColor[2]),
        });
      });

      // Column 4 (Assumption)
      wrappedAssumption.forEach((line, idx) => {
        page.drawText(line, {
          x: margin + colWidths.narasi + colWidths.indicator + colWidths.mov + padding,
          y: textY - (idx * 11),
          size: fontSize,
          font: fontHelvetica,
          color: rgb(textColor[0], textColor[1], textColor[2]),
        });
      });

      currentY -= rowHeight;
    }

    // DRAW GOAL
    drawRow(
      'DAMPAK (Goal)',
      goal.description || '',
      goal.indicator || '',
      goal.means_of_verification || '',
      goal.assumption || '',
      [0.12, 0.16, 0.23] // Slate/Navy bg
    );

    // DRAW PURPOSE
    drawRow(
      'TUJUAN (Outcome/Purpose)',
      purpose.description || '',
      purpose.indicator || '',
      purpose.means_of_verification || '',
      purpose.assumption || '',
      [0.06, 0.46, 0.43] // Teal bg
    );

    // DRAW OUTPUTS
    outputs.forEach((out, outIdx) => {
      drawRow(
        `HASIL H${outIdx + 1}`,
        out.description || '',
        out.indicator || '',
        out.means_of_verification || '',
        out.assumption || '',
        [0.85, 0.47, 0.02] // Amber bg
      );

      // DRAW ACTIVITIES NESTED UNDER THIS OUTPUT
      const relatedActs = activities.filter((act) => act.parent_id === out.id);
      relatedActs.forEach((act, actIdx) => {
        const activityTitle = `KEGIATAN ${outIdx + 1}.${actIdx + 1}`;
        const durationText = act.timeline_start && act.timeline_end 
          ? ` (Timeline: Bulan ${act.timeline_start} - Bulan ${act.timeline_end})` 
          : '';
        const picText = act.responsible_party ? ` [PIC: ${act.responsible_party}]` : '';

        drawRow(
          '',
          `${activityTitle}: ${act.description}${durationText}${picText}`,
          act.indicator || '-',
          act.means_of_verification || '-',
          act.assumption || '-',
          [0.38, 0.44, 0.54], // Slate grey tag
          [0.38, 0.44, 0.54] // Grayish text for activities
        );
      });
    });

    // Save PDF file bytes
    const pdfBytes = await pdfDoc.save();

    // 4. Upload generated PDF to Supabase Storage (lfa-exports bucket)
    const adminSupa = adminClient();
    const fileName = `lfa_project_${projectId}_export_${Date.now()}.pdf`;
    const filePath = `${organization_id}/${fileName}`;

    // Upload to bucket
    const { error: uploadErr } = await adminSupa.storage
      .from('lfa-exports')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      // Bucket might not exist, create it and retry
      await adminSupa.storage.createBucket('lfa-exports', { public: true });
      const { error: retryErr } = await adminSupa.storage
        .from('lfa-exports')
        .upload(filePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (retryErr) throw retryErr;
    }

    // Get public URL
    const { data: publicUrlData } = adminSupa.storage
      .from('lfa-exports')
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({ pdfUrl: publicUrlData.publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
