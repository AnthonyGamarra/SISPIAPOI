import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { FormulationService } from '../services/logic/formulation.service';
import { DependencyService } from '../services/logic/dependency.service';
import { ActivityDetailService } from '../services/logic/activity-detail.service';
import { OperationalActivityService } from '../services/logic/operational-activity.service';
import { Formulation } from '../../models/logic/formulation.model';
import { FormulationState } from '../../models/logic/formulationState.model';
import { Dependency } from '../../models/logic/dependency.model';
import { ActivityDetail } from '../../models/logic/activityDetail.model';
import { OperationalActivity } from '../../models/logic/operationalActivity.model';

@Injectable({
  providedIn: 'root'
})
export class ProcessPSOService {

  constructor(
    private formulationService: FormulationService,
    private dependencyService: DependencyService,
    private activityDetailService: ActivityDetailService,
    private operationalActivityService: OperationalActivityService,
    private toastr: ToastrService
  ) { }

  processInitiateFormulationPrestacionesSociales(selectedYear: number): Observable<any> {
    return new Observable(observer => {
      // Primero obtener todas las dependencias OODD con ospe = false (prestaciones sociales)
      this.dependencyService.getAll().subscribe({
        next: (allDependencies: Dependency[]) => {
          const prestacionesSocialesDependencies = allDependencies.filter(dep => 
            dep.dependencyType?.idDependencyType === 2 && 
            dep.ospe === false
          );

          if (prestacionesSocialesDependencies.length === 0) {
            this.toastr.warning('No se encontraron dependencias OODD con ospe = false para crear formulaciones de Prestaciones Sociales.', 'Advertencia');
            observer.error('No se encontraron dependencias');
            return;
          }

          // Crear formulaciones para todas las dependencias de Prestaciones Sociales
          const formulationCreationRequests: Observable<Formulation>[] = [];
          const formulationStateInitial = { idFormulationState: 1 } as FormulationState;

          prestacionesSocialesDependencies.forEach(dependency => {
            const newFormulation: Formulation = {
              year: selectedYear,
              dependency: dependency,
              formulationState: formulationStateInitial,
              active: true,
              modification: 1,
              quarter: 1,
              formulationType: { idFormulationType: 5 } // Tipo 5 para Prestaciones Sociales
            };
            formulationCreationRequests.push(this.formulationService.create(newFormulation));
          });

          // Ejecutar creación de formulaciones
          forkJoin(formulationCreationRequests).subscribe({
            next: (formulationsCreated) => {
              // Ahora obtener los ActivityDetail del año seleccionado para crear actividades operativas
              this.activityDetailService.getAll().subscribe({
                next: (activityDetails: ActivityDetail[]) => {
                  const filteredDetails = activityDetails.filter(ad =>
                    ad.year === selectedYear &&
                    ad.formulationType?.idFormulationType === 5
                  );

                  if (filteredDetails.length === 0) {
                    this.toastr.success(`Se crearon ${formulationsCreated.length} formulaciones de Prestaciones Sociales pero no hay actividades de prestaciones sociales definidas para el año ${selectedYear}.`, 'Formulaciones Creadas');
                    observer.next(formulationsCreated);
                    observer.complete();
                    return;
                  }

                  // Agrupar actividades por activityFamily
                  const activitiesByFamily = this.groupActivitiesByFamily(filteredDetails);
                  
                  // Crear actividades operativas basadas en ActivityDetail para cada formulación
                  const operationalActivityCreationRequests: Observable<OperationalActivity>[] = [];

                  formulationsCreated.forEach(formulation => {
                    // Iterar por cada familia de actividades
                    Object.keys(activitiesByFamily).forEach(familyName => {
                      const familyActivities = activitiesByFamily[familyName];
                      
                      familyActivities.forEach(activityDetail => {
                        // Crear nuevos goals sin ID para evitar el error de entidad detached
                        const newGoals = (activityDetail.goals || []).map(goal => ({
                          goalOrder: goal.goalOrder,
                          value: goal.value,
                          active: goal.active || true
                          // NO incluir idGoal para crear nuevos goals
                        }));

                        // Crear nuevos monthlyGoals sin ID
                        const newMonthlyGoals = (activityDetail.monthlyGoals || []).map(monthlyGoal => ({
                          goalOrder: monthlyGoal.goalOrder,
                          value: monthlyGoal.value,
                          active: monthlyGoal.active || true
                          // NO incluir idMonthlyGoal para crear nuevos monthlyGoals
                        }));

                        const operationalActivity: OperationalActivity = {
                          sapCode: '', // Se generará automáticamente en el backend
                          correlativeCode: '', // Se generará automáticamente en el backend
                          name: activityDetail.name,
                          description: activityDetail.description || '',
                          active: true,
                          strategicAction: activityDetail.strategicAction, // Usar directamente el strategicAction del activityDetail
                          formulation: {
                            idFormulation: formulation.idFormulation
                          } as any,
                          measurementType: activityDetail.measurementUnit ? {
                            idMeasurementType: 1
                          } as any : undefined,
                          measurementUnit: activityDetail.measurementUnit || '',
                          goods: 0,
                          remuneration: 0,
                          services: 0,
                          goals: newGoals,
                          monthlyGoals: newMonthlyGoals,
                          activityFamily: activityDetail.activityFamily // Incluir la familia de actividad
                          // financialFund, managementCenter, costCenter, priority se envían vacíos (opcionales)
                        };

                        operationalActivityCreationRequests.push(this.operationalActivityService.create(operationalActivity));
                      });
                    });
                  });

                  if (operationalActivityCreationRequests.length > 0) {
                    forkJoin(operationalActivityCreationRequests).subscribe({
                      next: (activitiesCreated) => {
                        this.toastr.success(
                          `Se crearon ${formulationsCreated.length} formulaciones de Prestaciones Sociales y ${activitiesCreated.length} actividades operativas correctamente, agrupadas por ${Object.keys(activitiesByFamily).length} familias de actividades.`,
                          'Éxito Completo'
                        );
                        observer.next({ formulationsCreated, activitiesCreated, familiesCount: Object.keys(activitiesByFamily).length });
                        observer.complete();
                      },
                      error: (err) => {
                        this.toastr.error('Error al crear las actividades operativas de Prestaciones Sociales. Verifique que los valores por defecto sean válidos.', 'Error');
                        console.error('Error creating operational activities for Prestaciones Sociales', err);
                        console.error('Error details:', err.error);
                        observer.error(err);
                      }
                    });
                  } else {
                    this.toastr.success(`Se crearon ${formulationsCreated.length} formulaciones de Prestaciones Sociales correctamente.`, 'Éxito');
                    observer.next(formulationsCreated);
                    observer.complete();
                  }
                },
                error: (err) => {
                  this.toastr.error('Error al cargar los detalles de actividad para Prestaciones Sociales.', 'Error');
                  console.error('Error fetching activity details for Prestaciones Sociales', err);
                  observer.error(err);
                }
              });
            },
            error: (err) => {
              this.toastr.error('Error al crear las formulaciones de Prestaciones Sociales.', 'Error');
              console.error('Error creating Prestaciones Sociales formulations', err);
              observer.error(err);
            }
          });
        },
        error: (err) => {
          this.toastr.error('Error al cargar la lista de dependencias para Prestaciones Sociales.', 'Error');
          console.error('Error fetching dependencies for Prestaciones Sociales', err);
          observer.error(err);
        }
      });
    });
  }

