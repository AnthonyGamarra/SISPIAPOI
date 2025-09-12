import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import * as FileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';

import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  constructor(private toastr: ToastrService) {}

  /**
   * Exporta actividades operacionales a Excel
   * @param activities Lista de actividades a exportar
   * @param groupedActivities Actividades agrupadas por dependencia
   * @param dependencyNames Lista de nombres de dependencias
   * @param fileName Nombre del archivo (opcional)
   * @param formulation Formulación actual para validaciones de trimestre
   */
  exportOperationalActivitiesToExcel(
    activities: OperationalActivity[],
    groupedActivities: { [dependencyName: string]: OperationalActivity[] },
    dependencyNames: string[],
    fileName?: string,
    formulation?: any
  ): void {
    if (!activities?.length) {
      this.toastr.warning('No hay datos para exportar.', 'Advertencia');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      this.addSingleSheetWithAllActivities(workbook, groupedActivities, dependencyNames, formulation);

      const finalFileName = fileName || this.generateFileName('Prestaciones_Economicas_Plantilla');
      
      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadFile(blob, finalFileName);
        this.toastr.success('Plantilla Excel protegida exportada exitosamente.', 'Éxito');
      }).catch((error) => {
        console.error('Error al generar el buffer de Excel:', error);
        this.toastr.error('Error al exportar la plantilla Excel.', 'Error');
      });

    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      this.toastr.error('Error al exportar la plantilla Excel.', 'Error');
    }
  }

  /**
   * Exporta actividades consolidadas a Excel
   * @param consolidatedActivities Lista de actividades consolidadas
   * @param fileName Nombre del archivo (opcional)
   * @param formulation Formulación actual para validaciones de trimestre
   */
  exportConsolidatedActivitiesToExcel(
    consolidatedActivities: any[],
    fileName?: string,
    formulation?: any
  ): void {
    if (!consolidatedActivities?.length) {
      this.toastr.warning('No hay datos consolidados para exportar.', 'Advertencia');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      this.addProtectedConsolidatedSheet(workbook, consolidatedActivities, formulation);
      
      const finalFileName = fileName || this.generateFileName('Prestaciones_Economicas_Consolidado_Plantilla');
      
      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadFile(blob, finalFileName);
        this.toastr.success('Plantilla consolidada protegida exportada exitosamente.', 'Éxito');
      }).catch((error) => {
        console.error('Error al generar el buffer de Excel:', error);
        this.toastr.error('Error al exportar la vista consolidada.', 'Error');
      });

    } catch (error) {
      console.error('Error al exportar vista consolidada a Excel:', error);
      this.toastr.error('Error al exportar la vista consolidada.', 'Error');
    }
  }

  private addSingleSheetWithAllActivities(
    workbook: ExcelJS.Workbook,
    groupedActivities: { [dependencyName: string]: OperationalActivity[] },
    dependencyNames: string[],
    formulation?: any
  ): void {
    const worksheet = workbook.addWorksheet('Plantilla Prestaciones');

    // Agregar título principal
    this.addMainTitle(worksheet, 'PROGRAMACIÓN DE METAS PARA PRESTACIONES ECONÓMICAS');

    const headers = [
      'Dependencia', 'Subsidio', 'Unidad de Medida',
      'Enero Meta', 'Febrero Meta', 'Marzo Meta', 'Abril Meta', 'Mayo Meta', 'Junio Meta',
      'Julio Meta', 'Agosto Meta', 'Septiembre Meta', 'Octubre Meta', 'Noviembre Meta', 'Diciembre Meta',
      'Total Metas',
      'Enero Presup.', 'Febrero Presup.', 'Marzo Presup.', 'Abril Presup.', 'Mayo Presup.', 'Junio Presup.',
      'Julio Presup.', 'Agosto Presup.', 'Septiembre Presup.', 'Octubre Presup.', 'Noviembre Presup.', 'Diciembre Presup.',
      'Total Presupuesto'
    ];
    
    // Agregar headers en la fila 3
    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });

    let currentRow = 4;

    dependencyNames.forEach((dependencyName, depIndex) => {
      const dependencyActivities = groupedActivities[dependencyName];
      if (dependencyActivities && dependencyActivities.length > 0) {
        
        // Agregar separador visual antes de cada dependencia (excepto la primera)
        if (depIndex > 0) {
          currentRow++; // Fila vacía para separación
        }
        
        const startRowForDependency = currentRow;
        
        dependencyActivities.forEach(activity => {
          const rowData = [
            dependencyName,
            activity.name || '',
            activity.measurementUnit || '',
            ...(activity.monthlyGoals?.map(goal => goal.value || 0) || Array(12).fill(0)),
            '',
            ...(activity.monthlyBudgets?.map(budget => budget.value || 0) || Array(12).fill(0)),
            ''
          ];
          
          const row = worksheet.getRow(currentRow);
          rowData.forEach((data, colIndex) => {
            row.getCell(colIndex + 1).value = data;
          });
          
          currentRow++;
        });
        
        // Aplicar marco grueso alrededor del grupo de dependencia
        this.addDependencyGroupBorder(worksheet, startRowForDependency, currentRow - 1, headers.length);
      }
    });

    this.setupSheetStylesAndProtection(worksheet, formulation, 3); // Empezar desde fila 3
    
    // Agregar hoja consolidada
    this.addConsolidatedSheet(workbook, groupedActivities, dependencyNames, formulation);
  }

  /**
   * Aplica estilos y protección a la hoja de actividades usando exceljs.
   * En esta hoja, la columna A está bloqueada, mientras que las columnas D-O y Q-AB son editables.
   * @param worksheet Hoja de trabajo de Excel
   * @param formulation Formulación actual para validaciones de trimestre
   * @param startRow Fila donde empiezan los datos (por defecto 1)
   */
  private setupSheetStylesAndProtection(worksheet: ExcelJS.Worksheet, formulation?: any, startRow: number = 1): void {
    const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7A9CC6' } };
    const editableFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC' } };
    const grayFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6E6E6' } };
    const lockedFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
    const boldFont: Partial<ExcelJS.Font> = { bold: true };
    const blackBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Determinar qué meses están bloqueados basado en quarter y modification
    const getEditableMonths = (): { goals: number[], budgets: number[] } => {
      if (!formulation || !formulation.modification || formulation.modification <= 1) {
        // Si no hay modificación o es la primera versión, todos los meses son editables
        return {
          goals: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // Columnas D-O (metas)
          budgets: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] // Columnas Q-AB (presupuestos)
        };
      }

      const quarter = formulation.quarter || 1;
      const startMonth = (quarter - 1) * 3; // Mes inicial del trimestre actual

      // Desde el trimestre actual en adelante son editables
      const editableGoalColumns: number[] = [];
      const editableBudgetColumns: number[] = [];
      
      for (let i = startMonth; i < 12; i++) { // Desde el mes inicial hasta diciembre
        editableGoalColumns.push(4 + i); // Columnas D-O (4-15)
        editableBudgetColumns.push(17 + i); // Columnas Q-AB (17-28)
      }

      return {
        goals: editableGoalColumns,
        budgets: editableBudgetColumns
      };
    };

    const editableMonths = getEditableMonths();

    // 1. Aplicar estilos, bordes y bloquear todas las celdas por defecto.
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Bloquear todas las celdas por defecto
        cell.protection = { locked: true };
        cell.border = blackBorder;

        // Estilos para el encabezado (fila startRow)
        if (rowNumber === startRow) {
          cell.fill = headerFill;
          cell.font = boldFont;
        }

        // Estilos para las columnas de totales
        if (rowNumber > startRow && (colNumber === 16 || colNumber === 29)) {
          cell.fill = grayFill;
          cell.font = boldFont;
        }
      });

      // Añadir fórmulas para los totales
      if (rowNumber > startRow) {
        row.getCell(16).value = { formula: `SUM(D${rowNumber}:O${rowNumber})` };
        row.getCell(29).value = { formula: `SUM(Q${rowNumber}:AB${rowNumber})` };
      }
    });

    // 2. Desbloquear y aplicar estilos solo a los rangos de edición permitidos por trimestre.
    // Rango 1: Columnas de metas editables según el trimestre
    for (let R = startRow + 1; R <= worksheet.rowCount; R++) {
      // Verificar si es una fila vacía (separador) - primera columna vacía
      const firstCell = worksheet.getCell(R, 1);
      const isEmptyRow = !firstCell.value || firstCell.value === '';
      
      if (!isEmptyRow) {
        // Metas editables
        editableMonths.goals.forEach(colNumber => {
          const cell = worksheet.getCell(R, colNumber);
          cell.protection = { locked: false };
          cell.fill = editableFill;
        });

        // Presupuestos editables
        editableMonths.budgets.forEach(colNumber => {
          const cell = worksheet.getCell(R, colNumber);
          cell.protection = { locked: false };
          cell.fill = editableFill;
        });

        // Aplicar estilo de bloqueado a meses no editables
        for (let C = 4; C <= 15; C++) { // Metas
          if (!editableMonths.goals.includes(C)) {
            const cell = worksheet.getCell(R, C);
            cell.fill = lockedFill;
          }
        }
        
        for (let C = 17; C <= 28; C++) { // Presupuestos
          if (!editableMonths.budgets.includes(C)) {
            const cell = worksheet.getCell(R, C);
            cell.fill = lockedFill;
          }
        }
      } else {
        // Para filas vacías (separadores), aplicar estilo especial y mantener bloqueadas
        for (let C = 1; C <= 29; C++) {
          const cell = worksheet.getCell(R, C);
          cell.protection = { locked: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F8F8' } }; // Gris muy claro
        }
      }
    }

    // 3. Proteger la hoja de cálculo para que los bloqueos surtan efecto.
    worksheet.protect('SisPoi2025#', {
      selectLockedCells: false,
      selectUnlockedCells: true,
      insertRows: true,
      deleteColumns: true,
      formatCells: true,
    });

    // 4. Configurar los anchos de columna.
    this.setColumnWidths(worksheet);
  }

  private addProtectedConsolidatedSheet(workbook: ExcelJS.Workbook, consolidatedActivities: any[], formulation?: any): void {
    const worksheet = workbook.addWorksheet('Plantilla Consolidada');

    // Agregar título principal
    this.addMainTitle(worksheet, 'CONSOLIDADO - PRESTACIONES ECONÓMICAS');

    const headers = [
      'Subsidio', 'Unidad de Medida',
      'Enero Meta', 'Febrero Meta', 'Marzo Meta', 'Abril Meta', 'Mayo Meta', 'Junio Meta',
      'Julio Meta', 'Agosto Meta', 'Septiembre Meta', 'Octubre Meta', 'Noviembre Meta', 'Diciembre Meta',
      'Total Metas',
      'Enero Presup.', 'Febrero Presup.', 'Marzo Presup.', 'Abril Presup.', 'Mayo Presup.', 'Junio Presup.',
      'Julio Presup.', 'Agosto Presup.', 'Septiembre Presup.', 'Octubre Presup.', 'Noviembre Presup.', 'Diciembre Presup.',
      'Total Presupuesto'
    ];

    // Agregar headers en la fila 3
    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });

    let currentRow = 4;

    consolidatedActivities.forEach(consolidatedItem => {
      const rowData = [
        consolidatedItem.name || '',
        consolidatedItem.measurementUnit || '',
        consolidatedItem.activityCount || 0,
        ...(consolidatedItem.consolidatedGoals || Array(12).fill(0)),
        '',
        ...(consolidatedItem.consolidatedBudgets || Array(12).fill(0)),
        ''
      ];
      
      const row = worksheet.getRow(currentRow);
      rowData.forEach((data, colIndex) => {
        row.getCell(colIndex + 1).value = data;
      });
      
      currentRow++;
    });

    this.setupConsolidatedSheetStylesAndProtection(worksheet, formulation, 3);
  }

  /**
   * Aplica estilos y protección a la hoja consolidada usando exceljs.
   * En esta hoja, todas las celdas están bloqueadas.
   * @param worksheet Hoja de trabajo de Excel
   * @param formulation Formulación actual para validaciones de trimestre
   * @param startRow Fila donde empiezan los datos (por defecto 1)
   */
  private setupConsolidatedSheetStylesAndProtection(worksheet: ExcelJS.Worksheet, formulation?: any, startRow: number = 1): void {
    const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7A9CC6' } };
    const grayFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6E6E6' } };
    const boldFont: Partial<ExcelJS.Font> = { bold: true };
    const blackBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Iterar y aplicar estilos y bloqueo a todas las celdas
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Bloquear todas las celdas por defecto
        cell.protection = { locked: true };
        cell.border = blackBorder;

        if (rowNumber === startRow) { // Fila de encabezado
          cell.fill = headerFill;
          cell.font = boldFont;
        } else if (rowNumber > startRow && (colNumber === 15 || colNumber === 28)) { // Columnas de totales
          cell.fill = grayFill;
          cell.font = boldFont;
        }
      });

      // Añadir fórmulas para los totales (las fórmulas funcionarán incluso en celdas bloqueadas)
      if (rowNumber > startRow) {
        row.getCell(15).value = { formula: `SUM(C${rowNumber}:N${rowNumber})` };
        row.getCell(28).value = { formula: `SUM(P${rowNumber}:AA${rowNumber})` };
      }
    });

    // Proteger toda la hoja. Ahora no se permite seleccionar celdas desbloqueadas porque no hay ninguna.
    worksheet.protect('SisPoi2025#', {
      selectLockedCells: true,
      selectUnlockedCells: false,
      insertRows: false,
      deleteColumns: true
    });

    // Configurar los anchos de columna
    const columnWidths = [
      { width: 30 }, { width: 15 }, { width: 12 },
      ...Array(12).fill({ width: 12 }),
      { width: 15 },
      ...Array(12).fill({ width: 12 }),
      { width: 18 }
    ];
    worksheet.columns.forEach((column, index) => {
      if (columnWidths[index]) {
        column.width = columnWidths[index].width;
      }
    });
  }
  
  /**
   * Configura los anchos de columna para la hoja de actividades.
   * @param worksheet Hoja de trabajo de Excel
   */
  private setColumnWidths(worksheet: ExcelJS.Worksheet): void {
    const columnWidths = [
      { width: 25 }, { width: 30 }, { width: 15 },
      ...Array(12).fill({ width: 12 }),
      { width: 15 },
      ...Array(12).fill({ width: 12 }),
      { width: 18 }
    ];
    worksheet.columns.forEach((column, index) => {
      column.width = columnWidths[index].width;
    });
  }
  
  private generateFileName(prefix: string): string {
    const now = new Date();
    return `${prefix}_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;
  }
  
  private downloadFile(blob: Blob, fileName: string): void {
    try {
      FileSaver.saveAs(blob, fileName);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      try {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (fallbackError) {
        console.error('Error en método alternativo de descarga:', fallbackError);
        this.toastr.error('Error al descargar el archivo.', 'Error');
      }
    }
  }

  /**
   * Agrega un título principal al Excel
   * @param worksheet Hoja de trabajo
   * @param title Título a mostrar
   */
  private addMainTitle(worksheet: ExcelJS.Worksheet, title: string): void {
    // Mergear celdas para el título
    worksheet.mergeCells('A1:AC1');
    
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { 
      size: 16, 
      bold: true, 
      color: { argb: 'FFFFFF' } 
    };
    titleCell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: '00529B' } 
    };
    titleCell.alignment = { 
      horizontal: 'center', 
      vertical: 'middle' 
    };
    titleCell.border = {
      top: { style: 'thick', color: { argb: '00529B' } },
      bottom: { style: 'thick', color: { argb: '00529B' } },
      left: { style: 'thick', color: { argb: '00529B' } },
      right: { style: 'thick', color: { argb: '00529B' } }
    };
    
    // Hacer la fila del título más alta
    worksheet.getRow(1).height = 25;
    
    // Dejar una fila vacía
    worksheet.getRow(2).height = 10;
  }

  /**
   * Agrega marco grueso alrededor de un grupo de dependencia
   * @param worksheet Hoja de trabajo
   * @param startRow Fila inicial del grupo
   * @param endRow Fila final del grupo
   * @param columnCount Número de columnas
   */
  private addDependencyGroupBorder(worksheet: ExcelJS.Worksheet, startRow: number, endRow: number, columnCount: number): void {
    const thickBorder = { style: 'thick' as const, color: { argb: '366092' } };
    
    // Borde superior
    for (let col = 1; col <= columnCount; col++) {
      const cell = worksheet.getCell(startRow, col);
      cell.border = {
        ...cell.border,
        top: thickBorder
      };
    }
    
    // Borde inferior
    for (let col = 1; col <= columnCount; col++) {
      const cell = worksheet.getCell(endRow, col);
      cell.border = {
        ...cell.border,
        bottom: thickBorder
      };
    }
    
    // Borde izquierdo
    for (let row = startRow; row <= endRow; row++) {
      const cell = worksheet.getCell(row, 1);
      cell.border = {
        ...cell.border,
        left: thickBorder
      };
    }
    
    // Borde derecho
    for (let row = startRow; row <= endRow; row++) {
      const cell = worksheet.getCell(row, columnCount);
      cell.border = {
        ...cell.border,
        right: thickBorder
      };
    }
  }

  /**
   * Agrega una hoja consolidada al workbook
   * @param workbook Libro de trabajo
   * @param groupedActivities Actividades agrupadas
   * @param dependencyNames Nombres de dependencias
   * @param formulation Formulación actual
   */
  private addConsolidatedSheet(
    workbook: ExcelJS.Workbook, 
    groupedActivities: { [dependencyName: string]: OperationalActivity[] },
    dependencyNames: string[],
    formulation?: any
  ): void {
    const consolidatedSheet = workbook.addWorksheet('Consolidado');
    
    // Agregar título principal
    this.addMainTitle(consolidatedSheet, 'CONSOLIDADO - PRESTACIONES ECONÓMICAS');
    
    const headers = [
      'Subsidio', 'Unidad de Medida',
      'Enero Meta', 'Febrero Meta', 'Marzo Meta', 'Abril Meta', 'Mayo Meta', 'Junio Meta',
      'Julio Meta', 'Agosto Meta', 'Septiembre Meta', 'Octubre Meta', 'Noviembre Meta', 'Diciembre Meta',
      'Total Metas',
      'Enero Presup.', 'Febrero Presup.', 'Marzo Presup.', 'Abril Presup.', 'Mayo Presup.', 'Junio Presup.',
      'Julio Presup.', 'Agosto Presup.', 'Septiembre Presup.', 'Octubre Presup.', 'Noviembre Presup.', 'Diciembre Presup.',
      'Total Presupuesto'
    ];
    
    // Agregar headers en la fila 3
    const headerRow = consolidatedSheet.getRow(3);
    headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });

    let currentRow = 4;

    // Consolidar por nombre de subsidio/actividad
    const subsidyGroups: { [subsidyName: string]: OperationalActivity[] } = {};
    
    // Agrupar todas las actividades por nombre de subsidio
    dependencyNames.forEach(dependencyName => {
      const dependencyActivities = groupedActivities[dependencyName];
      if (dependencyActivities && dependencyActivities.length > 0) {
        dependencyActivities.forEach(activity => {
          const subsidyName = activity.name || 'Sin nombre';
          if (!subsidyGroups[subsidyName]) {
            subsidyGroups[subsidyName] = [];
          }
          subsidyGroups[subsidyName].push(activity);
        });
      }
    });

    // Orden específico de subsidios (asegurando trim y lower)
    const orderedSubsidiesRaw = [
      'Incapacidad Temporal',
      'Maternidad',
      'Lactancia',
      'Sepelio'
    ];
    const orderedSubsidies = orderedSubsidiesRaw.map(s => s.trim().toLowerCase());
    // Subsidios en el orden especificado primero, luego los demás
    const allSubsidies = [
      ...Object.keys(subsidyGroups)
        .filter(name => orderedSubsidies.includes((name || '').trim().toLowerCase()))
        .sort((a, b) => orderedSubsidies.indexOf((a || '').trim().toLowerCase()) - orderedSubsidies.indexOf((b || '').trim().toLowerCase())),
      ...Object.keys(subsidyGroups)
        .filter(name => !orderedSubsidies.includes((name || '').trim().toLowerCase()))
        .sort()
    ];

    // Rango de filas de la hoja detallada
    const detalleStartRow = 4;
    const detalleEndRow = 250;
    allSubsidies.forEach(subsidyName => {
      const subsidyActivities = subsidyGroups[subsidyName];
      const row = consolidatedSheet.getRow(currentRow);
      // Subsidio y unidad de medida
      row.getCell(1).value = subsidyName;
      row.getCell(2).value = subsidyActivities[0]?.measurementUnit || 'Unidad';
      // Metas mensuales con fórmula SUMIF
      for (let m = 0; m < 12; m++) {
        // Columna en hoja consolidado: 3 + m
        // Columna en hoja detallada: 4 + m
        const colConsolidado = 3 + m;
        const colDetallado = 4 + m;
        const colLetterDetallado = String.fromCharCode(65 + colDetallado - 1); // Excel column letter
        row.getCell(colConsolidado).value = {
          formula: `SUMIF('Plantilla Prestaciones'!$B$${detalleStartRow}:$B$${detalleEndRow}, $A${currentRow}, 'Plantilla Prestaciones'!$${colLetterDetallado}$${detalleStartRow}:$${colLetterDetallado}$${detalleEndRow})`
        };
      }
      // Total Metas
      row.getCell(15).value = { formula: `SUM(C${currentRow}:N${currentRow})` };
      // Presupuestos mensuales con fórmula SUMIF (12 meses, aunque fuente solo tenga hasta octubre)
      for (let m = 0; m < 12; m++) {
        const colConsolidado = 16 + m;
        const colDetallado = 17 + m;
        // Obtener la letra de columna Excel (A-Z, AA, AB)
        let colLetterDetallado = '';
        if (colDetallado <= 26) {
          colLetterDetallado = String.fromCharCode(65 + colDetallado - 1);
        } else {
          // Para AA (27) y AB (28)
          colLetterDetallado = 'A' + String.fromCharCode(65 + (colDetallado - 27));
        }
        row.getCell(colConsolidado).value = {
          formula: `SUMIF('Plantilla Prestaciones'!$B$${detalleStartRow}:$B$${detalleEndRow}, $A${currentRow}, 'Plantilla Prestaciones'!$${colLetterDetallado}$${detalleStartRow}:$${colLetterDetallado}$${detalleEndRow})`
        };
      }
      // Total Presupuesto
      row.getCell(28).value = { formula: `SUM(P${currentRow}:AA${currentRow})` };
      currentRow++;
    });

    this.setupConsolidatedSheetStyles(consolidatedSheet, 3); // Empezar desde fila 3
  }

  /**
   * Aplica estilos a la hoja consolidada (solo lectura)
   * @param worksheet Hoja de trabajo
   * @param startRow Fila donde empiezan los datos
   */
  private setupConsolidatedSheetStyles(worksheet: ExcelJS.Worksheet, startRow: number = 1): void {
    const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7A9CC6' } };
    const grayFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6E6E6' } };
    const boldFont: Partial<ExcelJS.Font> = { bold: true };
    const blackBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Iterar y aplicar estilos y bloqueo a todas las celdas
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Bloquear todas las celdas por defecto
        cell.protection = { locked: true };
        cell.border = blackBorder;

        if (rowNumber === startRow) { // Fila de encabezado
          cell.fill = headerFill;
          cell.font = boldFont;
        } else if (rowNumber > startRow && (colNumber === 15 || colNumber === 28)) { // Columnas de totales
          cell.fill = grayFill;
          cell.font = boldFont;
        }
      });

      // Añadir fórmulas para los totales (las fórmulas funcionarán incluso en celdas bloqueadas)
      if (rowNumber > startRow) {
        row.getCell(15).value = { formula: `SUM(C${rowNumber}:N${rowNumber})` };
        row.getCell(28).value = { formula: `SUM(P${rowNumber}:AA${rowNumber})` };
      }
    });

    // Proteger toda la hoja. No se permite editar nada en el consolidado.
    worksheet.protect('SisPoi2025#', {
      selectLockedCells: true,
      selectUnlockedCells: false,
      insertRows: false,
      deleteColumns: false,
      formatCells: false,
    });

    // Configurar los anchos de columna para consolidado
    const columnWidths = [
      { width: 25 }, // Subsidio
      { width: 15 }, // Unidad de Medida  
      ...Array(12).fill({ width: 12 }), // Metas mensuales
      { width: 15 }, // Total Metas
      ...Array(12).fill({ width: 12 }), // Presupuestos mensuales
      { width: 18 }  // Total Presupuesto
    ];
    worksheet.columns.forEach((column, index) => {
      if (columnWidths[index]) {
        column.width = columnWidths[index].width;
      }
    });
  }
}