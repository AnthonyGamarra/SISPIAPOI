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
export class ProcessOODDService {

  constructor(
    private formulationService: FormulationService,
    private dependencyService: DependencyService,
    private activityDetailService: ActivityDetailService,
    private operationalActivityService: OperationalActivityService,
    private toastr: ToastrService
  ) { }

  processInitiateFormulationOODDGestion(selectedYear: number): Observable<any> {
    return new Observable(observer => {
      // Primero obtener todas las dependencias OODDGestion con ospe = false
      this.dependencyService.getAll().subscribe({
        next: (allDependencies: Dependency[]) => {
          const OODDGestionDependencies = allDependencies.filter(dep => 
            dep.dependencyType?.idDependencyType === 2 && 
            dep.ospe === false
          );

          if (OODDGestionDependencies.length === 0) {
            this.toastr.warning('No se encontraron dependencias OODDGestion para crear formulaciones.', 'Advertencia');
            observer.error('No se encontraron dependencias OODDGestion');
            return;
          }

          // Crear formulaciones para todas las dependencias OODDGestion
          const formulationCreationRequests: Observable<Formulation>[] = [];
          const formulationStateInitial = { idFormulationState: 1 } as FormulationState;

          OODDGestionDependencies.forEach(dependency => {
            const newFormulation: Formulation = {
              year: selectedYear,
              dependency: dependency,
              formulationState: formulationStateInitial,
              active: true,
              modification: 1,
              quarter: 1,
              formulationType: { idFormulationType: 2 } // Tipo 2 para OODDGestion
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
                    ad.formulationType?.idFormulationType === 2
                  );

                  if (filteredDetails.length === 0) {
                    this.toastr.success(`Se crearon ${formulationsCreated.length} formulaciones OODDGestion pero no hay actividades de gestión definidas para el año ${selectedYear}.`, 'Formulaciones Creadas');
                    observer.next(formulationsCreated);
                    observer.complete();
                    return;
                  }

                  // Crear actividades operativas basadas en ActivityDetail para cada formulación
                  const operationalActivityCreationRequests: Observable<OperationalActivity>[] = [];

                  formulationsCreated.forEach(formulation => {
                    filteredDetails.forEach(activityDetail => {
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
                        monthlyGoals: newMonthlyGoals
                        // financialFund, managementCenter, costCenter, priority, activityFamily se envían vacíos (opcionales)
                      };

                      operationalActivityCreationRequests.push(this.operationalActivityService.create(operationalActivity));
                    });
                  });

                  if (operationalActivityCreationRequests.length > 0) {
                    forkJoin(operationalActivityCreationRequests).subscribe({
                      next: (activitiesCreated) => {
                        this.toastr.success(
                          `Se crearon ${formulationsCreated.length} formulaciones OODDGestion y ${activitiesCreated.length} actividades operativas correctamente.`,
                          'Éxito Completo'
                        );
                        observer.next({ formulationsCreated, activitiesCreated });
                        observer.complete();
                      },
                      error: (err) => {
                        this.toastr.error('Error al crear las actividades operativas OODDGestion. Verifique que los valores por defecto sean válidos.', 'Error');
                        console.error('Error creating operational activities', err);
                        console.error('Error details:', err.error);
                        observer.error(err);
                      }
                    });
                  } else {
                    this.toastr.success(`Se crearon ${formulationsCreated.length} formulaciones OODDGestion correctamente.`, 'Éxito');
                    observer.next(formulationsCreated);
                    observer.complete();
                  }
                },
                error: (err) => {
                  this.toastr.error('Error al cargar los detalles de actividad.', 'Error');
                  console.error('Error fetching activity details', err);
                  observer.error(err);
                }
              });
            },
            error: (err) => {
              this.toastr.error('Error al crear las formulaciones OODDGestion.', 'Error');
              console.error('Error creating OODDGestion formulations', err);
              observer.error(err);
            }
          });
        },
        error: (err) => {
          this.toastr.error('Error al cargar la lista de dependencias.', 'Error');
          console.error('Error fetching dependencies', err);
          observer.error(err);
        }
      });
    });
  }

  processNewModificationOODDGestion(
    formulations: Formulation[], 
    selectedYear: number, 
    newModificationQuarter: number,
    quarterLabels: { [key: number]: string }
  ): Observable<any> {
    return new Observable(observer => {
      let maxModification = 0;
      // Solo considerar formulaciones OODDGestion y tipo 2 (OODDGestion ACTIVIDADES DE GESTIÓN) con ospe = false
      const OODDGestionFormulations = formulations.filter(f =>
        f.year === selectedYear &&
        f.dependency?.dependencyType?.idDependencyType === 2 &&
        f.formulationType?.idFormulationType === 2 &&
        f.dependency?.ospe === false
      );

      OODDGestionFormulations.forEach(f => {
        if (f.modification && f.modification > maxModification) {
          maxModification = f.modification;
        }
      });

      if (maxModification === 0) {
        this.toastr.warning(`No hay formulaciones OODDGestion para el año ${selectedYear} para generar una modificatoria.`, 'Advertencia');
        observer.error('No hay formulaciones OODDGestion');
        return;
      }

      if (maxModification >= 8) {
        this.toastr.warning(`Ya se ha alcanzado el límite máximo de modificatorias (8) para OODDGestion en el año ${selectedYear}.`, 'Advertencia');
        observer.error('Límite máximo alcanzado');
        return;
      }

      const formulationsToModify = OODDGestionFormulations.filter(
        f => f.modification === maxModification
      );

      if (formulationsToModify.length === 0) {
        this.toastr.warning(`No se encontraron formulaciones OODDGestion con la mayor modificatoria (${maxModification}) para el año ${selectedYear}.`, 'Advertencia');
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
            this.toastr.success(`Se crearon ${results.length} nuevas modificatorias OODDGestion para el trimestre ${quarterLabels[newModificationQuarter]}.`, 'Éxito');
            observer.next(results);
            observer.complete();
          },
          error: (err) => {
            this.toastr.error('Error al crear nuevas modificatorias OODDGestion.', 'Error');
            console.error('Error adding new modifications OODDGestion', err);
            observer.error(err);
          }
        });
      } else {
        this.toastr.info('No hay formulaciones OODDGestion para procesar la nueva modificatoria.', 'Info');
        observer.error('No hay formulaciones para procesar');
      }
    });
  }
}
