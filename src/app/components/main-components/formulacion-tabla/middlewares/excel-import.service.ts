import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import * as ExcelJS from 'exceljs';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { MonthlyGoal } from '../../../../models/logic/monthlyGoal.model';
import { MonthlyBudget } from '../../../../models/logic/monthlyBudget.model';

export interface ImportedActivity {
  dependencyName: string;
  subsidio: string;
  measurementUnit: string;
  monthlyGoals: number[];
  monthlyBudgets: number[];
  totalGoals?: number;
  totalBudgets?: number;
}

export interface ImportResult {
  success: boolean;
  activities: ImportedActivity[];
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ExcelImportService {

  constructor(private toastr: ToastrService) {}

  /**
   * Importa actividades desde un archivo Excel
   * @param file Archivo Excel a importar
   * @returns Observable con el resultado de la importación
   */
  importActivitiesFromExcel(file: File): Observable<ImportResult> {
    return from(this.processExcelFile(file));
  }

  /**
   * Importa actividades consolidadas desde un archivo Excel
   * @param file Archivo Excel a importar
   * @returns Observable con el resultado de la importación
   */
  importConsolidatedActivitiesFromExcel(file: File): Observable<ImportResult> {
    return from(this.processConsolidatedExcelFile(file));
  }

  private async processExcelFile(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      activities: [],
      errors: [],
      warnings: []
    };

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      // Buscar la hoja "Plantilla Prestaciones"
      const worksheet = workbook.getWorksheet('Plantilla Prestaciones');
      if (!worksheet) {
        result.errors.push('No se encontró la hoja "Plantilla Prestaciones" en el archivo Excel.');
        return result;
      }

      // Validar estructura de la hoja
      const structureValidation = this.validateWorksheetStructure(worksheet);
      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors);
        return result;
      }

      // Procesar las filas de datos
      const activities = this.extractActivitiesFromWorksheet(worksheet);
      
      // Validar datos extraídos
      const validation = this.validateImportedActivities(activities);
      result.activities = validation.validActivities;
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      result.success = result.activities.length > 0 && result.errors.length === 0;

      if (result.success) {
        this.toastr.success(`Se importaron ${result.activities.length} actividades correctamente.`, 'Importación exitosa');
      } else if (result.errors.length > 0) {
        this.toastr.error(`Error en la importación: ${result.errors[0]}`, 'Error de importación');
      }

    } catch (error) {
      console.error('Error al procesar archivo Excel:', error);
      result.errors.push(`Error al procesar el archivo: ${error}`);
      this.toastr.error('Error al procesar el archivo Excel.', 'Error');
    }

    return result;
  }

  private async processConsolidatedExcelFile(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      activities: [],
      errors: [],
      warnings: []
    };

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      // Buscar la hoja "Plantilla Consolidada"
      const worksheet = workbook.getWorksheet('Plantilla Consolidada');
      if (!worksheet) {
        result.errors.push('No se encontró la hoja "Plantilla Consolidada" en el archivo Excel.');
        return result;
      }

      // Validar estructura de la hoja consolidada
      const structureValidation = this.validateConsolidatedWorksheetStructure(worksheet);
      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors);
        return result;
      }

      // Procesar las filas de datos consolidados
      const activities = this.extractConsolidatedActivitiesFromWorksheet(worksheet);
      
      // Validar datos extraídos
      const validation = this.validateImportedActivities(activities);
      result.activities = validation.validActivities;
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      result.success = result.activities.length > 0 && result.errors.length === 0;

      if (result.success) {
        this.toastr.success(`Se importaron ${result.activities.length} actividades consolidadas correctamente.`, 'Importación exitosa');
      } else if (result.errors.length > 0) {
        this.toastr.error(`Error en la importación: ${result.errors[0]}`, 'Error de importación');
      }

    } catch (error) {
      console.error('Error al procesar archivo Excel consolidado:', error);
      result.errors.push(`Error al procesar el archivo: ${error}`);
      this.toastr.error('Error al procesar el archivo Excel consolidado.', 'Error');
    }

    return result;
  }

  private validateWorksheetStructure(worksheet: ExcelJS.Worksheet): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Verificar que existe la fila de encabezados en la fila 3
    const headerRow = worksheet.getRow(3);
    if (!headerRow) {
      errors.push('No se encontró la fila de encabezados en la fila 3.');
      return { isValid: false, errors };
    }

    // Encabezados esperados para la vista detallada
    const expectedHeaders = [
      'Dependencia', 'Subsidio', 'Unidad de Medida',
      'Enero Meta', 'Febrero Meta', 'Marzo Meta', 'Abril Meta', 'Mayo Meta', 'Junio Meta',
      'Julio Meta', 'Agosto Meta', 'Septiembre Meta', 'Octubre Meta', 'Noviembre Meta', 'Diciembre Meta',
      'Total Metas',
      'Enero Presup.', 'Febrero Presup.', 'Marzo Presup.', 'Abril Presup.', 'Mayo Presup.', 'Junio Presup.',
      'Julio Presup.', 'Agosto Presup.', 'Septiembre Presup.', 'Octubre Presup.', 'Noviembre Presup.', 'Diciembre Presup.',
      'Total Presupuesto'
    ];

    // Verificar encabezados
    for (let i = 0; i < expectedHeaders.length; i++) {
      const cellValue = headerRow.getCell(i + 1).value;
      const headerText = cellValue ? cellValue.toString().trim() : '';
      
      if (headerText !== expectedHeaders[i]) {
        errors.push(`Encabezado incorrecto en columna ${i + 1}. Esperado: "${expectedHeaders[i]}", encontrado: "${headerText}"`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateConsolidatedWorksheetStructure(worksheet: ExcelJS.Worksheet): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Verificar que existe la fila de encabezados en la fila 3
    const headerRow = worksheet.getRow(3);
    if (!headerRow) {
      errors.push('No se encontró la fila de encabezados en la fila 3.');
      return { isValid: false, errors };
    }

    // Encabezados esperados para la vista consolidada
    const expectedHeaders = [
      'Subsidio', 'Unidad de Medida',
      'Enero Meta', 'Febrero Meta', 'Marzo Meta', 'Abril Meta', 'Mayo Meta', 'Junio Meta',
      'Julio Meta', 'Agosto Meta', 'Septiembre Meta', 'Octubre Meta', 'Noviembre Meta', 'Diciembre Meta',
      'Total Metas',
      'Enero Presup.', 'Febrero Presup.', 'Marzo Presup.', 'Abril Presup.', 'Mayo Presup.', 'Junio Presup.',
      'Julio Presup.', 'Agosto Presup.', 'Septiembre Presup.', 'Octubre Presup.', 'Noviembre Presup.', 'Diciembre Presup.',
      'Total Presupuesto'
    ];

    // Verificar encabezados
    for (let i = 0; i < expectedHeaders.length; i++) {
      const cellValue = headerRow.getCell(i + 1).value;
      const headerText = cellValue ? cellValue.toString().trim() : '';
      
      if (headerText !== expectedHeaders[i]) {
        errors.push(`Encabezado incorrecto en columna ${i + 1}. Esperado: "${expectedHeaders[i]}", encontrado: "${headerText}"`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private extractActivitiesFromWorksheet(worksheet: ExcelJS.Worksheet): ImportedActivity[] {
    const activities: ImportedActivity[] = [];
    
    // Empezar desde la fila 4 (después del título, fila vacía y encabezados)
    for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Verificar si la fila tiene datos
      if (this.isEmptyRow(row)) {
        continue;
      }

      const activity: ImportedActivity = {
        dependencyName: this.getCellValue(row, 1),
        subsidio: this.getCellValue(row, 2),
        measurementUnit: this.getCellValue(row, 3),
        monthlyGoals: [],
        monthlyBudgets: []
      };

      // Extraer metas mensuales (columnas 4-15)
      for (let col = 4; col <= 15; col++) {
        const value = this.getCellNumericValue(row, col);
        activity.monthlyGoals.push(value);
      }

      // Extraer presupuestos mensuales (columnas 17-28)
      for (let col = 17; col <= 28; col++) {
        const value = this.getCellNumericValue(row, col);
        activity.monthlyBudgets.push(value);
      }

      // Calcular totales
      activity.totalGoals = activity.monthlyGoals.reduce((sum, val) => sum + val, 0);
      activity.totalBudgets = activity.monthlyBudgets.reduce((sum, val) => sum + val, 0);

      activities.push(activity);
    }

    return activities;
  }

  private extractConsolidatedActivitiesFromWorksheet(worksheet: ExcelJS.Worksheet): ImportedActivity[] {
    const activities: ImportedActivity[] = [];
    
    // Empezar desde la fila 4 (después del título, fila vacía y encabezados)
    for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Verificar si la fila tiene datos
      if (this.isEmptyRow(row)) {
        continue;
      }

      const activity: ImportedActivity = {
        dependencyName: 'Consolidado', // Para actividades consolidadas
        subsidio: this.getCellValue(row, 1),
        measurementUnit: this.getCellValue(row, 2),
        monthlyGoals: [],
        monthlyBudgets: []
      };

      // Extraer metas mensuales (columnas 3-14)
      for (let col = 3; col <= 14; col++) {
        const value = this.getCellNumericValue(row, col);
        activity.monthlyGoals.push(value);
      }

      // Extraer presupuestos mensuales (columnas 16-27)
      for (let col = 16; col <= 27; col++) {
        const value = this.getCellNumericValue(row, col);
        activity.monthlyBudgets.push(value);
      }

      // Calcular totales
      activity.totalGoals = activity.monthlyGoals.reduce((sum, val) => sum + val, 0);
      activity.totalBudgets = activity.monthlyBudgets.reduce((sum, val) => sum + val, 0);

      activities.push(activity);
    }

    return activities;
  }

  private validateImportedActivities(activities: ImportedActivity[]): {
    validActivities: ImportedActivity[];
    errors: string[];
    warnings: string[];
  } {
    const validActivities: ImportedActivity[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (activities.length === 0) {
      errors.push('No se encontraron actividades en el archivo Excel.');
      return { validActivities, errors, warnings };
    }

    activities.forEach((activity, index) => {
      const rowNumber = index + 4; // +4 porque empezamos desde la fila 4
      const activityErrors: string[] = [];

      // Validaciones obligatorias
      if (!activity.subsidio?.trim()) {
        activityErrors.push(`Fila ${rowNumber}: El subsidio es obligatorio.`);
      }

      if (!activity.measurementUnit?.trim()) {
        activityErrors.push(`Fila ${rowNumber}: La unidad de medida es obligatoria.`);
      }

      // Los valores en 0 son válidos, no necesitan validación adicional

      // Validar que las metas y presupuestos sean números válidos
      activity.monthlyGoals.forEach((goal, i) => {
        if (isNaN(goal) || goal < 0) {
          activityErrors.push(`Fila ${rowNumber}: Meta del mes ${i + 1} debe ser un número válido mayor o igual a 0.`);
        }
      });

      activity.monthlyBudgets.forEach((budget, i) => {
        if (isNaN(budget) || budget < 0) {
          activityErrors.push(`Fila ${rowNumber}: Presupuesto del mes ${i + 1} debe ser un número válido mayor o igual a 0.`);
        }
      });

      if (activityErrors.length > 0) {
        errors.push(...activityErrors);
      } else {
        validActivities.push(activity);
      }
    });

    return { validActivities, errors, warnings };
  }

  private isEmptyRow(row: ExcelJS.Row): boolean {
    // Verificar si todas las celdas principales están vacías
    const subsidio = this.getCellValue(row, 2);
    const measurementUnit = this.getCellValue(row, 3);
    
    return !subsidio.trim() && !measurementUnit.trim();
  }

  private getCellValue(row: ExcelJS.Row, columnNumber: number): string {
    const cell = row.getCell(columnNumber);
    const value = cell.value;
    
    if (value === null || value === undefined) {
      return '';
    }
    
    return value.toString().trim();
  }

  private getCellNumericValue(row: ExcelJS.Row, columnNumber: number): number {
    const cell = row.getCell(columnNumber);
    const value = cell.value;
    
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    // Si es un objeto de fórmula, tomar el resultado
    if (typeof value === 'object' && 'result' in value) {
      return Number(value.result) || 0;
    }
    
    const numericValue = Number(value);
    return isNaN(numericValue) ? 0 : numericValue;
  }

  /**
   * Convierte las actividades importadas a objetos OperationalActivity
   * @param importedActivities Actividades importadas del Excel
   * @param formulation Formulación actual
   * @returns Array de OperationalActivity
   */
  convertToOperationalActivities(
    importedActivities: ImportedActivity[],
    formulation: any
  ): OperationalActivity[] {
    return importedActivities.map(importedActivity => {
      const operationalActivity: OperationalActivity = {
        name: importedActivity.subsidio,
        measurementUnit: importedActivity.measurementUnit,
        description: `Importado desde Excel - ${importedActivity.subsidio}`,
        active: true,
        formulation: formulation,
        monthlyGoals: this.createMonthlyGoalsFromImported(importedActivity.monthlyGoals),
        monthlyBudgets: this.createMonthlyBudgetsFromImported(importedActivity.monthlyBudgets)
      } as OperationalActivity;

      return operationalActivity;
    });
  }

  private createMonthlyGoalsFromImported(goals: number[]): MonthlyGoal[] {
    return goals.map((value, index) => ({
      goalOrder: index + 1,
      value: value,
      active: true
    } as MonthlyGoal));
  }

  private createMonthlyBudgetsFromImported(budgets: number[]): MonthlyBudget[] {
    return budgets.map((value, index) => ({
      budgetOrder: index + 1,
      value: value,
      active: true
    } as MonthlyBudget));
  }
}
