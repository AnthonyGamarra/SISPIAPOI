import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { CheckboxModule } from 'primeng/checkbox';
import { MinMaxYears } from '../../../models/logic/min-max-years.model';
import { ToastrService } from 'ngx-toastr';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';

import { FormulationService } from '../../../core/services/logic/formulation.service';
import { FormulationStateService } from '../../../core/services/logic/formulation-state.service';
import { DependencyTypeService } from '../../../core/services/logic/dependency-type.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { DependencyService } from '../../../core/services/logic/dependency.service'; // << AÑADIR ESTA LÍNEA

import { Formulation } from '../../../models/logic/formulation.model';
import { DependencyType } from '../../../models/logic/dependencyType.model';
import { FormulationState } from '../../../models/logic/formulationState.model';
import { Observable, forkJoin } from 'rxjs';
import { Dependency } from '../../../models/logic/dependency.model'; // << AÑADIR ESTA LÍNEA

@Component({
  selector: 'app-adm-planificacion-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DropdownModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    FieldsetModule,
    CheckboxModule,
    LottieComponent,
    ProgressSpinnerModule
  ],
  templateUrl: './adm-planificacion-table.component.html',
  styleUrl: './adm-planificacion-table.component.scss',
  providers: [ConfirmationService]
})
export class AdmPlanificacionTableComponent implements OnInit {

  formulations: Formulation[] = [];
  years: number[] = [];
  selectedYear: number;
  dependencyTypes: DependencyType[] = [];
  originalActiveState?: boolean;

  options: AnimationOptions = {
    path: 'resources/succes-allert.json',
  };

  groupedFormulations: { [key: string]: { [key: number]: Formulation[] } } = {};
  modificationLabels: { [key: number]: string } = {
    1: 'Formulación Inicial',
    2: 'Primera Modificatoria',
    3: 'Segunda Modificatoria',
    4: 'Tercera Modificatoria',
    5: 'Cuarta Modificatoria',
    6: 'Quinta Modificatoria',
    7: 'Sexta Modificatoria',
    8: 'Séptima Modificatoria',
  };

  quarterLabels: { [key: number]: string } = {
    1: 'I Trimestre',
    2: 'II Trimestre',
    3: 'III Trimestre',
    4: 'IV Trimestre',
  };

  quarterOptions: { label: string; value: number; }[] = [
    { label: 'I Trimestre', value: 1 },
    { label: 'II Trimestre', value: 2 },
    { label: 'III Trimestre', value: 3 },
    { label: 'IV Trimestre', value: 4 }
  ];

  displayNewModificationDialog: boolean = false;
  showSuccessAnimation = false;
  newModificationQuarter: number | null = null;
  public canInitiateFormulation = false; // << NUEVA BANDERA

  public Object = Object;

  private toastr = inject(ToastrService);

  constructor(
    private formulationService: FormulationService,
    private dependencyTypeService: DependencyTypeService,
    private confirmationService: ConfirmationService,
    private yearsService: StrategicObjectiveService,
    private dependencyService: DependencyService // << INYECTAR EL SERVICIO
  ) {
    const currentYear = new Date().getFullYear();
    this.selectedYear = currentYear;
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.yearsService.getMinMaxYears().subscribe({
      next: (yearsRange: MinMaxYears) => {
        const minYear = yearsRange.minYear;
        const maxYear = yearsRange.maxYear;
        this.years = [];
        for (let year = minYear!; year! <= maxYear!; year!++) {
          this.years.push(year!);
        }
      },
      error: (err) => {
        console.error('Error fetching min/max years:', err);
        this.toastr.error('Error al cargar rango de años.', 'Error');
      }
    });
  }

  loadInitialData(): void {
    forkJoin({
      dependencyTypes: this.dependencyTypeService.getAll(),
      formulations: this.formulationService.getAll()
    }).subscribe({
      next: (results) => {
        this.dependencyTypes = results.dependencyTypes;
        this.formulations = results.formulations;
        this.groupAndFilterFormulations();
      },
      error: (err) => {
        this.toastr.error('Error al cargar datos iniciales.', 'Error');
        console.error('Error loading initial data', err);
      }
    });
  }

