import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import * as ExcelJS from 'exceljs';
import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { ActivityFamily } from '../../../../models/logic/activityFamily.model';
import { MonthlyGoal } from '../../../../models/logic/monthlyGoal.model';
import { MonthlyBudget } from '../../../../models/logic/monthlyBudget.model';
import { Formulation } from '../../../../models/logic/formulation.model';
import { ActivityFamilyService } from '../../../../core/services/logic/activity-family.service';
import { HealthOperationalActivityService } from '../../../../core/services/logic/health-operational-activity.service';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { FormulationService } from '../../../../core/services/logic/formulation.service';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  errors: string[];
  activities: OperationalActivity[];
}

export interface ExcelRowData {
  agrupFonafe: string;
  poi: boolean;
  codRed: string;
  descRed: string;
  codCenSes: string;
  desCenSes: string;
  nivelCompl: string;
  nivelAtencion: string;
  activityFamilyName: string;
  codPre: string;
  codTarif: string;
  name: string;
  fonafe: boolean;
  metaProg: number;
  proyCierre: number;
  prodTotalProy: number;
  tarifa: number;
  proyTarif: number;
  monthlyGoals: number[];
  monthlyBudgets: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ImportTemplateService {

  private activityFamiliesCache: ActivityFamily[] = [];
  private currentFormulation: Formulation | null = null;

  constructor(
    private toastr: ToastrService,
    private activityFamilyService: ActivityFamilyService,
    private healthOperationalActivityService: HealthOperationalActivityService,
    private formulationService: FormulationService
  ) {}

  /**
   * Establece la formulación actual para las actividades importadas
   * @param formulation Formulación actual
   */
  setCurrentFormulation(formulation: Formulation): void {
    this.currentFormulation = formulation;
  }

  /**
   * Procesa un archivo Excel y convierte las filas en actividades operacionales de salud
   * @param file Archivo Excel a procesar
   * @returns Observable con el resultado de la importación
   */
  processExcelFile(file: File, year: number): Observable<ImportResult> {
    return new Observable<ImportResult>(observer => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.getWorksheet(1); // Primera hoja
          if (!worksheet) {
            observer.next({
              success: false,
              totalRows: 0,
              processedRows: 0,
              errors: ['No se pudo leer la hoja de Excel'],
              activities: []
            });
            observer.complete();
            return;
          }

          // 1. Buscar o crear la formulación
          this.formulationService.searchByDependencyAndYear(115, year).subscribe({
            next: (formulations) => {
              let formulation = formulations.find(f => 
                f.formulationState?.idFormulationState === 1 &&
                f.modification === 1 &&
                f.quarter === 1 &&
                f.formulationType?.idFormulationType === 3
              );
              const createAndContinue = (formulationToUse: Formulation) => {
                this.setCurrentFormulation(formulationToUse);
                // 2. Cargar familias de actividades SOLO tipo 'salud'
                this.activityFamilyService.getAll().subscribe({
                  next: (families) => {
                    this.activityFamiliesCache = families.filter(f => (f.type || '').toLowerCase() === 'salud');
                    this.processWorksheet(worksheet).subscribe({
                      next: (result) => observer.next(result),
                      error: (error) => observer.error(error),
                      complete: () => observer.complete()
                    });
                  },
                  error: (error) => {
                    observer.next({
                      success: false,
                      totalRows: 0,
                      processedRows: 0,
                      errors: ['Error al cargar familias de actividades: ' + error.message],
                      activities: []
                    });
                    observer.complete();
                  }
                });
              };
              if (formulation) {
                createAndContinue(formulation);
              } else {
                // Crear la formulación si no existe
                const newFormulation: Formulation = {
                  dependency: { idDependency: 115 } as any,
                  formulationState: { idFormulationState: 1 } as any,
                  year: year,
                  modification: 1,
                  quarter: 1,
                  formulationType: { idFormulationType: 3 } as any,
                  active: true
                };
                this.formulationService.create(newFormulation).subscribe({
                  next: (created) => createAndContinue(created),
                  error: (error) => {
                    observer.next({
                      success: false,
                      totalRows: 0,
                      processedRows: 0,
                      errors: ['Error al crear formulación: ' + error.message],
                      activities: []
                    });
                    observer.complete();
                  }
                });
              }
            },
            error: (error) => {
              observer.next({
                success: false,
                totalRows: 0,
                processedRows: 0,
                errors: ['Error al buscar formulación: ' + error.message],
                activities: []
              });
              observer.complete();
            }
          });

        } catch (error) {
          observer.next({
            success: false,
            totalRows: 0,
            processedRows: 0,
            errors: ['Error al procesar el archivo Excel: ' + (error as Error).message],
            activities: []
          });
          observer.complete();
        }
      };

      reader.onerror = () => {
        observer.next({
          success: false,
          totalRows: 0,
          processedRows: 0,
          errors: ['Error al leer el archivo'],
          activities: []
        });
        observer.complete();
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Procesa la hoja de Excel y extrae los datos
   * @param worksheet Hoja de Excel
   * @returns Observable con el resultado del procesamiento
   */
  private processWorksheet(worksheet: ExcelJS.Worksheet): Observable<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      processedRows: 0,
      errors: [],
      activities: []
    };

    try {
      // Obtener todas las filas (empezar desde la fila 3, después de título y headers)
      const dataRows: ExcelRowData[] = [];
      const totalRows = worksheet.rowCount;
      result.totalRows = Math.max(0, totalRows - 2); // Solo 1 título y 1 cabecera

      // Procesar cada fila de datos (empezar desde la fila 3)
      for (let rowIndex = 3; rowIndex <= totalRows; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        // Verificar si la fila tiene datos
        if (this.isEmptyRow(row)) continue;
        try {
          const rowData = this.extractRowData(row, rowIndex);
          if (rowData) {
            dataRows.push(rowData);
          }
        } catch (error) {
          result.errors.push(`Fila ${rowIndex}: ${(error as Error).message}`);
        }
      }

      // Convertir datos a actividades operacionales y GUARDARLAS
      return this.createOperationalActivities(dataRows).pipe(
        switchMap(activities => {
          // Guardar en backend usando HealthOperationalActivityService
          const saveObservables = activities.map(activity =>
            this.healthOperationalActivityService.create(activity as any).pipe(
              catchError(error => {
                console.error('Error al guardar actividad:', activity.name, error);
                throw new Error(`Error al guardar actividad "${activity.name}": ${error.message}`);
              })
            )
          );
          return forkJoin(saveObservables).pipe(
            map(saved => {
              result.processedRows = activities.length;
              result.activities = saved;
              result.success = result.errors.length === 0;
              return result;
            })
          );
        }),
        catchError(error => {
          result.success = false;
          result.errors.push('Error al crear o guardar actividades: ' + error.message);
          return of(result);
        })
      );

    } catch (error) {
      result.success = false;
      result.errors.push('Error al procesar la hoja: ' + (error as Error).message);
      return of(result);
    }
  }

