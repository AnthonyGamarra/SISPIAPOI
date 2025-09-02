import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import * as ExcelJS from 'exceljs';
import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { ActivityFamily } from '../../../../models/logic/activityFamily.model';
import { MonthlyGoal } from '../../../../models/logic/monthlyGoal.model';
import { MonthlyBudget } from '../../../../models/logic/monthlyBudget.model';
import { Formulation } from '../../../../models/logic/formulation.model';
import { Dependency } from '../../../../models/logic/dependency.model';
import { ActivityFamilyService } from '../../../../core/services/logic/activity-family.service';
import { HealthOperationalActivityService } from '../../../../core/services/logic/health-operational-activity.service';
import { DependencyService } from '../../../../core/services/logic/dependency.service';
import { forkJoin, Observable, of, from } from 'rxjs';
import { map, switchMap, catchError, concatMap, delay } from 'rxjs/operators';
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
  private dependenciesCache: Dependency[] = [];
  private currentFormulation: Formulation | null = null;

  constructor(
    private toastr: ToastrService,
    private activityFamilyService: ActivityFamilyService,
    private healthOperationalActivityService: HealthOperationalActivityService,
    private formulationService: FormulationService,
    private dependencyService: DependencyService
  ) {}

  /**
   * Establece la formulación actual para las actividades importadas
   */
  setCurrentFormulation(formulation: Formulation): void {
    this.currentFormulation = formulation;
  }

  /**
   * Procesa un archivo Excel y convierte las filas en actividades operacionales de salud
   * VERSIÓN OPTIMIZADA para mayor velocidad
   */
  processExcelFile(
    file: File, 
    year: number,
    onProgress?: (progress: { processed: number; total: number; loading: boolean }) => void
  ): Observable<ImportResult> {
    return new Observable<ImportResult>(observer => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.getWorksheet(1);
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

          // Cargar dependencies y procesar Excel por grupos de codRed
          this.dependencyService.getAll().subscribe({
            next: (dependencies) => {
              this.dependenciesCache = dependencies;
              
              // Cargar familias de actividades SOLO tipo 'salud'
              this.activityFamilyService.getAll().subscribe({
                next: (families) => {
                  this.activityFamiliesCache = families.filter(f => (f.type || '').toLowerCase() === 'salud');
                  
                  // Procesar Excel agrupando por codRed con optimizaciones
                  this.processWorksheetByDependencyOptimized(worksheet, year, onProgress).subscribe({
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
            },
            error: (error) => {
              observer.next({
                success: false,
                totalRows: 0,
                processedRows: 0,
                errors: ['Error al cargar dependencies: ' + error.message],
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
   * VERSIÓN OPTIMIZADA del procesamiento por dependency
   * Mejoras: lotes más grandes, delays reducidos, mejor manejo de errores
   */
  private processWorksheetByDependencyOptimized(
    worksheet: ExcelJS.Worksheet, 
    year: number,
    onProgress?: (progress: { processed: number; total: number; loading: boolean }) => void
  ): Observable<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      processedRows: 0,
      errors: [],
      activities: []
    };

    try {
      // Extraer todas las filas y agrupar por codRed
      const totalRows = worksheet.rowCount;
      result.totalRows = Math.max(0, totalRows - 2);
      
      const rowsByDependency = new Map<string, ExcelRowData[]>();
      
      for (let rowIndex = 3; rowIndex <= totalRows; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        if (this.isEmptyRow(row)) continue;
        
        try {
          const rowData = this.extractRowData(row, rowIndex);
          if (rowData) {
            const codRed = rowData.codRed?.trim();
            let codRedKey = '';
            
            if (!codRed || codRed === 'N/A' || codRed === 'undefined' || codRed === '[object Object]' || codRed === '') {
              codRedKey = 'DEPENDENCY_ID_115';
            } else {
              codRedKey = codRed;
            }
            
            if (!rowsByDependency.has(codRedKey)) {
              rowsByDependency.set(codRedKey, []);
            }
            rowsByDependency.get(codRedKey)!.push(rowData);
          }
        } catch (error) {
          result.errors.push(`Fila ${rowIndex}: ${(error as Error).message}`);
        }
      }

      // Procesar cada grupo de dependency
      return new Observable<ImportResult>(observer => {
        const dependencyGroups = Array.from(rowsByDependency.entries());
        let processedGroups = 0;
        let allActivities: OperationalActivity[] = [];
        let hasError = false;
        
        const totalActivities = Array.from(rowsByDependency.values()).reduce((sum, rows) => sum + rows.length, 0);
        let processedActivities = 0;
        
        console.log(`🚀 Importación optimizada iniciada: ${totalActivities} actividades en ${dependencyGroups.length} grupos`);
        console.log(`⏱️ Tiempo estimado: ${Math.ceil(dependencyGroups.length * 0.4)} segundos`);
        
        if (onProgress && totalActivities > 0) {
          onProgress({ processed: 0, total: totalActivities, loading: true });
        }

        const processNextGroup = (groupIndex: number) => {
          if (hasError || groupIndex >= dependencyGroups.length) {
            result.activities = allActivities;
            result.processedRows = allActivities.length;
            result.success = result.errors.length === 0;
            
            if (onProgress) {
              onProgress({ processed: Math.min(processedActivities, totalActivities), total: totalActivities, loading: false });
            }
            
            console.log(`✅ Importación completada: ${allActivities.length} actividades guardadas`);
            observer.next(result);
            observer.complete();
            return;
          }

          const [codRed, groupRows] = dependencyGroups[groupIndex];
          
          let dependency: Dependency | undefined;
          let dependencyId: number;
          
          if (codRed === 'DEPENDENCY_ID_115') {
            dependencyId = 115;
            dependency = { idDependency: 115, name: 'Sin Código Red Asignado' } as Dependency;
          } else {
            dependency = this.findDependencyByDescription(codRed);
            if (!dependency) {
              result.errors.push(`No se encontró dependency con description: "${codRed}"`);
              processNextGroup(groupIndex + 1);
              return;
            }
            dependencyId = dependency.idDependency!;
          }

          this.findOrCreateFormulation(dependencyId, year).subscribe({
            next: (formulation) => {
              this.setCurrentFormulation(formulation);
              
              try {
                const groupActivities: OperationalActivity[] = [];
                groupRows.forEach((rowData, idx) => {
                  const activity = this.createOperationalActivity(rowData, idx + 1);
                  groupActivities.push(activity);
                });

                // OPTIMIZACIÓN: Guardado en lotes más grandes con delays reducidos
                this.saveActivitiesOptimized(groupActivities, result).subscribe({
                  next: (savedActivities) => {
                    allActivities = allActivities.concat(savedActivities);
                    processedGroups++;
                    
                    processedActivities += savedActivities.length; // Usar actividades realmente guardadas
                    if (onProgress) {
                      onProgress({ 
                        processed: Math.min(processedActivities, totalActivities), // Nunca exceder el total
                        total: totalActivities, 
                        loading: groupIndex + 1 < dependencyGroups.length 
                      });
                    }
                    
                    console.log(`✅ Grupo ${codRed}: ${savedActivities.length}/${groupRows.length} actividades guardadas`);
                    
                    // Delay mínimo entre grupos para mayor velocidad
                    setTimeout(() => processNextGroup(groupIndex + 1), 30);
                  },
                  error: (error) => {
                    result.errors.push(`Error al guardar grupo ${codRed}: ${error.message}`);
                    hasError = true;
                    
                    if (onProgress) {
                      onProgress({ processed: processedActivities, total: totalActivities, loading: false });
                    }
                    
                    observer.next({ ...result, success: false });
                    observer.complete();
                  }
                });
              } catch (error) {
                result.errors.push(`Error al procesar grupo ${codRed}: ${(error as Error).message}`);
                processNextGroup(groupIndex + 1);
              }
            },
            error: (error) => {
              result.errors.push(`Error al obtener formulación para ${codRed}: ${error.message}`);
              processNextGroup(groupIndex + 1);
            }
          });
        };

        processNextGroup(0);
      });

    } catch (error) {
      result.success = false;
      result.errors.push('Error al procesar la hoja: ' + (error as Error).message);
      return of(result);
    }
  }

  /**
   * MÉTODO OPTIMIZADO para guardar actividades en lotes
   * Mejoras: lotes de 50 actividades, delay de solo 10ms entre lotes
   */
  private saveActivitiesOptimized(
    activities: OperationalActivity[], 
    result: ImportResult
  ): Observable<OperationalActivity[]> {
    const batchSize = 40; // Lotes más grandes para mayor velocidad
    const batches: OperationalActivity[][] = [];
    
    for (let i = 0; i < activities.length; i += batchSize) {
      batches.push(activities.slice(i, i + batchSize));
    }
    
    let allSavedActivities: OperationalActivity[] = [];
    
    return from(batches).pipe(
      concatMap((batch, batchIndex) => {
        const saveObservables = batch.map(activity =>
          this.healthOperationalActivityService.create(activity as any).pipe(
            catchError(error => {
              result.errors.push(`Error al guardar actividad "${activity.name}": ${error.message}`);
              return of(null);
            })
          )
        );
        
        return forkJoin(saveObservables).pipe(
          delay(batchIndex === 0 ? 0 : 20), // Delay mínimo para mayor velocidad
          map(savedBatch => {
            const validSaved = savedBatch.filter(a => !!a) as OperationalActivity[];
            allSavedActivities = allSavedActivities.concat(validSaved);
            return validSaved;
          })
        );
      }),
      switchMap(() => of(allSavedActivities))
    );
  }

  // Métodos auxiliares (iguales que en la versión original)
  private extractRowData(row: ExcelJS.Row, rowIndex: number): ExcelRowData | null {
    try {
      const name = this.getCellValue(row, 12)?.toString().trim();
      if (!name) {
        throw new Error('Nombre de actividad es obligatorio');
      }

      return {
        agrupFonafe: this.getCellValue(row, 1)?.toString() || '',
        poi: this.parseBoolean(this.getCellValue(row, 2)),
        codRed: this.getCellValue(row, 3)?.toString().trim() || '',
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
        monthlyGoals: this.extractMonthlyValues(row, 19, 30),
        monthlyBudgets: this.extractMonthlyValues(row, 31, 42)
      };
    } catch (error) {
      throw new Error(`Error en fila ${rowIndex}: ${(error as Error).message}`);
    }
  }

  private createOperationalActivity(rowData: ExcelRowData, correlativeIndex: number): OperationalActivity {
    return {
      correlativeCode: `H`,
      name: rowData.name,
      description: `Actividad de salud: ${rowData.name}`,
      measurementUnit: 'Unidad',
      goods: 0,
      remuneration: 0,
      services: 0,
      active: true,
      formulation: this.currentFormulation || {} as Formulation,
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
      activityFamily: this.findExistingFamily(rowData.activityFamilyName),
      monthlyGoals: this.createMonthlyGoals(rowData.monthlyGoals),
      monthlyBudgets: this.createMonthlyBudgets(rowData.monthlyBudgets)
    };
  }

  private createMonthlyGoals(values: number[]): MonthlyGoal[] {
    return values.map((value, index) => ({
      goalOrder: index + 1,
      value: value,
      active: true
    } as MonthlyGoal));
  }

  private createMonthlyBudgets(values: number[]): MonthlyBudget[] {
    return values.map((value, index) => ({
      budgetOrder: index + 1,
      value: value,
      active: true
    } as MonthlyBudget));
  }

  private findExistingFamily(familyName: string): ActivityFamily | undefined {
    if (!familyName) return undefined;
    return this.activityFamiliesCache.find(family => 
      family.name.toLowerCase().trim() === familyName.toLowerCase().trim()
    );
  }

  private extractMonthlyValues(row: ExcelJS.Row, startCol: number, endCol: number): number[] {
    const values: number[] = [];
    for (let col = startCol; col <= endCol; col++) {
      values.push(this.parseNumber(this.getCellValue(row, col)));
    }
    return values;
  }

  private getCellValue(row: ExcelJS.Row, col: number): any {
    try {
      const cell = row.getCell(col);
      
      if (!cell || cell.value === null || cell.value === undefined) {
        return '';
      }
      
      if (cell.value && typeof cell.value === 'object') {
        if ('formula' in cell.value) {
          return (cell.value as any).result || '';
        }
        return cell.value.toString();
      }
      
      return cell.value;
    } catch (error) {
      console.warn(`Error obteniendo valor de celda [${col}]:`, error);
      return '';
    }
  }

  private isEmptyRow(row: ExcelJS.Row): boolean {
    const name = this.getCellValue(row, 12)?.toString().trim();
    const agrupFonafe = this.getCellValue(row, 1)?.toString().trim();
    return !name && !agrupFonafe;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (!value) return false;
    
    const strValue = value.toString().toLowerCase().trim();
    const yesValues = ['sí', 'si', 'yes', 'y', 'true', '1', 'verdadero', 'fonafe'];
    return yesValues.includes(strValue);
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const numValue = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(numValue) ? 0 : numValue;
  }

  private findDependencyByDescription(description: string): Dependency | undefined {
    if (!description) return undefined;
    return this.dependenciesCache.find(dep => 
      dep.description && dep.description.trim().toLowerCase() === description.trim().toLowerCase()
    );
  }

  private findOrCreateFormulation(dependencyId: number, year: number): Observable<Formulation> {
    return this.formulationService.searchByDependencyAndYear(dependencyId, year).pipe(
      switchMap((formulations) => {
        const existingFormulation = formulations.find(f => 
          f.formulationState?.idFormulationState === 1 &&
          f.modification === 1 &&
          f.quarter === 1 &&
          f.formulationType?.idFormulationType === 3
        );

        if (existingFormulation) {
          return of(existingFormulation);
        }

        const newFormulation: Formulation = {
          dependency: { idDependency: dependencyId } as any,
          formulationState: { idFormulationState: 1 } as any,
          year: year,
          modification: 1,
          quarter: 1,
          formulationType: { idFormulationType: 3 } as any,
          active: true
        };

        return this.formulationService.create(newFormulation);
      })
    );
  }
}