  onYearChange(): void {
    this.groupAndFilterFormulations();
  }

  groupAndFilterFormulations(): void {
    this.groupedFormulations = {};

    const filteredByYear = this.formulations.filter(
      f => f.year === this.selectedYear
    );

    this.canInitiateFormulation = filteredByYear.length === 0; // << ESTABLECER LA BANDERA

    this.dependencyTypes.forEach(depType => {
      this.groupedFormulations[depType.name] = {};
      for (let i = 1; i <= 8; i++) {
        this.groupedFormulations[depType.name][i] = [];
      }
    });

    filteredByYear.forEach(formulation => {
      const depTypeName = formulation.dependency?.dependencyType?.name;
      const modification = formulation.modification;

      if (depTypeName && modification && modification >= 1 && modification <= 8) {
        if (!this.groupedFormulations[depTypeName]) {
          this.groupedFormulations[depTypeName] = {};
        }
        if (!this.groupedFormulations[depTypeName][modification]) {
          this.groupedFormulations[depTypeName][modification] = [];
        }
        this.groupedFormulations[depTypeName][modification].push(formulation);
      }
    });

    for (const depTypeName in this.groupedFormulations) {
      if (this.groupedFormulations.hasOwnProperty(depTypeName)) {
        for (const modificationNum in this.groupedFormulations[depTypeName]) {
          if (this.groupedFormulations[depTypeName].hasOwnProperty(modificationNum)) {
            this.groupedFormulations[depTypeName][modificationNum].sort((a, b) =>
              (a.dependency?.name || '').localeCompare(b.dependency?.name || '')
            );
          }
        }
      }
    }
  }

