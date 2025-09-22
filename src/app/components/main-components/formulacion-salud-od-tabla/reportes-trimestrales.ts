/**
 * Utilities to export trimestral reports (consolidado and detallado) to Excel (HTML-based .xls)
 * The functions produce a downloadable file using an HTML table wrapped as an Excel file.
 * They accept data arrays and meta information (dependency, formulation) to build titles.
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
      <td colspan="20" style="font-weight:700;font-size:18px;color:${COLORS.primary};">${dependencyName || ''}</td>
    </tr>
    <tr>
      <td colspan="20" style="font-weight:600;font-size:14px;color:${COLORS.secondary};">${title}</td>
    </tr>
    <tr>
      <td colspan="20" style="font-size:12px;color:#333;">Año: ${yearStr} &nbsp;&nbsp;|&nbsp;&nbsp; ${modLabel}</td>
    </tr>
    <tr><td colspan="20">&nbsp;</td></tr>
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

/**
 * Export a trimestral consolidated report.
 * consolidatedRows: array of { familia, unidadMedida, metas: {trimestre1..4,total}, presupuesto: {trimestre1..4,total} }
 */
export function exportTrimestralConsolidadoExcel(consolidatedRows: any[], dependency: { name?: string } | null, formulation: { year?: string | number, modification?: number } | null, filename = 'reporte_trimestral_consolidado.xls') {
  const depName = dependency?.name || '';
  const header = buildExcelHeader(depName, formulation?.year || '', formulation?.modification || 1, 'Reporte Trimestral - Consolidado');

  let rows = '';
  // Header: Familia | Unidad | [Metas T1..T4] | Total Metas | [Presupuesto T1..T4] | Total Presupuesto
  rows += '<tr style="background:' + COLORS.secondaryLight + ';font-weight:700;">';
  rows += '<th>Familia</th><th>Unidad</th><th>I T</th><th>II T</th><th>III T</th><th>IV T</th><th>Total Metas</th><th>Presupuesto T1</th><th>Presupuesto T2</th><th>Presupuesto T3</th><th>Presupuesto T4</th><th>Total Presupuesto</th>';
  rows += '</tr>';
  rows += '</tr>';

  consolidatedRows.forEach(r => {
    rows += '<tr>';
    rows += `<td>${r.familia || ''}</td>`;
  // For consolidated exports Unidad should be 'Atenciones'
  rows += `<td>Atenciones</td>`;
    rows += `<td>${r.metas?.trimestre1 ?? 0}</td>`;
    rows += `<td>${r.metas?.trimestre2 ?? 0}</td>`;
    rows += `<td>${r.metas?.trimestre3 ?? 0}</td>`;
    rows += `<td>${r.metas?.trimestre4 ?? 0}</td>`;
    rows += `<td>${r.metas?.total ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre1 ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre2 ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre3 ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre4 ?? 0}</td>`;
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
 * Export a trimestral detailed report. details: array of detail rows with properties like nivelAtencion, objetivoEstrategico.nombre, accionEstrategica.nombre, familia, unidadMedida, metas, presupuesto, desCenSes
 */
export function exportTrimestralDetalladoExcel(details: any[], dependency: { name?: string } | null, formulation: { year?: string | number, modification?: number } | null, filename = 'reporte_trimestral_detallado.xls') {
  const depName = dependency?.name || '';
  const header = buildExcelHeader(depName, formulation?.year || '', formulation?.modification || 1, 'Reporte Trimestral - Detallado');

  let rows = '';
  rows += '<tr style="background:' + COLORS.secondaryLight + ';font-weight:700;">';
  rows += '<th>Nivel</th><th>Objetivo Estrat.</th><th>Accion Estrat.</th><th>Familia</th><th>Unidad</th><th>Centro</th><th>I T</th><th>II T</th><th>III T</th><th>IV T</th><th>Total Metas</th><th>Presupuesto T1</th><th>Presupuesto T2</th><th>Presupuesto T3</th><th>Presupuesto T4</th><th>Total Presupuesto</th>';
  rows += '</tr>';

  details.forEach(r => {
    rows += '<tr>';
    rows += `<td>${r.nivelAtencion || ''}</td>`;
    rows += `<td>${r.objetivoEstrategico?.nombre || ''}</td>`;
    rows += `<td>${r.accionEstrategica?.nombre || ''}</td>`;
    rows += `<td>${r.familia || ''}</td>`;
    rows += `<td>${r.unidadMedida || ''}</td>`;
    rows += `<td>${r.desCenSes || ''}</td>`;
    rows += `<td>${r.metas?.trimestre1 ?? 0}</td>`;
    rows += `<td>${r.metas?.trimestre2 ?? 0}</td>`;
    rows += `<td>${r.metas?.trimestre3 ?? 0}</td>`;
    rows += `<td>${r.metas?.trimestre4 ?? 0}</td>`;
    rows += `<td>${r.metas?.total ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre1 ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre2 ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre3 ?? 0}</td>`;
    rows += `<td>${r.presupuesto?.trimestre4 ?? 0}</td>`;
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
 * import { exportTrimestralConsolidadoExcel, exportTrimestralDetalladoExcel } from './reportes-trimestrales';
 *
 * // consolidatedRows: [{ familia, unidadMedida, metas: {trimestre1..4,total}, presupuesto: {trimestre1..4,total} }, ...]
 * // details: detailed rows with fields used in the function (nivelAtencion, objetivoEstrategico, accionEstrategica, familia, unidadMedida, desCenSes, metas, presupuesto)
 *
 * const dependency = { name: 'Nombre Dependencia' };
 * const formulation = { year: 2025, modification: 1 };
 * exportTrimestralConsolidadoExcel(consolidatedRows, dependency, formulation);
 * exportTrimestralDetalladoExcel(details, dependency, formulation);
 */