  /**
   * Extrae los datos de una fila de Excel
   * @param row Fila de Excel
   * @param rowIndex Índice de la fila
   * @returns Datos extraídos de la fila
   */
  private extractRowData(row: ExcelJS.Row, rowIndex: number): ExcelRowData | null {
    try {
      // Verificar que el nombre de actividad existe (campo obligatorio)
      const name = this.getCellValue(row, 12)?.toString().trim();
      if (!name) {
        throw new Error('Nombre de actividad es obligatorio');
      }

      const rowData: ExcelRowData = {
        agrupFonafe: this.getCellValue(row, 1)?.toString() || '',
        poi: this.parseBoolean(this.getCellValue(row, 2)),
        codRed: this.getCellValue(row, 3)?.toString() || '',
        descRed: this.getCellValue(row, 4)?.toString() || '',
        codCenSes: this.getCellValue(row, 5)?.toString() || '',
        desCenSes: this.getCellValue(row, 6)?.toString() || '',
        nivelCompl: this.getCellValue(row, 7)?.toString() || '',
        nivelAtencion: this.getCellValue(row, 8)?.toString() || '',
        activityFamilyName: this.getCellValue(row, 9)?.toString() || '',
        codPre: this.getCellValue(row, 10)?.toString() || '',
        codTarif: this.getCellValue(row, 11)?.toString() || '',
        name: name,
        fonafe: this.parseBoolean(this.getCellValue(row, 13)),
        metaProg: this.parseNumber(this.getCellValue(row, 14)),
        proyCierre: this.parseNumber(this.getCellValue(row, 15)),
        prodTotalProy: this.parseNumber(this.getCellValue(row, 16)),
        tarifa: this.parseNumber(this.getCellValue(row, 17)),
        proyTarif: this.parseNumber(this.getCellValue(row, 18)),
        monthlyGoals: this.extractMonthlyValues(row, 19, 30), // Columnas 19-30 (Enero-Diciembre Metas)
        monthlyBudgets: this.extractMonthlyValues(row, 31, 42) // Columnas 31-42 (Enero-Diciembre Presupuestos)
      };

      return rowData;
    } catch (error) {
      throw new Error(`Error en fila ${rowIndex}: ${(error as Error).message}`);
    }
  }

