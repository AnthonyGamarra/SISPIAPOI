import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import * as FileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';

import { OperationalActivity } from '../../../models/logic/operationalActivity.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  constructor(private toastr: ToastrService) {}

  /**
   * Obtiene la unidad operativa padre (activityFamily sin parentActivityFamily)
   * @param activity Actividad operacional
   * @returns Nombre de la unidad operativa padre
   */
  private getMainOperativeUnit(activity: OperationalActivity): string {
    if (!activity.activityFamily) {
      return 'Sin familia';
    }
    
    // Si tiene parentActivityFamily, usar el padre
    if (activity.activityFamily.parentActivityFamily) {
      return activity.activityFamily.parentActivityFamily.name || 'Sin familia padre';
    }
    
    // Si no tiene padre, es la unidad principal
    return activity.activityFamily.name || 'Sin familia';
  }

  /**
   * Obtiene la sub unidad operativa (nombre del activityFamily hijo si tiene parentActivityFamily)
   * @param activity Actividad operacional
   * @returns Nombre de la sub unidad operativa o vacío si no aplica
   */
  private getSubOperativeUnit(activity: OperationalActivity): string {
    if (!activity.activityFamily) {
      return '';
    }
    
    // Si tiene parentActivityFamily, retornar el nombre del hijo (activityFamily actual)
    if (activity.activityFamily.parentActivityFamily) {
      return activity.activityFamily.name || '';
    }
    
    // Si no tiene padre, no hay sub unidad
    return '';
  }

  /**
   * Obtiene la unidad operativa padre para items consolidados
   * @param consolidatedItem Item consolidado que puede tener información de activityFamily
   * @returns Nombre de la unidad operativa padre
   */
  private getMainOperativeUnitFromConsolidated(consolidatedItem: any): string {
    if (!consolidatedItem.activityFamily) {
      return 'Sin familia';
    }
    
    // Si tiene parentActivityFamily, usar el padre
    if (consolidatedItem.activityFamily.parentActivityFamily) {
      return consolidatedItem.activityFamily.parentActivityFamily.name || 'Sin familia padre';
    }
    
    // Si no tiene padre, es la unidad principal
    return consolidatedItem.activityFamily.name || 'Sin familia';
  }

  /**
   * Obtiene la sub unidad operativa para items consolidados
   * @param consolidatedItem Item consolidado que puede tener información de activityFamily
   * @returns Nombre de la sub unidad operativa o vacío si no aplica
   */
  private getSubOperativeUnitFromConsolidated(consolidatedItem: any): string {
    if (!consolidatedItem.activityFamily) {
      return '';
    }
    
    // Si tiene parentActivityFamily, retornar el nombre del hijo (activityFamily actual)
    if (consolidatedItem.activityFamily.parentActivityFamily) {
      return consolidatedItem.activityFamily.name || '';
    }
    
    // Si no tiene padre, no hay sub unidad
    return '';
  }

  /**
   * Exporta actividades operacionales a Excel para prestaciones sociales
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
  orderedActivityDetailNames: string[],
  orderedActivityDetailMU: string[],
    fileName?: string,
    formulation?: any
  ): void {
    if (!activities?.length) {
      this.toastr.warning('No hay datos para exportar.', 'Advertencia');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
  this.addSingleSheetWithAllActivities(workbook, groupedActivities, dependencyNames, orderedActivityDetailNames, orderedActivityDetailMU, formulation);

      const finalFileName = fileName || this.generateFileName('Prestaciones_Sociales_Plantilla');
      
      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadFile(blob, finalFileName);
        this.toastr.success('Plantilla Excel de prestaciones sociales exportada exitosamente.', 'Éxito');
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
      
      const finalFileName = fileName || this.generateFileName('Prestaciones_Sociales_Consolidado_Plantilla');
      
      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadFile(blob, finalFileName);
        this.toastr.success('Plantilla consolidada de prestaciones sociales exportada exitosamente.', 'Éxito');
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
    orderedActivityDetailNames: string[],
    orderedActivityDetailMU: string[],
    formulation?: any
  ): void {
    const worksheet = workbook.addWorksheet('Plantilla Prestaciones Sociales');

    // Agregar título principal
    this.addMainTitle(worksheet, 'PROGRAMACIÓN DE METAS PARA PRESTACIONES SOCIALES');

    const headers = [
      'Dependencia', 'Unidad operativa', 'Sub Unidad Operativa', 'Actividades Priorizadas de Gestión', 'Unidad de Medida',
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
      let dependencyActivities = groupedActivities[dependencyName];
      if (dependencyActivities && dependencyActivities.length > 0) {
            dependencyActivities = [...dependencyActivities].sort((a, b) => {
              // Primer criterio: Unidad operativa
              const unitA = this.getMainOperativeUnit(a) || '';
              const unitB = this.getMainOperativeUnit(b) || '';
              if (unitA !== unitB) {
                return unitA.localeCompare(unitB);
              }

              // Segundo criterio: Sub unidad operativa
              const subUnitA = this.getSubOperativeUnit(a) || '';
              const subUnitB = this.getSubOperativeUnit(b) || '';
              if (subUnitA !== subUnitB) {
                return subUnitA.localeCompare(subUnitB);
              }

              // Tercer criterio: Orden por nombre y unidad de medida igual a formulacion-sociales-tabla
              let idxA = -1, idxB = -1;
              if (orderedActivityDetailNames?.length && orderedActivityDetailMU?.length) {
                idxA = orderedActivityDetailNames.findIndex((name, i) => name === a.name && (orderedActivityDetailMU[i] || '') === (a.measurementUnit || ''));
                idxB = orderedActivityDetailNames.findIndex((name, i) => name === b.name && (orderedActivityDetailMU[i] || '') === (b.measurementUnit || ''));
              }
              if (idxA === -1 && idxB === -1) {
                if (a.name === b.name) {
                  return (a.measurementUnit || '').localeCompare(b.measurementUnit || '');
                }
                return (a.name || '').localeCompare(b.name || '');
              }
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              if (idxA === idxB) {
                if (a.measurementUnit && b.measurementUnit) {
                  return a.measurementUnit.localeCompare(b.measurementUnit);
                }
                if (a.measurementUnit) return -1;
                if (b.measurementUnit) return 1;
                return 0;
              }
              return idxA - idxB;
            });

        // Agregar separador visual antes de cada dependencia (excepto la primera)
        if (depIndex > 0) {
          currentRow++;
        }
        const startRowForDependency = currentRow;

        dependencyActivities.forEach(activity => {
          const rowData = [
            dependencyName,
            this.getMainOperativeUnit(activity),
            this.getSubOperativeUnit(activity),
            activity.name || '',
            activity.measurementUnit || '',
            ...(activity.monthlyGoals?.map(goal => goal.value || 0) || Array(12).fill(0)),
            '',
            ...(activity.monthlyBudgets?.map(budget => budget.value || 0) || Array(12).fill(0)),
            ''
          ];
          const row = worksheet.getRow(currentRow);
          // Insert monthly goals/budgets values
          rowData.forEach((data, colIndex) => {
            row.getCell(colIndex + 1).value = data;
          });

          // Compute Total Metas (column 18) following measurementType rule (match getTotalMonthlyGoals):
          try {
            const measurementTypeId = activity.activityFamily?.parentActivityFamily?.measurementType?.idMeasurementType
              ?? activity.activityFamily?.measurementType?.idMeasurementType;

            if (measurementTypeId === 1) {
              // Sum all months F:Q
              row.getCell(18).value = { formula: `SUM(F${currentRow}:Q${currentRow})` };
            } else if (measurementTypeId === 2 || measurementTypeId === 3) {
              // Cumulative types: use December (column Q)
              row.getCell(18).value = { formula: `Q${currentRow}` };
            } else {
              // Fallback to sum
              row.getCell(18).value = { formula: `SUM(F${currentRow}:Q${currentRow})` };
            }
          } catch (e) {
            // If anything fails, fallback to formula
            row.getCell(18).value = { formula: `SUM(F${currentRow}:Q${currentRow})` };
          }
      currentRow++;
        });
        this.addDependencyGroupBorder(worksheet, startRowForDependency, currentRow - 1, headers.length);
      }
    });

    this.setupSheetStylesAndProtection(worksheet, formulation, 3);
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
          goals: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], // Columnas F-Q (metas)
          budgets: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] // Columnas S-AD (presupuestos)
        };
      }

      const quarter = formulation.quarter || 1;
      const startMonth = (quarter - 1) * 3; // Mes inicial del trimestre actual

      // Desde el trimestre actual en adelante son editables
      const editableGoalColumns: number[] = [];
      const editableBudgetColumns: number[] = [];
      
      for (let i = startMonth; i < 12; i++) { // Desde el mes inicial hasta diciembre
        editableGoalColumns.push(6 + i); // Columnas F-Q (6-17)
        editableBudgetColumns.push(19 + i); // Columnas S-AD (19-30)
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
        if (rowNumber > startRow && (colNumber === 18 || colNumber === 31)) {
          cell.fill = grayFill;
          cell.font = boldFont;
        }
      });

      // Añadir fórmulas para los totales si aún no hay un valor calculado
      if (rowNumber > startRow) {
        const totalGoalsCell = row.getCell(18);
        // Set formula only if cell is empty so we don't overwrite conditional formulas
        if (totalGoalsCell.value === undefined || totalGoalsCell.value === null) {
          totalGoalsCell.value = { formula: `SUM(F${rowNumber}:Q${rowNumber})` };
        }

        const totalBudgetCell = row.getCell(31);
        if (totalBudgetCell.value === undefined || totalBudgetCell.value === null) {
          totalBudgetCell.value = { formula: `SUM(S${rowNumber}:AD${rowNumber})` };
        }
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
        for (let C = 6; C <= 17; C++) { // Metas
          if (!editableMonths.goals.includes(C)) {
            const cell = worksheet.getCell(R, C);
            cell.fill = lockedFill;
          }
        }
        
        for (let C = 19; C <= 30; C++) { // Presupuestos
          if (!editableMonths.budgets.includes(C)) {
            const cell = worksheet.getCell(R, C);
            cell.fill = lockedFill;
          }
        }
      } else {
        // Para filas vacías (separadores), aplicar estilo especial y mantener bloqueadas
        for (let C = 1; C <= 31; C++) {
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
    const worksheet = workbook.addWorksheet('Plantilla Consolidada Sociales');

    // Agregar título principal
    this.addMainTitle(worksheet, 'CONSOLIDADO - PRESTACIONES SOCIALES');

    const headers = [
      'Unidad operativa', 'Sub Unidad Operativa', 'Actividades Priorizadas de Gestión', 'Unidad de Medida',
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

    // Ordenar las actividades consolidadas por unidad operativa
    const sortedConsolidatedActivities = [...consolidatedActivities].sort((a, b) => {
      const unitA = this.getMainOperativeUnitFromConsolidated(a) || '';
      const unitB = this.getMainOperativeUnitFromConsolidated(b) || '';
      
      // Ordenar por unidad operativa primero, luego por sub unidad, luego por nombre
      if (unitA !== unitB) {
        return unitA.localeCompare(unitB);
      }
      
      const subUnitA = this.getSubOperativeUnitFromConsolidated(a) || '';
      const subUnitB = this.getSubOperativeUnitFromConsolidated(b) || '';
      
      if (subUnitA !== subUnitB) {
        return subUnitA.localeCompare(subUnitB);
      }
      
      return (a.name || '').localeCompare(b.name || '');
    });

    // Build consolidated sheet using formulas that reference 'Plantilla Prestaciones Sociales'
    // We'll use SUMIF to sum values from the first sheet by matching Unidad operativa + Actividad name
    // Key on Plantilla Prestaciones Sociales: Dependencia in column A, Unidad operativa B, Actividad in D
    sortedConsolidatedActivities.forEach(consolidatedItem => {
      const worksheetName = 'Plantilla Prestaciones Sociales';
      const unit = this.getMainOperativeUnitFromConsolidated(consolidatedItem) || '';
      const subUnit = this.getSubOperativeUnitFromConsolidated(consolidatedItem) || '';
      const activityName = consolidatedItem.name || '';

      const row = worksheet.getRow(currentRow);

      // Columns: A Unidad operativa, B Sub unidad, C Actividad, D Unidad de medida
      row.getCell(1).value = unit;
      row.getCell(2).value = subUnit;
      row.getCell(3).value = activityName;
      row.getCell(4).value = consolidatedItem.measurementUnit || '';

      // For months: main sheet stores metas in columns F..Q (6..17), consolidated months are E..P (5..16)
      // Map consolidated month column (5..16) to plantilla metas column (6..17)
      for (let m = 0; m < 12; m++) {
        const colIndex = 5 + m; // consolidated E..P
        const plantillaMonthCol = 6 + m; // plantilla F..Q
        const monthColLetter = this.columnLetter(plantillaMonthCol);
        // SUMIFS(rangeToSum, criteriaRange1, criteria1, criteriaRange2, criteria2)
        // rangeToSum: Plantilla!<monthColLetter>:<monthColLetter>
        // criteriaRange1: Plantilla!D:D (activity name)
        // criteria1: activityName
        // criteriaRange2: Plantilla!B:B (unidad operativa)
        // criteria2: unit
        const formula = `SUMIFS('${worksheetName}'!${monthColLetter}:${monthColLetter},'${worksheetName}'!$D:$D,${this.escapeStringForFormula(activityName)},'${worksheetName}'!$B:$B,${this.escapeStringForFormula(unit)})`;
        row.getCell(colIndex).value = { formula };
      }

      // Total Metas (col 17) - conditional by measurementType on consolidatedItem
      try {
        const measurementTypeIdCons = consolidatedItem.activityFamily?.parentActivityFamily?.measurementType?.idMeasurementType
          ?? consolidatedItem.activityFamily?.measurementType?.idMeasurementType;
        if (measurementTypeIdCons === 1) {
          row.getCell(17).value = { formula: `SUM(E${currentRow}:P${currentRow})` };
        } else if (measurementTypeIdCons === 2 || measurementTypeIdCons === 3) {
          // cumulative -> December is column P (16)
          row.getCell(17).value = { formula: `P${currentRow}` };
        } else {
          row.getCell(17).value = { formula: `SUM(E${currentRow}:P${currentRow})` };
        }
      } catch (e) {
        row.getCell(17).value = { formula: `SUM(E${currentRow}:P${currentRow})` };
      }

      // Budgets: consolidated budgets columns are 18..29 and should map to plantilla budgets S..AD (19..30)
      for (let m = 0; m < 12; m++) {
        const budgetColIndex = 18 + m; // consolidated 18..29
        const plantillaBudgetCol = 19 + m; // plantilla S..AD (19..30)
        const monthColLetterInPlantilla = this.columnLetter(plantillaBudgetCol);
        const formula = `SUMIFS('${worksheetName}'!${monthColLetterInPlantilla}:${monthColLetterInPlantilla},'${worksheetName}'!$D:$D,${this.escapeStringForFormula(activityName)},'${worksheetName}'!$B:$B,${this.escapeStringForFormula(unit)})`;
        row.getCell(budgetColIndex).value = { formula };
      }

      // Total Presupuesto (col 30)
      row.getCell(30).value = { formula: `SUM(R${currentRow}:AC${currentRow})` };

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
        } else if (rowNumber > startRow && (colNumber === 17 || colNumber === 30)) { // Columnas de totales
          cell.fill = grayFill;
          cell.font = boldFont;
        }
      });

      // Añadir fórmulas para los totales (las fórmulas funcionarán incluso en celdas bloqueadas)
      if (rowNumber > startRow) {
        const totalGoalsCell = row.getCell(17);
        if (totalGoalsCell.value === undefined || totalGoalsCell.value === null) {
          totalGoalsCell.value = { formula: `SUM(E${rowNumber}:P${rowNumber})` };
        }

        const totalBudgetCell = row.getCell(30);
        if (totalBudgetCell.value === undefined || totalBudgetCell.value === null) {
          totalBudgetCell.value = { formula: `SUM(R${rowNumber}:AC${rowNumber})` };
        }
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
      { width: 50 }, // Unidad operativa
      { width: 40 }, // Sub Unidad Operativa
      { width: 60 }, // Actividades Priorizadas de Gestión
      { width: 20 }, // Unidad de Medida
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas Ene-Abr
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas May-Ago
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas Sep-Dic
      { width: 20 }, // Total Metas
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup Ene-Abr
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup May-Ago
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup Sep-Dic
      { width: 20 }  // Total Presupuesto
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
      { width: 30 }, // Dependencia
      { width: 50 }, // Unidad operativa
      { width: 40 }, // Sub Unidad Operativa
      { width: 60 }, // Actividades Priorizadas de Gestión
      { width: 20 }, // Unidad de Medida
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas Ene-Abr
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas May-Ago
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas Sep-Dic
      { width: 20 }, // Total Metas
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup Ene-Abr
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup May-Ago
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup Sep-Dic
      { width: 20 }  // Total Presupuesto
    ];
    worksheet.columns.forEach((column, index) => {
      if (columnWidths[index]) {
        column.width = columnWidths[index].width;
      }
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
    // Mergear celdas para el título (ahora hasta AE porque agregamos una columna)
    worksheet.mergeCells('A1:AE1');
    
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
   * Convierte un índice de columna 1-based a letra de columna Excel (1 -> A, 27 -> AA)
   */
  private columnLetter(colIndex: number): string {
    let dividend = colIndex;
    let columnName = '';
    while (dividend > 0) {
      let modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }
    return columnName;
  }

  /**
   * Escapa una cadena para usar en una fórmula Excel como literal (envuelve en comillas y duplica comillas internas)
   */
  private escapeStringForFormula(value: string): string {
    if (value === undefined || value === null) {
      return '""';
    }
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
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
    this.addMainTitle(consolidatedSheet, 'CONSOLIDADO - PRESTACIONES SOCIALES');
    
    const headers = [
      'Unidad operativa', 'Sub Unidad Operativa', 'Actividades Priorizadas de Gestión', 'Unidad de Medida',
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

    // Consolidar por nombre de actividad/subsidio
    const activityGroups: { [activityName: string]: OperationalActivity[] } = {};
    
    // Agrupar todas las actividades por nombre
    dependencyNames.forEach(dependencyName => {
      const dependencyActivities = groupedActivities[dependencyName];
      if (dependencyActivities && dependencyActivities.length > 0) {
        dependencyActivities.forEach(activity => {
          const activityName = activity.name || 'Sin nombre';
          if (!activityGroups[activityName]) {
            activityGroups[activityName] = [];
          }
          activityGroups[activityName].push(activity);
        });
      }
    });

    // Crear una fila por cada actividad única, ordenadas por unidad operativa
    const sortedActivityNames = Object.keys(activityGroups).sort((a, b) => {
      const activitiesA = activityGroups[a];
      const activitiesB = activityGroups[b];
      const unitA = this.getMainOperativeUnit(activitiesA[0]) || '';
      const unitB = this.getMainOperativeUnit(activitiesB[0]) || '';
      
      // Ordenar por unidad operativa primero, luego por nombre de actividad
      if (unitA !== unitB) {
        return unitA.localeCompare(unitB);
      }
      return a.localeCompare(b);
    });

    // Build consolidated 'Consolidado' sheet using formulas referencing 'Plantilla Prestaciones Sociales'
    const plantillaName = 'Plantilla Prestaciones Sociales';
    sortedActivityNames.forEach(activityName => {
      const activities = activityGroups[activityName];
      const representative = activities[0];
      const unit = this.getMainOperativeUnit(representative) || '';
      const subUnit = this.getSubOperativeUnit(representative) || '';

      const row = consolidatedSheet.getRow(currentRow);
      row.getCell(1).value = unit;
      row.getCell(2).value = subUnit;
      row.getCell(3).value = activityName;
      row.getCell(4).value = representative?.measurementUnit || 'Unidad';

      // Months E..P (5..16) map to plantilla metas F..Q (6..17)
      for (let m = 0; m < 12; m++) {
        const colIndex = 5 + m; // E..P consolidated
        const plantillaMonthCol = 6 + m; // F..Q in plantilla
        const monthColLetter = this.columnLetter(plantillaMonthCol);
        const formula = `SUMIFS('${plantillaName}'!${monthColLetter}:${monthColLetter},'${plantillaName}'!$D:$D,${this.escapeStringForFormula(activityName)},'${plantillaName}'!$B:$B,${this.escapeStringForFormula(unit)})`;
        row.getCell(colIndex).value = { formula };
      }

      // Total Metas - conditional by measurement type from representative activity
      try {
        const measurementTypeIdRep = representative?.activityFamily?.parentActivityFamily?.measurementType?.idMeasurementType
          ?? representative?.activityFamily?.measurementType?.idMeasurementType;
        if (measurementTypeIdRep === 1) {
          row.getCell(17).value = { formula: `SUM(E${currentRow}:P${currentRow})` };
        } else if (measurementTypeIdRep === 2 || measurementTypeIdRep === 3) {
          row.getCell(17).value = { formula: `P${currentRow}` };
        } else {
          row.getCell(17).value = { formula: `SUM(E${currentRow}:P${currentRow})` };
        }
      } catch (e) {
        row.getCell(17).value = { formula: `SUM(E${currentRow}:P${currentRow})` };
      }

      // Budgets consolidated 18..29 map to plantilla budgets S..AD (19..30)
      for (let m = 0; m < 12; m++) {
        const budgetColIndex = 18 + m; // consolidated
        const plantBudgetCol = 19 + m; // plantilla S..AD
        const plantBudgetColLetter = this.columnLetter(plantBudgetCol);
        const formula = `SUMIFS('${plantillaName}'!${plantBudgetColLetter}:${plantBudgetColLetter},'${plantillaName}'!$D:$D,${this.escapeStringForFormula(activityName)},'${plantillaName}'!$B:$B,${this.escapeStringForFormula(unit)})`;
        row.getCell(budgetColIndex).value = { formula };
      }

      // Total Presupuesto
      row.getCell(30).value = { formula: `SUM(R${currentRow}:AC${currentRow})` };

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
        } else if (rowNumber > startRow && (colNumber === 17 || colNumber === 30)) { // Columnas de totales
          cell.fill = grayFill;
          cell.font = boldFont;
        }
      });

      // Añadir fórmulas para los totales solo si aún no hay un valor calculado
        if (rowNumber > startRow) {
          const totalGoalsCell = row.getCell(17);
          if (totalGoalsCell.value === undefined || totalGoalsCell.value === null) {
            totalGoalsCell.value = { formula: `SUM(E${rowNumber}:P${rowNumber})` };
          }

          const totalBudgetCell = row.getCell(30);
          if (totalBudgetCell.value === undefined || totalBudgetCell.value === null) {
            totalBudgetCell.value = { formula: `SUM(R${rowNumber}:AC${rowNumber})` };
          }
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
      { width: 50 }, // Unidad operativa
      { width: 40 }, // Sub Unidad Operativa
      { width: 60 }, // Actividades Priorizadas de Gestión
      { width: 20 }, // Unidad de Medida
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas Ene-Abr
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas May-Ago
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Metas Sep-Dic
      { width: 20 }, // Total Metas
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup Ene-Abr
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup May-Ago
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, // Presup Sep-Dic
      { width: 20 }  // Total Presupuesto
    ];
    worksheet.columns.forEach((column, index) => {
      if (columnWidths[index]) {
        column.width = columnWidths[index].width;
      }
    });
  }
}