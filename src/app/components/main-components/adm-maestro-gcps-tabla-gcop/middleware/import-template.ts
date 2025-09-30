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
import { StrategicObjectiveService } from '../../../../core/services/logic/strategic-objective.service';
import { StrategicActionService } from '../../../../core/services/logic/strategic-action.service';
import { forkJoin, Observable, of, from } from 'rxjs';
import { map, switchMap, catchError, concatMap, delay, retry, retryWhen, take } from 'rxjs/operators';
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
  codRed: string | null;
  descRed: string;
  codCenSes: string;
  desCenSes: string;
  nivelCompl: string;
  nivelAtencion: string;
  activityFamilyName: string;
  codPre: string;
  codTarif: string;
  tarifa: number;
  name: string;
  measurementUnit: string;
  metaProg: number;
  proyCierre: number;
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
  private strategicActionIdCache: number | null = null;

  constructor(
    private toastr: ToastrService,
    private activityFamilyService: ActivityFamilyService,
    private healthOperationalActivityService: HealthOperationalActivityService,
    private formulationService: FormulationService,
    private dependencyService: DependencyService,
    private strategicObjectiveService: StrategicObjectiveService,
    private strategicActionService: StrategicActionService
  ) {}

  /**
   * Establece la formulación actual para las actividades importadas
   */
  setCurrentFormulation(formulation: Formulation): void {
    this.currentFormulation = formulation;
  }

  /**
   * Busca y cachea el ID del Strategic Action con code 1
   * que pertenece al Strategic Objective con code 1 del año especificado
   */
  private getStrategicActionId(year: number): Observable<number> {
    // Si ya está en cache, retornarlo
    if (this.strategicActionIdCache !== null) {
      return of(this.strategicActionIdCache);
    }

    // Buscar Strategic Objective con code "1" para el año (asumiendo que pertenece al año del currentFormulation)
    return this.strategicObjectiveService.getAll().pipe(
      switchMap(strategicObjectives => {
        const strategicObjective = strategicObjectives.find(so => 
          so.code === "1"
        );

        if (!strategicObjective) {
          throw new Error(`No se encontró Strategic Objective con code "1"`);
        }

        // Buscar Strategic Action con code "1" que pertenezca a este Strategic Objective
        return this.strategicActionService.getAll().pipe(
          map(strategicActions => {
            const strategicAction = strategicActions.find(sa => 
              sa.code === "1" && sa.strategicObjective?.idStrategicObjective === strategicObjective.idStrategicObjective
            );

            if (!strategicAction) {
              throw new Error(`No se encontró Strategic Action con code "1" para el Strategic Objective ${strategicObjective.idStrategicObjective}`);
            }

            // Cachear el resultado
            this.strategicActionIdCache = strategicAction.idStrategicAction!;
            return this.strategicActionIdCache;
          })
        );
      })
    );
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
    // Limpiar cache del Strategic Action ID para el nuevo procesamiento
    this.strategicActionIdCache = null;
    
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
                  this.processWorksheetByDependencyOptimized(worksheet, year, 1, onProgress).subscribe({
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
   * Procesa un archivo Excel para crear una nueva modificatoria
   * Usa el modification especificado en lugar del modification por defecto (1)
   */
  processExcelFileWithModification(
    file: File, 
    year: number,
    modification: number,
    onProgress?: (progress: { processed: number; total: number; loading: boolean }) => void
  ): Observable<ImportResult> {
    // Limpiar cache del Strategic Action ID para el nuevo procesamiento
    this.strategicActionIdCache = null;
    
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
                  
                  // Procesar Excel agrupando por codRed con modification específico
                  this.processWorksheetByDependencyOptimized(worksheet, year, modification, onProgress).subscribe({
                    next: (result: ImportResult) => observer.next(result),
                    error: (error: any) => observer.error(error),
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
    modification: number = 1,
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
            const normalizedCodeRed = rowData.codRed;
            let codRedKey = '';
            
            if (!normalizedCodeRed) {
              codRedKey = 'DEPENDENCY_ID_115';
            } else {
              codRedKey = normalizedCodeRed;
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

          this.findOrCreateFormulation(dependencyId, year, modification).subscribe({
            next: (formulation) => {
              this.setCurrentFormulation(formulation);
              
              // Obtener Strategic Action ID antes de crear las actividades
              this.getStrategicActionId(year).subscribe({
                next: (strategicActionId) => {
                  try {
                    const groupActivities: OperationalActivity[] = [];
                    groupRows.forEach((rowData, idx) => {
                      const activity = this.createOperationalActivity(rowData, idx + 1, strategicActionId);
                      groupActivities.push(activity);
                    });

                    // OPTIMIZACIÓN: Guardado en lotes de 20 con delays de 30ms
                    this.saveActivitiesOptimized(groupActivities, result, (processed, total) => {
                      // Calcular progreso global considerando todas las actividades de todos los grupos
                      const globalProcessed = processedActivities + processed;
                      if (onProgress) {
                        onProgress({ 
                          processed: Math.min(globalProcessed, totalActivities),
                          total: totalActivities, 
                          loading: groupIndex + 1 < dependencyGroups.length || processed < total
                        });
                      }
                    }).subscribe({
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
                        
                        
                        // Forzar limpieza de memoria para evitar Out of Memory
                        if ((window as any).gc) {
                          (window as any).gc();
                        }
                        
                        // Delay de 100ms entre grupos para garantizar integridad
                        setTimeout(() => processNextGroup(groupIndex + 1), 100);
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
                  result.errors.push(`Error al obtener Strategic Action ID: ${error.message}`);
                  processNextGroup(groupIndex + 1);
                }
              });
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
   * MÉTODO OPTIMIZADO para guardar actividades en LOTES DE 5
   * Balance entre velocidad e integridad de datos
   */
  private saveActivitiesOptimized(
    activities: OperationalActivity[], 
    result: ImportResult,
    onProgress?: (processed: number, total: number) => void
  ): Observable<OperationalActivity[]> {
    const BATCH_SIZE = 20; // 20 actividades simultáneas
    let allSavedActivities: OperationalActivity[] = [];
    let currentBatchIndex = 0;
    
    return new Observable<OperationalActivity[]>(observer => {
      const saveNextBatch = () => {
        const startIndex = currentBatchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, activities.length);
        
        if (startIndex >= activities.length) {
          observer.next(allSavedActivities);
          observer.complete();
          return;
        }
        
        const currentBatch = activities.slice(startIndex, endIndex);
        
        // Procesar 5 actividades en paralelo
        const saveObservables = currentBatch.map((activity, index) => 
          this.healthOperationalActivityService.create(activity as any).pipe(
            retry(3),
            catchError(error => {
              result.errors.push(`Error al guardar actividad "${activity.name}": ${error.message}`);
              return of(null);
            }),
            map(savedActivity => {
              if (savedActivity) {
                return savedActivity;
              }
              return null;
            })
          )
        );
        
        // Ejecutar las 5 actividades en paralelo
        forkJoin(saveObservables).subscribe({
          next: (batchResults) => {
            // Filtrar nulls y agregar actividades guardadas exitosamente
            const savedInBatch = batchResults.filter(activity => activity !== null) as OperationalActivity[];
            allSavedActivities = allSavedActivities.concat(savedInBatch);
            
            // Reportar progreso actualizado
            if (onProgress) {
              onProgress(allSavedActivities.length, activities.length);
            }
            
            
            currentBatchIndex++;
            
            // Delay de 30ms entre lotes
            setTimeout(() => saveNextBatch(), 30);
          },
          error: (error) => {
            result.errors.push(`Error crítico en lote ${currentBatchIndex + 1}: ${error.message}`);
            currentBatchIndex++;
            setTimeout(() => saveNextBatch(), 100); // Delay mayor en caso de error
          }
        });
      };
      
      saveNextBatch();
    });
  }

  /**
   * Normaliza el código de red para evitar valores problemáticos
   */
  private normalizeCodeRed(codRed: string | null | undefined): string | null {
    if (!codRed) return null;
    
    const trimmed = codRed.trim();
    
    // Lista de valores problemáticos que deben convertirse a null
    const invalidValues = [
      'N/A', 'n/a', 'N/D', 'n/d', '#N/D', '#N/A', '#n/d', '#n/a',
      'undefined', 'null', 'NULL', 'Null', 'UNDEFINED',
      '[object Object]', '{object Object}', 'object Object',
      '', ' ', '  ', 'NaN', 'nan', 'NAN'
    ];
    
    // Verificar si es un valor inválido
    if (invalidValues.includes(trimmed) || trimmed === '') {
      return null;
    }
    
    // Verificar si parece ser un objeto serializado mal
    if (trimmed.startsWith('[object') || trimmed.startsWith('{object')) {
      return null;
    }
    
    return trimmed;
  }

  // Métodos auxiliares (iguales que en la versión original)
  private extractRowData(row: ExcelJS.Row, rowIndex: number): ExcelRowData | null {
    try {
      const name = this.getCellValue(row, 13)?.toString().trim();
      if (!name) {
        throw new Error('Nombre de actividad es obligatorio');
      }

      return {
        agrupFonafe: this.getCellValue(row, 1)?.toString() || '',
        poi: this.parseBoolean(this.getCellValue(row, 2)),
        codRed: this.normalizeCodeRed(this.getCellValue(row, 3)?.toString()),
        descRed: this.getCellValue(row, 4)?.toString() || '',
        codCenSes: this.getCellValue(row, 5)?.toString() || '',
        desCenSes: this.getCellValue(row, 6)?.toString() || '',
        nivelCompl: this.getCellValue(row, 7)?.toString() || '',
        nivelAtencion: this.getCellValue(row, 8)?.toString() || '',
        activityFamilyName: this.getCellValue(row, 9)?.toString() || '',
        codPre: this.getCellValue(row, 10)?.toString() || '',
        codTarif: this.getCellValue(row, 11)?.toString() || '',
        tarifa: this.parseNumber(this.getCellValue(row, 12)),
        name: name,
        measurementUnit: this.getCellValue(row, 14)?.toString() || '',
        metaProg: this.parseNumber(this.getCellValue(row, 15)),
        proyCierre: this.parseNumber(this.getCellValue(row, 16)),
        monthlyGoals: this.extractMonthlyValues(row, 17, 28),
        monthlyBudgets: this.extractMonthlyValues(row, 29, 40)
      };
    } catch (error) {
      throw new Error(`Error en fila ${rowIndex}: ${(error as Error).message}`);
    }
  }

  private createOperationalActivity(rowData: ExcelRowData, correlativeIndex: number, strategicActionId: number): OperationalActivity {
    return {
      strategicAction: { idStrategicAction: strategicActionId } as any,
      correlativeCode: `S`,
      name: rowData.name,
      description: `Actividad de salud: ${rowData.name}`,
      measurementUnit: rowData.measurementUnit,
      goods: 0,
      remuneration: 0,
      services: 0,
      active: true,
      formulation: this.currentFormulation || {} as Formulation,
      agrupFonafe: rowData.agrupFonafe,
      poi: rowData.poi,
      codRed: rowData.codRed || undefined,
      descRed: rowData.descRed,
      codCenSes: rowData.codCenSes,
      desCenSes: rowData.desCenSes,
      nivelCompl: rowData.nivelCompl,
      nivelAtencion: rowData.nivelAtencion,
      codPre: rowData.codPre,
      codTarif: rowData.codTarif,
      metaProg: rowData.metaProg,
      proyCierre: rowData.proyCierre,
      tarifa: rowData.tarifa,
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
    const name = this.getCellValue(row, 13)?.toString().trim();
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

  private findOrCreateFormulation(dependencyId: number, year: number, modification: number = 1): Observable<Formulation> {
    return this.formulationService.searchByDependencyAndYear(dependencyId, year).pipe(
      switchMap((formulations) => {
        const existingFormulation = formulations.find(f => 
          f.formulationState?.idFormulationState === 1 &&
          f.modification === modification &&
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
          modification: modification,
          quarter: 1,
          formulationType: { idFormulationType: 3 } as any,
          active: true
        };

        return this.formulationService.create(newFormulation);
      })
    );
  }
}