  /**
   * Crea las actividades operacionales a partir de los datos extraídos
   * @param dataRows Datos extraídos del Excel
   * @returns Observable con las actividades creadas
   */
  private createOperationalActivities(dataRows: ExcelRowData[]): Observable<OperationalActivity[]> {
    const activities: OperationalActivity[] = [];
    const familyCreationObservables: Observable<ActivityFamily>[] = [];
    const uniqueFamilyNames = new Set<string>();

    // Identificar familias únicas que necesitan ser creadas
    dataRows.forEach(rowData => {
      if (rowData.activityFamilyName && !this.findExistingFamily(rowData.activityFamilyName)) {
        uniqueFamilyNames.add(rowData.activityFamilyName);
      }
    });

    // Crear observables para crear nuevas familias
    uniqueFamilyNames.forEach(familyName => {
      familyCreationObservables.push(this.createOrFindActivityFamily(familyName));
    });

    // Ejecutar creación de familias en paralelo
    const familyCreation$ = familyCreationObservables.length > 0 
      ? forkJoin(familyCreationObservables) 
      : of([]);

    return familyCreation$.pipe(
      switchMap((newFamilies) => {
        // Actualizar cache con nuevas familias
        this.activityFamiliesCache.push(...newFamilies);

        // Crear actividades operacionales
        dataRows.forEach((rowData, index) => {
          try {
            const activity = this.createOperationalActivity(rowData, index + 1);
            activities.push(activity);
          } catch (error) {
            throw new Error(`Error al crear actividad ${index + 1}: ${(error as Error).message}`);
          }
        });

        return of(activities);
      })
    );
  }

  /**
   * Crea una actividad operacional a partir de los datos de una fila
   * @param rowData Datos de la fila
   * @param correlativeIndex Índice correlativo
   * @returns Actividad operacional creada
   */
  private createOperationalActivity(rowData: ExcelRowData, correlativeIndex: number): OperationalActivity {
    const activity: OperationalActivity = {
      correlativeCode: `H`,
      name: rowData.name,
      description: `Actividad de salud: ${rowData.name}`,
      measurementUnit: 'Unidad', // Valor por defecto
      goods: 0,
      remuneration: 0,
      services: 0,
      active: true,
      
      // Formulation es requerida - usar la formulación actual
      formulation: this.currentFormulation || {} as Formulation,
      
      // Propiedades específicas de salud
      agrupFonafe: rowData.agrupFonafe,
      poi: rowData.poi,
      codRed: rowData.codRed,
      descRed: rowData.descRed,
      codCenSes: rowData.codCenSes,
      desCenSes: rowData.desCenSes,
      nivelCompl: rowData.nivelCompl,
      nivelAtencion: rowData.nivelAtencion,
      codPre: rowData.codPre,
      codTarif: rowData.codTarif,
      fonafe: rowData.fonafe,
      metaProg: rowData.metaProg,
      proyCierre: rowData.proyCierre,
      prodTotalProy: rowData.prodTotalProy,
      tarifa: rowData.tarifa,
      proyTarif: rowData.proyTarif,

      // Familia de actividad
      activityFamily: this.findExistingFamily(rowData.activityFamilyName),

      // Metas mensuales
      monthlyGoals: this.createMonthlyGoals(rowData.monthlyGoals),

      // Presupuestos mensuales
      monthlyBudgets: this.createMonthlyBudgets(rowData.monthlyBudgets)
    };

    return activity;
  }