  onActiveChange(formulation: Formulation, event: any): void {
    const newActiveState = event.checked;

    this.confirmationService.confirm({
      message: `¿Está seguro de ${newActiveState ? 'activar' : 'desactivar'} la formulación de "${formulation.dependency?.name}"?`,
      header: 'Confirmar Cambio de Estado',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        formulation.active = newActiveState;
        // Solo cambiar el estado a idFormulationState 4 si se desactiva
        if (!newActiveState) {
          if (formulation.formulationState) {
            formulation.formulationState.idFormulationState = 4;
          } else {
            formulation.formulationState = { idFormulationState: 4 } as FormulationState;
          }
        }
        this.formulationService.update(formulation).subscribe({
          next: () => {
            this.toastr.success(`Formulación ${newActiveState ? 'activada' : 'desactivada'}.`, 'Éxito');
          },
          error: (err) => {
            this.toastr.error(`Error al ${newActiveState ? 'activar' : 'desactivar'} la formulación.`, 'Error');
            console.error('Error updating formulation active state', err);
            formulation.active = !newActiveState;
          }
        });
      },
      reject: () => {
        formulation.active = !newActiveState;
        this.toastr.info('Cambio de estado cancelado.', 'Cancelado');
      },
      rejectButtonProps: {
        label: 'No',
        icon: 'pi pi-times',
        variant: 'outlined',
        size: 'medium'
      },
      acceptButtonProps: {
        label: 'Sí',
        icon: 'pi pi-check',
        size: 'medium'
      },
    });
  }

  openNewModificationDialog(): void {
    this.newModificationQuarter = null;
    this.displayNewModificationDialog = true;
  }

  addNewModification(): void {
    if (this.newModificationQuarter === null || this.newModificationQuarter < 1 || this.newModificationQuarter > 4) {
      this.toastr.warning('Por favor ingrese un trimestre válido (1-4).', 'Advertencia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria para el trimestre ${this.quarterLabels[this.newModificationQuarter]} para todas las formulaciones del año ${this.selectedYear} con la mayor modificación existente?`,
      header: 'Confirmar Nueva Modificatoria',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModification();
      },
      reject: () => {
        this.toastr.info('Creación de nueva modificatoria cancelada.', 'Cancelado');
      }
    });
  }

  private processNewModification(): void {
    let maxModification = 0;
    this.formulations.forEach(f => {
      if (f.year === this.selectedYear && f.modification && f.modification > maxModification) {
        maxModification = f.modification;
      }
    });

    if (maxModification === 0) {
      this.toastr.warning(`No hay formulaciones para el año ${this.selectedYear} para generar una modificatoria.`, 'Advertencia');
      this.displayNewModificationDialog = false;
      return;
    }

    if (maxModification >= 8) {
      this.toastr.warning(`Ya se ha alcanzado el límite máximo de modificatorias (8) para el año ${this.selectedYear}.`, 'Advertencia');
      this.displayNewModificationDialog = false;
      return;
    }

    const formulationsToModify = this.formulations.filter(
      f => f.year === this.selectedYear && f.modification === maxModification
    );

    if (formulationsToModify.length === 0) {
      this.toastr.warning(`No se encontraron formulaciones con la mayor modificatoria (${maxModification}) para el año ${this.selectedYear}.`, 'Advertencia');
      this.displayNewModificationDialog = false;
      return;
    }

    const modificationRequests: Observable<Formulation>[] = [];
    formulationsToModify.forEach(formulation => {
      if (formulation.idFormulation !== undefined) {
        modificationRequests.push(
          this.formulationService.addModification(formulation.idFormulation, this.newModificationQuarter!)
        );
      }
    });

    if (modificationRequests.length > 0) {
      forkJoin(modificationRequests).subscribe({
        next: (results) => {
          this.toastr.success(`Se crearon ${results.length} nuevas modificatorias para el trimestre ${this.quarterLabels[this.newModificationQuarter!]}.`, 'Éxito');
          this.displayNewModificationDialog = false;
          this.loadInitialData();
        },
        error: (err) => {
          this.toastr.error('Error al crear nuevas modificatorias.', 'Error');
          console.error('Error adding new modifications', err);
          this.displayNewModificationDialog = false;
        }
      });
    } else {
      this.toastr.info('No hay formulaciones para procesar la nueva modificatoria.', 'Info');
      this.displayNewModificationDialog = false;
    }
  }

  // << NUEVO: Método para iniciar la formulación para todas las dependencias
  onInitiateFormulation(): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de iniciar la formulación para todas las dependencias para el año ${this.selectedYear}?`,
      header: 'Confirmar Iniciación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processInitiateFormulation();
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
        }, 2500);
      },
      reject: () => {
        this.toastr.info('Iniciación de formulación cancelada.', 'Cancelado');
      },
      rejectButtonProps: {
        label: 'No',
        icon: 'pi pi-times',
        variant: 'outlined',
        size: 'medium'
      },
      acceptButtonProps: {
        label: 'Sí',
        icon: 'pi pi-check',
        size: 'medium'
      },
    });
  }

  private processInitiateFormulation(): void {
    this.dependencyService.getAll().subscribe({
      next: (allDependencies: Dependency[]) => {
        const creationRequests: Observable<Formulation>[] = [];
        const formulationStateInitial = { idFormulationState: 1 } as FormulationState;

        allDependencies.forEach(dependency => {
          const newFormulation: Formulation = {
            year: this.selectedYear,
            dependency: dependency,
            formulationState: formulationStateInitial,
            active: true,
            modification: 1,
            quarter: 1,
          };
          creationRequests.push(this.formulationService.create(newFormulation));
        });

        forkJoin(creationRequests).subscribe({
          next: (results) => {
            this.toastr.success(`Se crearon ${results.length} formulaciones iniciales correctamente.`, 'Éxito');
            this.loadInitialData(); // Recargar datos para ver los cambios
          },
          error: (err) => {
            this.toastr.error('Error al iniciar la formulación para todas las dependencias.', 'Error');
            console.error('Error initiating formulations', err);
          }
        });
      },
      error: (err) => {
        this.toastr.error('Error al cargar la lista de dependencias.', 'Error');
        console.error('Error fetching dependencies', err);
      }
    });
  }

  getModificationNumbers(depTypeName: string): number[] {
    const mods = this.Object.keys(this.groupedFormulations[depTypeName] || {}).map(Number).sort((a, b) => a - b);
    return mods.length > 0 ? mods : [1];
  }

  getDependencyTypeNames(): string[] {
    return this.Object.keys(this.groupedFormulations).sort();
  }
}