  processNewModificationPrestacionesSociales(
    formulations: Formulation[], 
    selectedYear: number, 
    newModificationQuarter: number,
    quarterLabels: { [key: number]: string }
  ): Observable<any> {
    return new Observable(observer => {
      let maxModification = 0;
      // Solo considerar formulaciones Prestaciones Sociales (tipo 2, tipo 5) con ospe = false
      const prestacionesSocialesFormulations = formulations.filter(f =>
        f.year === selectedYear &&
        f.dependency?.dependencyType?.idDependencyType === 2 &&
        f.formulationType?.idFormulationType === 5 &&
        f.dependency?.ospe === false
      );

      prestacionesSocialesFormulations.forEach(f => {
        if (f.modification && f.modification > maxModification) {
          maxModification = f.modification;
        }
      });

      if (maxModification === 0) {
        this.toastr.warning(`No hay formulaciones de Prestaciones Sociales para el año ${selectedYear} para generar una modificatoria.`, 'Advertencia');
        observer.error('No hay formulaciones de Prestaciones Sociales');
        return;
      }

      if (maxModification >= 8) {
        this.toastr.warning(`Ya se ha alcanzado el límite máximo de modificatorias (8) para Prestaciones Sociales en el año ${selectedYear}.`, 'Advertencia');
        observer.error('Límite máximo alcanzado');
        return;
      }

      const formulationsToModify = prestacionesSocialesFormulations.filter(
        f => f.modification === maxModification
      );

      if (formulationsToModify.length === 0) {
        this.toastr.warning(`No se encontraron formulaciones de Prestaciones Sociales con la mayor modificatoria (${maxModification}) para el año ${selectedYear}.`, 'Advertencia');
        observer.error('No se encontraron formulaciones');
        return;
      }

      const modificationRequests: Observable<Formulation>[] = [];
      formulationsToModify.forEach(formulation => {
        if (formulation.idFormulation !== undefined) {
          modificationRequests.push(
            this.formulationService.addModification(formulation.idFormulation, newModificationQuarter)
          );
        }
      });

      if (modificationRequests.length > 0) {
        forkJoin(modificationRequests).subscribe({
          next: (results) => {
            this.toastr.success(`Se crearon ${results.length} nuevas modificatorias para Prestaciones Sociales para el trimestre ${quarterLabels[newModificationQuarter]}.`, 'Éxito');
            observer.next(results);
            observer.complete();
          },
          error: (err) => {
            this.toastr.error('Error al crear nuevas modificatorias para Prestaciones Sociales.', 'Error');
            console.error('Error adding new modifications Prestaciones Sociales', err);
            observer.error(err);
          }
        });
      } else {
        this.toastr.info('No hay formulaciones de Prestaciones Sociales para procesar la nueva modificatoria.', 'Info');
        observer.error('No hay formulaciones para procesar');
      }
    });
  }

  /**
   * Agrupa las actividades por familia de actividades
   * @param activities Lista de ActivityDetail
   * @returns Objeto agrupado por nombre de familia
   */
  private groupActivitiesByFamily(activities: ActivityDetail[]): { [familyName: string]: ActivityDetail[] } {
    const grouped: { [familyName: string]: ActivityDetail[] } = {};
    
    activities.forEach(activity => {
      const familyName = activity.activityFamily?.name || 'Sin Familia';
      
      if (!grouped[familyName]) {
        grouped[familyName] = [];
      }
      
      grouped[familyName].push(activity);
    });
    
    return grouped;
  }
}
