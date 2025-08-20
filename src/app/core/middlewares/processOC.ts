import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { FormulationService } from '../services/logic/formulation.service';
import { DependencyService } from '../services/logic/dependency.service';
import { Formulation } from '../../models/logic/formulation.model';
import { FormulationState } from '../../models/logic/formulationState.model';
import { Dependency } from '../../models/logic/dependency.model';

@Injectable({
  providedIn: 'root'
})
export class ProcessOCService {

  constructor(
    private formulationService: FormulationService,
    private dependencyService: DependencyService,
    private toastr: ToastrService
  ) { }

  processInitiateFormulationOC(selectedYear: number): Observable<any> {
    return new Observable(observer => {
      this.dependencyService.getAll().subscribe({
        next: (allDependencies: Dependency[]) => {
          const creationRequests: Observable<Formulation>[] = [];
          const formulationStateInitial = { idFormulationState: 1 } as FormulationState;

          // Filtrar solo dependencias OC
          const ocDependencies = allDependencies.filter(dep => dep.dependencyType?.idDependencyType === 1);

          ocDependencies.forEach(dependency => {
            const newFormulation: Formulation = {
              year: selectedYear,
              dependency: dependency,
              formulationState: formulationStateInitial,
              active: true,
              modification: 1,
              quarter: 1,
              formulationType: { idFormulationType: 1 } // Asegurar tipo 1
            };
            creationRequests.push(this.formulationService.create(newFormulation));
          });

          forkJoin(creationRequests).subscribe({
            next: (results) => {
              this.toastr.success(`Se crearon ${results.length} formulaciones iniciales OC correctamente.`, 'Éxito');
              observer.next(results);
              observer.complete();
            },
            error: (err) => {
              this.toastr.error('Error al iniciar la formulación OC.', 'Error');
              console.error('Error initiating formulations', err);
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

  processNewModificationOC(
    formulations: Formulation[], 
    selectedYear: number, 
    newModificationQuarter: number,
    quarterLabels: { [key: number]: string }
  ): Observable<any> {
    return new Observable(observer => {
      let maxModification = 0;
      // Solo considerar formulaciones OC y tipo 1
      const ocFormulations = formulations.filter(f =>
        f.year === selectedYear &&
        f.dependency?.dependencyType?.idDependencyType === 1 &&
        f.formulationType?.idFormulationType === 1
      );

      ocFormulations.forEach(f => {
        if (f.modification && f.modification > maxModification) {
          maxModification = f.modification;
        }
      });

      if (maxModification === 0) {
        this.toastr.warning(`No hay formulaciones OC para el año ${selectedYear} para generar una modificatoria.`, 'Advertencia');
        observer.error('No hay formulaciones OC');
        return;
      }

      if (maxModification >= 8) {
        this.toastr.warning(`Ya se ha alcanzado el límite máximo de modificatorias (8) para OC en el año ${selectedYear}.`, 'Advertencia');
        observer.error('Límite máximo alcanzado');
        return;
      }

      const formulationsToModify = ocFormulations.filter(
        f => f.modification === maxModification
      );

      if (formulationsToModify.length === 0) {
        this.toastr.warning(`No se encontraron formulaciones OC con la mayor modificatoria (${maxModification}) para el año ${selectedYear}.`, 'Advertencia');
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
            this.toastr.success(`Se crearon ${results.length} nuevas modificatorias OC para el trimestre ${quarterLabels[newModificationQuarter]}.`, 'Éxito');
            observer.next(results);
            observer.complete();
          },
          error: (err) => {
            this.toastr.error('Error al crear nuevas modificatorias OC.', 'Error');
            console.error('Error adding new modifications', err);
            observer.error(err);
          }
        });
      } else {
        this.toastr.info('No hay formulaciones OC para procesar la nueva modificatoria.', 'Info');
        observer.error('No hay formulaciones para procesar');
      }
    });
  }
}
