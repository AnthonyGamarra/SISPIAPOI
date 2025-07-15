// adm-planificacion-table.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { MinMaxYears } from '../../models/logic/min-max-years.model';


import { FormulationService } from '../../core/services/logic/formulation.service';
import { DependencyService } from '../../core/services/logic/dependency.service'; // Potentially needed for full Dependency object if not in Formulation
import { FormulationStateService } from '../../core/services/logic/formulation-state.service';
import { DependencyTypeService } from '../../core/services/logic/dependency-type.service';
import { StrategicObjectiveService } from '../../core/services/logic/strategic-objective.service';


import { Formulation } from '../../models/logic/formulation.model';
import { Dependency } from '../../models/logic/dependency.model';
import { FormulationState } from '../../models/logic/formulationState.model';
import { DependencyType } from '../../models/logic/dependencyType.model';
import { Observable, forkJoin } from 'rxjs'; // For parallel service calls

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
    FieldsetModule
  ],
  templateUrl: './adm-planificacion-table.component.html',
  styleUrl: './adm-planificacion-table.component.scss',
  providers: [MessageService, ConfirmationService] // Provide services for PrimeNG components
})
export class AdmPlanificacionTableComponent implements OnInit {

  formulations: Formulation[] = [];
  years: number[] = [];
  selectedYear: number;
  dependencyTypes: DependencyType[] = [];
  formulationStates: FormulationState[] = [];

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

  displayNewModificationDialog: boolean = false;
  newModificationQuarter: number | null = null;

  // Make the global Object accessible in the template
  public Object = Object;

  constructor(
    private formulationService: FormulationService,
    private dependencyTypeService: DependencyTypeService,
    private formulationStateService: FormulationStateService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private yearsService: StrategicObjectiveService
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
        // Initialize the years array
        this.years = [];
        // Populate the array with years from minYear to maxYear
        for (let year = minYear; year! <= maxYear!; year!++) {
          this.years.push(year!);
        }
      },
      error: (err) => {
        console.error('Error fetching min/max years:', err);
      }
    });
  }

  loadInitialData(): void {
    forkJoin({
      dependencyTypes: this.dependencyTypeService.getAll(),
      formulationStates: this.formulationStateService.getAll(),
      formulations: this.formulationService.getAll()
    }).subscribe({
      next: (results) => {
        this.dependencyTypes = results.dependencyTypes;
        this.formulationStates = results.formulationStates;
        this.formulations = results.formulations.map(f => {
          if (!f.formulationState) {
            const defaultState = this.formulationStates.find(fs => fs.name === 'Pendiente') ||
                                 { idFormulationState: undefined, name: 'Desconocido', active: true };
            f.formulationState = defaultState;
          }
          return f;
        });
        this.groupAndFilterFormulations();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar datos iniciales.' });
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

  onStateChange(formulation: Formulation, newFormulationStateId: number): void {
    const originalStateId = formulation.formulationState?.idFormulationState;
    const newFormulationState = this.formulationStates.find(state => state.idFormulationState === newFormulationStateId);

    if (newFormulationState) {
      this.confirmationService.confirm({
        message: `¿Está seguro de cambiar el estado de la formulación de "${formulation.dependency?.name}" a "${newFormulationState.name}"?`,
        header: 'Confirmar Cambio de Estado',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          if (formulation.formulationState) {
            formulation.formulationState = newFormulationState;
          } else {
            formulation.formulationState = newFormulationState;
          }

          this.formulationService.update(formulation).subscribe({
            next: (updatedFormulation) => {
              this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado de formulación actualizado.' });
            },
            error: (err) => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar el estado de la formulación.' });
              console.error('Error updating formulation state', err);
              if (formulation.formulationState) {
                 formulation.formulationState = this.formulationStates.find(state => state.idFormulationState === originalStateId) || newFormulationState;
              }
            }
          });
        },
        reject: () => {
          this.messageService.add({ severity: 'info', summary: 'Cancelado', detail: 'Cambio de estado cancelado.' });
        }
      });
    }
  }

  openNewModificationDialog(): void {
    this.newModificationQuarter = null;
    this.displayNewModificationDialog = true;
  }

  addNewModification(): void {
    if (this.newModificationQuarter === null || this.newModificationQuarter < 1 || this.newModificationQuarter > 4) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Por favor ingrese un trimestre válido (1-4).' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria para el trimestre ${this.newModificationQuarter} para todas las formulaciones del año ${this.selectedYear} con la mayor modificación existente?`,
      header: 'Confirmar Nueva Modificatoria',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModification();
      },
      reject: () => {
        this.messageService.add({ severity: 'info', summary: 'Cancelado', detail: 'Creación de nueva modificatoria cancelada.' });
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
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: `No hay formulaciones para el año ${this.selectedYear} para generar una modificatoria.` });
      this.displayNewModificationDialog = false;
      return;
    }

    if (maxModification >= 8) {
        this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: `Ya se ha alcanzado el límite máximo de modificatorias (8) para el año ${this.selectedYear}.` });
        this.displayNewModificationDialog = false;
        return;
    }


    const formulationsToModify = this.formulations.filter(
      f => f.year === this.selectedYear && f.modification === maxModification
    );

    if (formulationsToModify.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: `No se encontraron formulaciones con la mayor modificatoria (${maxModification}) para el año ${this.selectedYear}.` });
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
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: `Se crearon ${results.length} nuevas modificatorias para el trimestre ${this.newModificationQuarter}.` });
          this.displayNewModificationDialog = false;
          this.loadInitialData();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al crear nuevas modificatorias.' });
          console.error('Error adding new modifications', err);
          this.displayNewModificationDialog = false;
        }
      });
    } else {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'No hay formulaciones para procesar la nueva modificatoria.' });
      this.displayNewModificationDialog = false;
    }
  }

  getModificationNumbers(depTypeName: string): number[] {
    const mods = Object.keys(this.groupedFormulations[depTypeName] || {}).map(Number).sort((a, b) => a - b);
    return mods.length > 0 ? mods : [1];
  }

  getDependencyTypeNames(): string[] {
    return Object.keys(this.groupedFormulations).sort();
  }
}