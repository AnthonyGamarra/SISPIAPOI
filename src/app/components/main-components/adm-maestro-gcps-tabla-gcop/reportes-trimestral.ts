import ExcelJS from 'exceljs';

// helper to convert 1-based column index to Excel letter (e.g., 1 -> A, 27 -> AA)
function colLetter(n: number) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function getModificationLabel(modification: number): string {
    switch (modification) {
        case 1:
            return 'Formulación inicial';
        case 2:
            return 'Primera modificatoria';
        case 3:
            return 'Segunda modificatoria';
        case 4:
            return 'Tercera modificatoria';
        default:
            return `${modification - 1}ª modificatoria`;
    }
}

async function downloadExcelJSFile(filename: string, sheetData: any[], sheetName: string = 'Reporte', options?: {
  title?: string,
  dependency?: string,
  year?: string | number,
  modLabel?: string,
  headerColor?: string,
  subtitleColor?: string
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  let rowIdx = 1;
  // Título principal (combinado y color)
  if (options?.dependency) {
    worksheet.mergeCells(rowIdx, 1, rowIdx, sheetData[3]?.length || 30);
    const cell = worksheet.getCell(rowIdx, 1);
    cell.value = options.dependency;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ff00529b' }
    };
    cell.font = { size: 18, bold: true, color: { argb: 'ffffffff' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    rowIdx++;
  }
  // Subtítulo (combinado y color)
  if (options?.title) {
    worksheet.mergeCells(rowIdx, 1, rowIdx, sheetData[3]?.length || 30);
    const cell = worksheet.getCell(rowIdx, 1);
    cell.value = options.title;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFA9BCD9' }
    };
    cell.font = { size: 15, bold: true, color: { argb: 'ff000000' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    rowIdx++;
  }
  // Año y modificatoria (combinado)
  if (options?.year || options?.modLabel) {
    worksheet.mergeCells(rowIdx, 1, rowIdx, sheetData[3]?.length || 30);
    const cell = worksheet.getCell(rowIdx, 1);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFA9BCD9' }
    };
    cell.value = `Año: ${options.year ?? ''}   |   Etapa: ${options.modLabel ?? ''}`;
    cell.font = { size: 15, bold: true, color: { argb: 'ff000000' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    rowIdx++;
  }
  // // Espacio vacío
  // worksheet.mergeCells(rowIdx, 1, rowIdx, sheetData[3]?.length || 30);
  // rowIdx++;

  // Encabezado de tabla con color de fondo
  const headerRow = worksheet.addRow(sheetData[3]);
  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFA9BCD9' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Agregar los datos
  for (let i = 4; i < sheetData.length; i++) {
    worksheet.addRow(sheetData[i]);
  }

  // Asignar anchos personalizados
  // Familia, Unidad de medida, 12 meses metas, Total Metas, 12 meses presupuesto, Total Presupuesto
  worksheet.columns = [
    { width: 30 }, // Familia
    { width: 16.5 }, // Unidad de medida
    ...Array(12).fill({ width: 11.5 }), // Metas meses
    { width: 14 }, // Total Metas
    ...Array(12).fill({ width: 18.5 }), // Presupuesto meses
    { width: 19 } // Total Presupuesto
  ];

  // Aplicar cuadrícula negra en todo el rango de la tabla (A:AB, todas las filas con datos)
  // Determinar el rango: desde la primera fila (1) hasta la última con datos (worksheet.rowCount), columnas 1 (A) a 28 (AB)
  for (let r = 1; r <= worksheet.rowCount; r++) {
    for (let c = 1; c <= 28; c++) {
      const cell = worksheet.getRow(r).getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      // Formato numérico solo para columnas de presupuesto (P:AB = 16:28)
      if (c >= 16 && c <= 28 && r > rowIdx + 1) {
        cell.numFmt = '#,##0.00';
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
}


function splitTrimestreToMonths(value: number) {
    const v = Number(value) || 0;
    const m = Math.floor(v / 3);
    const remainder = v - m * 3;
    // distribute remainder to first months
    const months = [m, m, m];
    for (let i = 0; i < remainder; i++) months[i] = months[i] + 1;
    return months;
}

/**
 * Export mensual consolidated. Input consolidatedRows with metas and presupuesto per trimestre.
 */
export async function exportTrimestralConsolidadoExcel(consolidatedRows: any[], dependency: { name?: string } | null, formulation: { year?: string | number, modification?: number } | null, filename = 'reporte_trimestral_consolidado.xlsx') {
  // Mostrar solo el name de la dependencia si existe (no el id)
  let depName = '';
  if (dependency && typeof dependency === 'object') {
    if ('name' in dependency) depName = String(dependency.name ?? '');
    else if ('dependency' in dependency && dependency.dependency && typeof dependency.dependency === 'object' && 'name' in dependency.dependency) depName = String((dependency.dependency as any).name ?? '');
  }
  const trimestreHeader = ['T1', 'T2', 'T3', 'T4'];
  const headerRow = ['Familia', 'Unidad de medida', ...trimestreHeader.map(t => t + ' Meta'), 'Total Metas', ...trimestreHeader.map(t => t + ' Presupuesto S/.'), 'Total Presupuesto'];

  // Build workbook with one sheet per Nivel (I, II, III) when data exists
  // helper to convert 1-based column index to Excel letter (e.g., 1 -> A, 27 -> AA)
  function colLetter(n: number) {
    let s = '';
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  const workbook = new ExcelJS.Workbook();

  // Helper to detect level from detalles array (case-insensitive). Returns 'I'|'II'|'III' or null
  function detectLevelFromDetalles(detalles: any[]): string | null {
    if (!detalles || !Array.isArray(detalles)) return null;
    for (const d of detalles) {
      const text = String(d?.nivelAtencion || '').toLowerCase();
      if (!text) continue;
      // try to find explicit 'nivel i', 'nivel ii', 'nivel iii'
      if (text.includes('nivel i') || text === 'i' || text.match(/\b(i)\b/)) return 'I';
      if (text.includes('nivel ii') || text === 'ii' || text.match(/\b(ii)\b/)) return 'II';
      if (text.includes('nivel iii') || text === 'iii' || text.match(/\b(iii)\b/)) return 'III';
    }
    return null;
  }

  // Group consolidated rows by level
  const groups: { [key: string]: any[] } = { I: [], II: [], III: [] };
  consolidatedRows.forEach(r => {
    const lvl = detectLevelFromDetalles(r.detalles) || null;
    if (lvl && groups[lvl]) groups[lvl].push(r);
  });

  // If no grouping detected (rows may already be all for a single level without detalles),
  // try a fallback: if consolidatedRows came from a single source (component passes per-level arrays),
  // we can infer by checking first detalle or by checking original rows inside detalles.
  if (groups['I'].length === 0 && groups['II'].length === 0 && groups['III'].length === 0 && consolidatedRows.length > 0) {
    // attempt to detect from each row's detalles first item
    for (const r of consolidatedRows) {
      const first = (r.detalles || [])[0];
      const text = String(first?.nivelAtencion || '').toLowerCase();
  if (text.includes('nivel i') || text === 'i' || text.match(/\b(i)\b/)) groups['I'].push(r);
  else if (text.includes('nivel ii') || text === 'ii' || text.match(/\b(ii)\b/)) groups['II'].push(r);
  else if (text.includes('nivel iii') || text === 'iii' || text.match(/\b(iii)\b/)) groups['III'].push(r);
    }
    // As a last resort, if still empty, place all rows in a single "I" sheet so we export something
    if (groups['I'].length === 0 && groups['II'].length === 0 && groups['III'].length === 0) {
      groups['I'] = consolidatedRows.slice();
    }
  }


  // For each level that has data, create a worksheet
  for (const lvlKey of ['I', 'II', 'III']) {
    const rowsForLevel = groups[lvlKey];
    if (!rowsForLevel || rowsForLevel.length === 0) continue; // only create sheet if data exists

  const sheetName = uniqueSheetName(workbook, `Consolidado Trim. - Nivel ${lvlKey}`);
  const worksheet = workbook.addWorksheet(sheetName);

    let rowIdx = 1;
    // Title and subtitles
    if (depName) {
      worksheet.mergeCells(rowIdx, 1, rowIdx, headerRow.length || 30);
      const cell = worksheet.getCell(rowIdx, 1);
      cell.value = depName;
      cell.fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff00529b' }
      };
      cell.font = { size: 18, bold: true, color: { argb: 'ffffffff' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      rowIdx++;
    }
    if (formulation?.year || formulation?.modification) {
      worksheet.mergeCells(rowIdx, 1, rowIdx, headerRow.length || 30);
      const cell = worksheet.getCell(rowIdx, 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9BCD9' } };
      cell.value = `Año: ${formulation?.year ?? ''}   |   Etapa: ${getModificationLabel(formulation?.modification ?? 1)}`;
      cell.font = { size: 15, bold: true, color: { argb: 'ff000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      rowIdx++;
    }
    // Empty row
    // worksheet.mergeCells(rowIdx, 1, rowIdx, headerRow.length || 30);
    // rowIdx++;

    // Header
    const header = worksheet.addRow(headerRow);
    header.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9BCD9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Add data rows
    rowsForLevel.forEach(r => {
      // For trimestral export we use trimestre values directly
      const metasTrimestral = [r.metas?.trimestre1 || 0, r.metas?.trimestre2 || 0, r.metas?.trimestre3 || 0, r.metas?.trimestre4 || 0];
      const presupTrimestral = [r.presupuesto?.trimestre1 || 0, r.presupuesto?.trimestre2 || 0, r.presupuesto?.trimestre3 || 0, r.presupuesto?.trimestre4 || 0];
      worksheet.addRow([
        r.familia || '',
        'Atenciones',
        ...metasTrimestral,
        r.metas?.total ?? metasTrimestral.reduce((s:number,n:number)=>s+n,0),
        ...presupTrimestral,
        r.presupuesto?.total ?? presupTrimestral.reduce((s:number,n:number)=>s+n,0)
      ]);
    });

    // Column widths similar to previous implementation
    worksheet.columns = [
      { width: 30 }, // Familia
      { width: 16.5 }, // Unidad de medida
      ...Array(4).fill({ width: 14 }), // Metas trimestres
      { width: 14 }, // Total Metas
      ...Array(4).fill({ width: 18.5 }), // Presupuesto trimestres
      { width: 19 } // Total Presupuesto
    ];

    // Apply borders and numeric formats
    // Apply borders and numeric formats for new column layout
    const totalCols = 2 + 4 + 1 + 4 + 1; // familia + unidad + 4 metas + total + 4 presup + total
    for (let r = 1; r <= worksheet.rowCount; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = worksheet.getRow(r).getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        // presupuesto columns: after (2+4+1) => start at colIndex = 8 to 11 (4 cols) and final total
        if (c >= (2 + 4 + 1) + 1 && c <= (2 + 4 + 1) + 4 && r > rowIdx + 1) {
          cell.numFmt = '#,##0.00';
        }
      }
    }
  }

  // If workbook has no sheets (no data), still create a minimal sheet
  if (workbook.worksheets.length === 0) {
    const worksheet = workbook.addWorksheet(uniqueSheetName(workbook, 'Consolidado Trim.'));
    worksheet.addRow([depName]);
    worksheet.addRow(['Año:', formulation?.year || '', 'Modificatoria:', getModificationLabel(formulation?.modification ?? 1)]);
    worksheet.addRow([]);
    worksheet.addRow(headerRow);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
}

/**
 * Export mensual detallado. details: same shape as detail rows; we'll compute monthly breakdown per detail.
 */
export async function exportTrimestralDetalladoExcel(details: any[], dependency: { name?: string } | null, formulation: { year?: string | number, modification?: number } | null, filename = 'reporte_trimestral_detallado.xlsx') {
  // Mostrar solo el name de la dependencia si existe (no el id)
  let depName = '';
  if (dependency && typeof dependency === 'object') {
    if ('name' in dependency) depName = String(dependency.name ?? '');
    else if ('dependency' in dependency && dependency.dependency && typeof dependency.dependency === 'object' && 'name' in dependency.dependency) depName = String((dependency.dependency as any).name ?? '');
  }
  
  const groups: { [key: string]: any[] } = { I: [], II: [], III: [] };
  function detectLevel(text: string): string | null {
    if (!text) return null;
    const t = String(text).toLowerCase();
    if (t.includes('nivel i') || t === 'i' || t.match(/\b(i)\b/)) return 'I';
    if (t.includes('nivel ii') || t === 'ii' || t.match(/\b(ii)\b/)) return 'II';
    if (t.includes('nivel iii') || t === 'iii' || t.match(/\b(iii)\b/)) return 'III';
    return null;
  }
  details.forEach(d => {
    const lvl = detectLevel(d?.nivelAtencion || '') || null;
    if (lvl) groups[lvl].push(d);
  });

  // Fallback: if none detected, place all in I
  if (groups['I'].length === 0 && groups['II'].length === 0 && groups['III'].length === 0) {
    groups['I'] = details.slice();
  }

  const trimestreHeader = ['T1', 'T2', 'T3', 'T4'];
  // NOTE: removed Nivel, Objetivo, Accion columns as requested
  // Added 'Nombre de actividad' after 'Familia'
  const headerRow = ['Familia', 'Nombre de actividad', 'Unidad de medida', 'Centro', ...trimestreHeader.map(t => t + ' Meta'), 'Total Metas', ...trimestreHeader.map(t => t + ' Presupuesto S/.'), 'Total Presupuesto'];

  const workbook = new ExcelJS.Workbook();

  for (const lvlKey of ['I', 'II', 'III']) {
    const rows = groups[lvlKey];
    if (!rows || rows.length === 0) continue;
  const sheetName = uniqueSheetName(workbook, `Detallado Trimestral - Nivel ${lvlKey}`);
  const worksheet = workbook.addWorksheet(sheetName);

    let rowIdx = 1;
    if (depName) {
      worksheet.mergeCells(rowIdx, 1, rowIdx, headerRow.length || 30);
      const cell = worksheet.getCell(rowIdx, 1);
      cell.value = depName;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff00529b' } };
      cell.font = { size: 18, bold: true, color: { argb: 'ffffffff' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      rowIdx++;
    }
    if (formulation?.year || formulation?.modification) {
      worksheet.mergeCells(rowIdx, 1, rowIdx, headerRow.length || 30);
      const cell = worksheet.getCell(rowIdx, 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9BCD9' } };
      cell.value = `Año: ${formulation?.year ?? ''}   |   Etapa: ${getModificationLabel(formulation?.modification ?? 1)}`;
      cell.font = { size: 15, bold: true, color: { argb: 'ff000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      rowIdx++;
    }

    const header = worksheet.addRow(headerRow);
    header.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9BCD9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Group rows by familia and add a summary row followed by detail rows (collapsible)
    const familias = Array.from(new Set(rows.map((x: any) => x.familia || '')));
    for (const fam of familias) {
      const familyRows = rows.filter((x: any) => (x.familia || '') === fam);
      // compute numeric sums to use as fallback result for formulas (4 trimesters)
      const metasSum = Array(4).fill(0);
      const presupSum = Array(4).fill(0);
      familyRows.forEach((r: any) => {
        // use trimestre values directly for summaries
        const mVals = [r.metas?.trimestre1 || 0, r.metas?.trimestre2 || 0, r.metas?.trimestre3 || 0, r.metas?.trimestre4 || 0];
        const pVals = [r.presupuesto?.trimestre1 || 0, r.presupuesto?.trimestre2 || 0, r.presupuesto?.trimestre3 || 0, r.presupuesto?.trimestre4 || 0];
        for (let i = 0; i < 4; i++) {
          metasSum[i] += (mVals[i] || 0);
          presupSum[i] += (pVals[i] || 0);
        }
      });

      // Insert summary row first (as requested). We'll fill formulas after adding detail rows.
      const emptyValues: any[] = [];
      // build placeholder row matching header length (30 columns)
      const totalCols = 2 + 1 + 1 + 4 + 1 + 4 + 1; // familia, nombre, unidad, centro, 4 metas, total metas, 4 presup, total presup
      for (let i = 1; i <= totalCols; i++) {
        if (i >= 5) emptyValues.push(0);
        else emptyValues.push('');
      }
      const summaryRow = worksheet.addRow([fam || '', '', 'Atenciones', '', ...emptyValues.slice(4)]);
      summaryRow.font = { bold: true };
      summaryRow.eachCell && summaryRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
      });

      const summaryRowIndex = summaryRow.number;

      // Add detail rows — use 4 trimestre values instead of monthly breakdown
      for (const r of familyRows) {
        const metasT = [r.metas?.trimestre1 || 0, r.metas?.trimestre2 || 0, r.metas?.trimestre3 || 0, r.metas?.trimestre4 || 0];
        const presupT = [r.presupuesto?.trimestre1 || 0, r.presupuesto?.trimestre2 || 0, r.presupuesto?.trimestre3 || 0, r.presupuesto?.trimestre4 || 0];
        const detailRow = worksheet.addRow([
          r.familia || '',
          r.accionEstrategica?.nombre || '',
          r.unidadMedida || '',
          r.desCenSes || '',
          ...metasT,
          r.metas?.total ?? metasT.reduce((s:number,n:number)=>s+n,0),
          ...presupT,
          r.presupuesto?.total ?? presupT.reduce((s:number,n:number)=>s+n,0)
        ]);
        (detailRow as any).outlineLevel = 1;
      }

      // After adding detail rows, set formulas in the summary row to sum the detail rows below
      const firstDetailRow = summaryRowIndex + 1;
      const lastDetailRow = summaryRowIndex + familyRows.length;
      // metas trimestres columns: 5..8
      for (let i = 0; i < 4; i++) {
        const col = 5 + i;
        const colL = colLetter(col);
        const cell = summaryRow.getCell(col);
        const formula = `SUM(${colL}${firstDetailRow}:${colL}${lastDetailRow})`;
        cell.value = { formula, result: metasSum[i] };
      }
      // total metas column (after metas) -> col 9
      const colTotalMetas = 5 + 4;
      summaryRow.getCell(colTotalMetas).value = { formula: `SUM(${colLetter(colTotalMetas)}${firstDetailRow}:${colLetter(colTotalMetas)}${lastDetailRow})`, result: metasSum.reduce((s: number, n: number) => s + n, 0) };
      // presupuesto trimestres columns: after total metas -> cols 10..13
      for (let i = 0; i < 4; i++) {
        const col = colTotalMetas + 1 + i;
        const colL = colLetter(col);
        const cell = summaryRow.getCell(col);
        cell.value = { formula: `SUM(${colL}${firstDetailRow}:${colL}${lastDetailRow})`, result: presupSum[i] };
        cell.numFmt = '#,##0.00';
      }
      // total presupuesto column -> last column
      const colTotalPresup = colTotalMetas + 1 + 4;
      summaryRow.getCell(colTotalPresup).value = { formula: `SUM(${colLetter(colTotalPresup)}${firstDetailRow}:${colLetter(colTotalPresup)}${lastDetailRow})`, result: presupSum.reduce((s: number, n: number) => s + n, 0) };
      summaryRow.getCell(colTotalPresup).numFmt = '#,##0.00';
    }

    worksheet.columns = [
      { width: 35 }, // Familia
      { width: 40 }, // Nombre de actividad
      { width: 35 }, // Unidad de medida
      { width: 27 }, // Centro
      ...Array(4).fill({ width: 11.5 }), // metas trimestrales
      { width: 14 }, // total metas
      ...Array(4).fill({ width: 18.5 }), // presupuesto trimestral
      { width: 19 } // total presupuesto
    ];
    const totalColsGlobal = 14; // 4 fixed + 4 metas + 1 total metas + 4 presup + 1 total presup
    for (let r = 1; r <= worksheet.rowCount; r++) {
      for (let c = 1; c <= totalColsGlobal; c++) {
        const cell = worksheet.getRow(r).getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        // presupuesto columns: 10..14 (including total presupuesto)
        if (c >= 10 && c <= 14 && r > rowIdx + 1) {
          cell.numFmt = '#,##0.00';
        }
      }
    }
  }

  // If no sheets created, create minimal
  if (workbook.worksheets.length === 0) {
    const worksheet = workbook.addWorksheet(uniqueSheetName(workbook, 'Detallado Trimestral'));
    worksheet.addRow([depName]);
    worksheet.addRow(['Año:', formulation?.year || '', 'Modificatoria:', getModificationLabel(formulation?.modification ?? 1)]);
    worksheet.addRow([]);
    worksheet.addRow(headerRow);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
}

// Ensure a worksheet name is unique within a workbook by appending suffixes if needed
function uniqueSheetName(workbook: any, base: string) {
  let name = base || 'Sheet';
  let i = 1;
  while (workbook.getWorksheet(name)) {
    i++;
    name = `${base} (${i})`;
  }
  return name;
}