  /**
   * Crea los objetos MonthlyGoal a partir de un array de valores
   * @param values Array de valores mensuales
   * @returns Array de MonthlyGoal
   */
  private createMonthlyGoals(values: number[]): MonthlyGoal[] {
    return values.map((value, index) => ({
      goalOrder: index + 1, // Enero = 1, Febrero = 2, etc.
      value: value,
      active: true
    } as MonthlyGoal));
  }

  /**
   * Crea los objetos MonthlyBudget a partir de un array de valores
   * @param values Array de valores mensuales
   * @returns Array de MonthlyBudget
   */
  private createMonthlyBudgets(values: number[]): MonthlyBudget[] {
    return values.map((value, index) => ({
      budgetOrder: index + 1, // Enero = 1, Febrero = 2, etc.
      value: value,
      active: true
    } as MonthlyBudget));
  }

  /**
   * Busca una familia existente por nombre o crea una nueva
   * @param familyName Nombre de la familia
   * @returns Observable con la familia encontrada o creada
   */
  private createOrFindActivityFamily(familyName: string): Observable<ActivityFamily> {
    const existingFamily = this.findExistingFamily(familyName);
    if (existingFamily) {
      return of(existingFamily);
    }

    // Crear nueva familia SOLO tipo 'salud'
    const newFamily: ActivityFamily = {
      name: familyName,
      description: `Familia creada automáticamente: ${familyName}`,
      active: true,
      type: 'salud'
    };

    return this.activityFamilyService.create(newFamily);
  }

  /**
   * Busca una familia existente en el cache
   * @param familyName Nombre de la familia
   * @returns Familia encontrada o undefined
   */
  private findExistingFamily(familyName: string): ActivityFamily | undefined {
    if (!familyName) return undefined;
    return this.activityFamiliesCache.find(family => 
      family.name.toLowerCase().trim() === familyName.toLowerCase().trim()
    );
  }

  /**
   * Extrae valores mensuales de un rango de columnas
   * @param row Fila de Excel
   * @param startCol Columna inicial
   * @param endCol Columna final
   * @returns Array de valores numéricos
   */
  private extractMonthlyValues(row: ExcelJS.Row, startCol: number, endCol: number): number[] {
    const values: number[] = [];
    for (let col = startCol; col <= endCol; col++) {
      values.push(this.parseNumber(this.getCellValue(row, col)));
    }
    return values;
  }

  /**
   * Obtiene el valor de una celda
   * @param row Fila de Excel
   * @param col Número de columna
   * @returns Valor de la celda
   */
  private getCellValue(row: ExcelJS.Row, col: number): any {
    const cell = row.getCell(col);
    if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
      // Si es una celda con fórmula, devolver el resultado calculado
      return (cell.value as any).result;
    }
    return cell.value;
  }

  /**
   * Verifica si una fila está vacía
   * @param row Fila de Excel
   * @returns true si la fila está vacía
   */
  private isEmptyRow(row: ExcelJS.Row): boolean {
    // Verificar las primeras columnas importantes
    const name = this.getCellValue(row, 12)?.toString().trim();
    const agrupFonafe = this.getCellValue(row, 1)?.toString().trim();
    return !name && !agrupFonafe;
  }

  /**
   * Convierte un valor a booleano considerando variaciones de sí/no
   * @param value Valor a convertir
   * @returns Valor booleano
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (!value) return false;
    
    const strValue = value.toString().toLowerCase().trim();
    const yesValues = ['sí', 'si', 'yes', 'y', 'true', '1', 'verdadero', 'fonafe'];
    return yesValues.includes(strValue);
  }

  /**
   * Convierte un valor a número
   * @param value Valor a convertir
   * @returns Valor numérico
   */
  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const numValue = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(numValue) ? 0 : numValue;
  }
  
}
