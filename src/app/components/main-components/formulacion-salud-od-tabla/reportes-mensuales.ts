/**
 * Utilities to export mensual reports (consolidado and detallado) to Excel (HTML-based .xls)
 * Monthly reports derive months by splitting trimestral values into three months each (even distribution).
 */

const COLORS = {
  primary: '#00529B',
  secondary: '#7A9CC6',
  success: '#4CAF50',
  warning: '#E53935',
  primaryLight: '#4A7AC7',
  secondaryLight: '#A9BCD9',
  successLight: '#81C784',
  warningLight: '#EF5350'
};

function buildExcelHeader(dependencyName: string, formulationYear: string | number | null, modification: number | null, title: string) {
  const yearStr = formulationYear ? String(formulationYear) : '';
  const modLabel = modification ? `Modificatoria ${modification}` : 'Formulación Inicial';
  return `
    <tr>
      <td colspan="30" style="font-weight:700;font-size:18px;color:${COLORS.primary};">${dependencyName || ''}</td>
    </tr>
    <tr>
      <td colspan="30" style="font-weight:600;font-size:14px;color:${COLORS.secondary};">${title}</td>
    </tr>
    <tr>
      <td colspan="30" style="font-size:12px;color:#333;">Año: ${yearStr} &nbsp;&nbsp;|&nbsp;&nbsp; ${modLabel}</td>
    </tr>
    <tr><td colspan="30">&nbsp;</td></tr>
  `;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
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
export function exportMensualConsolidadoExcel(consolidatedRows: any[], dependency: { name?: string } | null, formulation: { year?: string | number, modification?: number } | null, filename = 'reporte_mensual_consolidado.xls') {
  const depName = dependency?.name || '';
  const header = buildExcelHeader(depName, formulation?.year || '', formulation?.modification || 1, 'Reporte Mensual - Consolidado');

  const monthsHeader = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

  let rows = '';
  // Header: Familia | Unidad | [Metas Enero..Diciembre] | Total Metas | [Presupuesto Enero..Diciembre] | Total Presupuesto
  rows += '<tr style="background:' + COLORS.secondaryLight + ';font-weight:700;">';
  rows += '<th>Familia</th><th>Unidad</th>';
  // metas headers
  monthsHeader.forEach(m => rows += `<th>${m} Meta</th>`);
  rows += '<th>Total Metas</th>';
  // presupuesto headers
  monthsHeader.forEach(m => rows += `<th>${m} Presupuesto S/.</th>`);
  rows += '<th>Total Presupuesto</th>';
  rows += '</tr>';

  consolidatedRows.forEach(r => {
    // metas months by splitting each trimestre metas into 3 months
    const metasMonths: number[] = [];
    const presupMonths: number[] = [];
    [r.metas?.trimestre1, r.metas?.trimestre2, r.metas?.trimestre3, r.metas?.trimestre4].forEach(t => {
      metasMonths.push(...splitTrimestreToMonths(t || 0));
    });
    [r.presupuesto?.trimestre1, r.presupuesto?.trimestre2, r.presupuesto?.trimestre3, r.presupuesto?.trimestre4].forEach(t => {
      presupMonths.push(...splitTrimestreToMonths(t || 0));
    });

    rows += '<tr>';
    rows += `<td>${r.familia || ''}</td>`;
  // Consolidado shows 'Atenciones' as unidad de medida
  rows += `<td>Atenciones</td>`;
  // metas columns
  monthsHeader.forEach((_, idx) => rows += `<td>${metasMonths[idx] ?? 0}</td>`);
  rows += `<td>${r.metas?.total ?? 0}</td>`;
  // presupuesto columns
  monthsHeader.forEach((_, idx) => rows += `<td>${presupMonths[idx] ?? 0}</td>`);
  rows += `<td>${r.presupuesto?.total ?? 0}</td>`;
    rows += '</tr>';
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <table>
        ${header}
      </table>
      <table border="1" style="border-collapse:collapse;">
        ${rows}
      </table>
    </body>
    </html>
  `;

  downloadFile(filename, html);
}

/**
 * Export mensual detallado. details: same shape as detail rows; we'll compute monthly breakdown per detail.
 */
export function exportMensualDetalladoExcel(details: any[], dependency: { name?: string } | null, formulation: { year?: string | number, modification?: number } | null, filename = 'reporte_mensual_detallado.xls') {
  const depName = dependency?.name || '';
  const header = buildExcelHeader(depName, formulation?.year || '', formulation?.modification || 1, 'Reporte Mensual - Detallado');
  const monthsHeader = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

  let rows = '';
  // Detailed: first metas(12) then total metas then presupuesto(12) then total presupuesto
  rows += '<tr style="background:' + COLORS.secondaryLight + ';font-weight:700;">';
  rows += '<th>Nivel</th><th>Objetivo</th><th>Accion</th><th>Familia</th><th>Unidad</th><th>Centro</th>';
  monthsHeader.forEach(m => rows += `<th>${m} Meta</th>`);
  rows += '<th>Total Metas</th>';
  monthsHeader.forEach(m => rows += `<th>${m} Presupuesto S/.</th>`);
  rows += '<th>Total Presupuesto</th>';
  rows += '</tr>';

  details.forEach(r => {
    const metasMonths: number[] = [];
    const presupMonths: number[] = [];
    [r.metas?.trimestre1, r.metas?.trimestre2, r.metas?.trimestre3, r.metas?.trimestre4].forEach(t => {
      metasMonths.push(...splitTrimestreToMonths(t || 0));
    });
    [r.presupuesto?.trimestre1, r.presupuesto?.trimestre2, r.presupuesto?.trimestre3, r.presupuesto?.trimestre4].forEach(t => {
      presupMonths.push(...splitTrimestreToMonths(t || 0));
    });

    rows += '<tr>';
    rows += `<td>${r.nivelAtencion || ''}</td>`;
    rows += `<td>${r.objetivoEstrategico?.nombre || ''}</td>`;
    rows += `<td>${r.accionEstrategica?.nombre || ''}</td>`;
    rows += `<td>${r.familia || ''}</td>`;
    rows += `<td>${r.unidadMedida || ''}</td>`;
    rows += `<td>${r.desCenSes || ''}</td>`;
  monthsHeader.forEach((_, idx) => rows += `<td>${metasMonths[idx] ?? 0}</td>`);
  rows += `<td>${r.metas?.total ?? 0}</td>`;
  monthsHeader.forEach((_, idx) => rows += `<td>${presupMonths[idx] ?? 0}</td>`);
  rows += `<td>${r.presupuesto?.total ?? 0}</td>`;
    rows += '</tr>';
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <table>
        ${header}
      </table>
      <table border="1" style="border-collapse:collapse;">
        ${rows}
      </table>
    </body>
    </html>
  `;

  downloadFile(filename, html);
}

/**
 * Usage example (in an Angular component):
 *
 * import { exportMensualConsolidadoExcel, exportMensualDetalladoExcel } from './reportes-mensuales';
 *
 * // consolidatedRows: [{ familia, unidadMedida, metas: {trimestre1..4,total}, presupuesto: {trimestre1..4,total} }, ...]
 * // details: detailed rows with fields used in the function (nivelAtencion, objetivoEstrategico, accionEstrategica, familia, unidadMedida, desCenSes, metas, presupuesto)
 *
 * const dependency = { name: 'Nombre Dependencia' };
 * const formulation = { year: 2025, modification: 1 };
 * exportMensualConsolidadoExcel(consolidatedRows, dependency, formulation);
 * exportMensualDetalladoExcel(details, dependency, formulation);
 */
