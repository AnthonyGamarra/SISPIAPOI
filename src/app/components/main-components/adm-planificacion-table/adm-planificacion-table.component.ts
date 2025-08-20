import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
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
import { FormulationTypeService } from '../../../core/services/logic/formulation-type.service';

// Importar los nuevos middlewares
import { ProcessOCService } from '../../../core/middlewares/processOC';
import { ProcessOODDService } from '../../../core/middlewares/processOODD';
import { ProcessPEService } from '../../../core/middlewares/processPE';
import { ProcessPSOService } from '../../../core/middlewares/processPSO';

import { Formulation } from '../../../models/logic/formulation.model';
import { DependencyType } from '../../../models/logic/dependencyType.model';
import { FormulationState } from '../../../models/logic/formulationState.model';
import { FormulationType } from '../../../models/logic/formulationType.model';
import { Observable, forkJoin } from 'rxjs';

@Component({
  selector: 'app-adm-planificacion-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
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
  formulationTypes: FormulationType[] = [];
  originalActiveState?: boolean;

  options: AnimationOptions = {
    path: 'resources/succes-allert.json',
  };

  groupedFormulations: {
    [dependencyTypeName: string]: {
      [formulationTypeName: string]: {
        [modification: number]: Formulation[]
      }
    }
  } = {};
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
  displayNewModificationDialogOODDGestion: boolean = false;
  displayNewModificationDialogPrestacionesEconomicas: boolean = false;
  displayNewModificationDialogPrestacionesSociales: boolean = false;
  showSuccessAnimation = false;
  newModificationQuarter: number | null = null;
  newModificationQuarterOODDGestion: number | null = null;
  newModificationQuarterPrestacionesEconomicas: number | null = null;
  newModificationQuarterPrestacionesSociales: number | null = null;
  public canInitiateFormulation = false; // << NUEVA BANDERA
  public canInitiateFormulationOODDGestion = false; // << NUEVA BANDERA PARA OODDGestion
  public canInitiateFormulationPrestacionesEconomicas = false; // << NUEVA BANDERA PARA Prestaciones Económicas
  public canInitiateFormulationPrestacionesSociales = false; // << NUEVA BANDERA PARA Prestaciones Sociales

  public Object = Object;

  private toastr = inject(ToastrService);

  constructor(
    private formulationService: FormulationService,
    private dependencyTypeService: DependencyTypeService,
    private formulationTypeService: FormulationTypeService,
    private confirmationService: ConfirmationService,
    private yearsService: StrategicObjectiveService,
    private processOCService: ProcessOCService,
    private processOODDService: ProcessOODDService,
    private processPEService: ProcessPEService,
    private processPSOService: ProcessPSOService
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
      formulationTypes: this.formulationTypeService.getAll(),
      formulations: this.formulationService.getAll()
    }).subscribe({
      next: (results) => {
        // Solo incluir tipos de dependencia con idDependencyType 1 y 2
        this.dependencyTypes = (results.dependencyTypes || []).filter(
          (dt: DependencyType) => dt.idDependencyType === 1 || dt.idDependencyType === 2
        );
        this.formulationTypes = (results.formulationTypes || []).filter(
          (ft: FormulationType) => ft.idFormulationType !== undefined && (ft.idFormulationType >= 2 || ft.idFormulationType === 4)
        );
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

    // Verificar si existen formulaciones OODDGestion (tipo 2) con ospe = false
    const ocFormulations = filteredByYear.filter(f =>
      f.dependency?.dependencyType?.idDependencyType === 1 &&
      f.formulationType?.idFormulationType === 1
    );
    const OODDGestionFormulations = filteredByYear.filter(f =>
      f.dependency?.dependencyType?.idDependencyType === 2 &&
      f.formulationType?.idFormulationType === 2 &&
      f.dependency?.ospe === false
    );
    const prestacionesEconomicasFormulations = filteredByYear.filter(f =>
      f.dependency?.dependencyType?.idDependencyType === 2 &&
      f.formulationType?.idFormulationType === 4 &&
      f.dependency?.ospe === true
    );
    const prestacionesSocialesFormulations = filteredByYear.filter(f =>
      f.dependency?.dependencyType?.idDependencyType === 2 &&
      f.formulationType?.idFormulationType === 5 &&
      f.dependency?.ospe === false
    );

    // Solo permitir iniciar formulación OODDGestion si existen formulaciones OC pero no OODDGestion
    this.canInitiateFormulationOODDGestion = OODDGestionFormulations.length === 0;

    // Solo permitir iniciar formulación Prestaciones Económicas si existen formulaciones OC pero no Prestaciones Económicas
    this.canInitiateFormulationPrestacionesEconomicas = prestacionesEconomicasFormulations.length === 0;

    // Solo permitir iniciar formulación Prestaciones Sociales si no existen formulaciones de Prestaciones Sociales
    this.canInitiateFormulationPrestacionesSociales = prestacionesSocialesFormulations.length === 0;

    // Initialize the structure
    this.dependencyTypes.forEach(depType => {
      this.groupedFormulations[depType.name] = {};

      if (depType.idDependencyType === 2) {
        // For OODDGestion (dependency type 2), group by formulation type
        this.formulationTypes.forEach(formType => {
          const formTypeName = formType.name || 'Sin Clasificar';
          this.groupedFormulations[depType.name][formTypeName] = {};
          for (let i = 1; i <= 8; i++) {
            this.groupedFormulations[depType.name][formTypeName][i] = [];
          }
        });
      } else {
        // For OC (dependency type 1), use "General" as single group
        this.groupedFormulations[depType.name]['General'] = {};
        for (let i = 1; i <= 8; i++) {
          this.groupedFormulations[depType.name]['General'][i] = [];
        }
      }
    });

    // Group formulations
    filteredByYear.forEach(formulation => {
      const depTypeName = formulation.dependency?.dependencyType?.name;
      const modification = formulation.modification;
      const formulationTypeName = formulation.formulationType?.name || 'Sin Clasificar';

      if (depTypeName && modification && modification >= 1 && modification <= 8) {
        if (!this.groupedFormulations[depTypeName]) {
          return; // Skip if dependency type not found
        }

        let groupKey: string;
        if (formulation.dependency?.dependencyType?.idDependencyType === 2) {
          // For OODDGestion, use formulation type name
          groupKey = formulationTypeName;
        } else {
          // For OC, use "General"
          groupKey = 'General';
        }

        if (!this.groupedFormulations[depTypeName][groupKey]) {
          this.groupedFormulations[depTypeName][groupKey] = {};
          for (let i = 1; i <= 8; i++) {
            this.groupedFormulations[depTypeName][groupKey][i] = [];
          }
        }

        if (!this.groupedFormulations[depTypeName][groupKey][modification]) {
          this.groupedFormulations[depTypeName][groupKey][modification] = [];
        }

        this.groupedFormulations[depTypeName][groupKey][modification].push(formulation);
      }
    });

    // Sort formulations within each group
    for (const depTypeName in this.groupedFormulations) {
      if (this.groupedFormulations.hasOwnProperty(depTypeName)) {
        for (const formTypeName in this.groupedFormulations[depTypeName]) {
          if (this.groupedFormulations[depTypeName].hasOwnProperty(formTypeName)) {
            for (const modificationNum in this.groupedFormulations[depTypeName][formTypeName]) {
              if (this.groupedFormulations[depTypeName][formTypeName].hasOwnProperty(modificationNum)) {
                this.groupedFormulations[depTypeName][formTypeName][modificationNum].sort((a: Formulation, b: Formulation) =>
                  (a.dependency?.name || '').localeCompare(b.dependency?.name || '')
                );
              }
            }
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

  openNewModificationDialogOC(): void {
    this.newModificationQuarter = null;
    this.displayNewModificationDialog = true;
  }

  addNewModificationOC(): void {
    if (this.newModificationQuarter === null || this.newModificationQuarter < 1 || this.newModificationQuarter > 4) {
      this.toastr.warning('Por favor ingrese un trimestre válido (I-IV).', 'Advertencia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria para el ${this.quarterLabels[this.newModificationQuarter]} para todas las formulaciones del año ${this.selectedYear}?`,
      header: 'Confirmar Nueva Modificatoria',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModificationOC();
      },
      reject: () => {
        this.toastr.info('Creación de nueva modificatoria cancelada.', 'Cancelado');
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

  private processNewModificationOC(): void {
    this.processOCService.processNewModificationOC(
      this.formulations,
      this.selectedYear,
      this.newModificationQuarter!,
      this.quarterLabels
    ).subscribe({
      next: () => {
        this.displayNewModificationDialog = false;
        this.loadInitialData();
      },
      error: (err: any) => {
        this.displayNewModificationDialog = false;
        console.error('Error from processOCService:', err);
      }
    });
  }

  // << NUEVO: Métodos para modificatorias OODDGestion
  openNewModificationDialogOODDGestion(): void {
    this.newModificationQuarterOODDGestion = null;
    this.displayNewModificationDialogOODDGestion = true;
  }

  addNewModificationOODDGestion(): void {
    if (this.newModificationQuarterOODDGestion === null || this.newModificationQuarterOODDGestion < 1 || this.newModificationQuarterOODDGestion > 4) {
      this.toastr.warning('Por favor ingrese un trimestre válido (I-IV).', 'Advertencia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria de actividades de gestión para el ${this.quarterLabels[this.newModificationQuarterOODDGestion]} para todas las formulaciones OODDGestion del año ${this.selectedYear}?`,
      header: 'Confirmar Nueva Modificatoria OODDGestion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModificationOODDGestion();
      },
      reject: () => {
        this.toastr.info('Creación de nueva modificatoria OODDGestion cancelada.', 'Cancelado');
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

  private processNewModificationOODDGestion(): void {
    this.processOODDService.processNewModificationOODDGestion(
      this.formulations,
      this.selectedYear,
      this.newModificationQuarterOODDGestion!,
      this.quarterLabels
    ).subscribe({
      next: () => {
        this.displayNewModificationDialogOODDGestion = false;
        this.loadInitialData();
      },
      error: (err: any) => {
        this.displayNewModificationDialogOODDGestion = false;
        console.error('Error from processOODDService:', err);
      }
    });
  }

  // << NUEVO: Métodos para modificatorias Prestaciones Económicas
  openNewModificationDialogPrestacionesEconomicas(): void {
    this.newModificationQuarterPrestacionesEconomicas = null;
    this.displayNewModificationDialogPrestacionesEconomicas = true;
  }

  addNewModificationPrestacionesEconomicas(): void {
    if (this.newModificationQuarterPrestacionesEconomicas === null || this.newModificationQuarterPrestacionesEconomicas < 1 || this.newModificationQuarterPrestacionesEconomicas > 4) {
      this.toastr.warning('Por favor ingrese un trimestre válido (I-IV).', 'Advertencia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria para prestaciones económicas para el ${this.quarterLabels[this.newModificationQuarterPrestacionesEconomicas]} para todas las formulaciones de Prestaciones Económicas del año ${this.selectedYear}?`,
      header: 'Confirmar Nueva Modificatoria Prestaciones Económicas',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModificationPrestacionesEconomicas();
      },
      reject: () => {
        this.toastr.info('Creación de nueva modificatoria para Prestaciones Económicas cancelada.', 'Cancelado');
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

  // << NUEVO: Métodos para modificatorias Prestaciones Sociales
  openNewModificationDialogPrestacionesSociales(): void {
    this.newModificationQuarterPrestacionesSociales = null;
    this.displayNewModificationDialogPrestacionesSociales = true;
  }

  addNewModificationPrestacionesSociales(): void {
    if (this.newModificationQuarterPrestacionesSociales === null || this.newModificationQuarterPrestacionesSociales < 1 || this.newModificationQuarterPrestacionesSociales > 4) {
      this.toastr.warning('Por favor ingrese un trimestre válido (I-IV).', 'Advertencia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria para prestaciones sociales para el ${this.quarterLabels[this.newModificationQuarterPrestacionesSociales]} para todas las formulaciones de Prestaciones Sociales del año ${this.selectedYear}?`,
      header: 'Confirmar Nueva Modificatoria Prestaciones Sociales',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModificationPrestacionesSociales();
      },
      reject: () => {
        this.toastr.info('Creación de nueva modificatoria para Prestaciones Sociales cancelada.', 'Cancelado');
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

  onInitiateFormulationPrestacionesSociales(): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea habilitar la formulación para Prestaciones Sociales para el año ${this.selectedYear}?`,
      header: 'Confirmar Habilitación de Formulación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processInitiateFormulationPrestacionesSociales();
      },
      reject: () => {
        this.toastr.info('Habilitación de formulación para Prestaciones Sociales cancelada.', 'Cancelado');
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

  private processInitiateFormulationPrestacionesSociales(): void {
    this.processPSOService.processInitiateFormulationPrestacionesSociales(
      this.selectedYear
    ).subscribe({
      next: () => {
        this.loadInitialData();
      },
      error: (err: any) => {
        console.error('Error from processPSOService:', err);
      }
    });
  }

  private processNewModificationPrestacionesSociales(): void {
    this.processPSOService.processNewModificationPrestacionesSociales(
      this.formulations,
      this.selectedYear,
      this.newModificationQuarterPrestacionesSociales!,
      this.quarterLabels
    ).subscribe({
      next: () => {
        this.displayNewModificationDialogPrestacionesSociales = false;
        this.loadInitialData();
      },
      error: (err: any) => {
        this.displayNewModificationDialogPrestacionesSociales = false;
        console.error('Error from processPSOService:', err);
      }
    });
  }

  // << NUEVO: Método para iniciar la formulación para todas las dependencias
  onInitiateFormulationOC(): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de iniciar la formulación para todas las dependencias para el año ${this.selectedYear}?`,
      header: 'Confirmar Iniciación de Formulación para OOCC',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processInitiateFormulationOC();
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
        }, 2500);
      },
      reject: () => {
        this.toastr.info('Iniciación de formulación para OOCC cancelada.', 'Cancelado');
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

  private processInitiateFormulationOC(): void {
    this.processOCService.processInitiateFormulationOC(this.selectedYear).subscribe({
      next: () => {
        this.loadInitialData(); // Recargar datos para ver los cambios
      },
      error: (err: any) => {
        console.error('Error from processOCService:', err);
      }
    });
  }

  // << NUEVO: Método para iniciar la formulación de actividades de gestión para OODDGestion
  onInitiateFormulationOODDGestion(): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de iniciar la formulación de actividades de gestión para OODDGestion para el año ${this.selectedYear}?`,
      header: 'Confirmar Iniciación de Formulación para OODDGestion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processInitiateFormulationOODDGestion();
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
        }, 2500);
      },
      reject: () => {
        this.toastr.info('Iniciación de formulación para OODDGestion cancelada.', 'Cancelado');
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

  private processInitiateFormulationOODDGestion(): void {
    this.processOODDService.processInitiateFormulationOODDGestion(this.selectedYear).subscribe({
      next: () => {
        this.loadInitialData();
      },
      error: (err: any) => {
        console.error('Error from processOODDService:', err);
      }
    });
  }

  // << NUEVO: Método para iniciar la formulación de prestaciones económicas para OODD con ospe = true
  onInitiateFormulationPrestacionesEconomicas(): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de iniciar la formulación de prestaciones económicas para OODD para el año ${this.selectedYear}?`,
      header: 'Confirmar Iniciación de Formulación para Prestaciones Económicas',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processInitiateFormulationPrestacionesEconomicas();
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
        }, 2500);
      },
      reject: () => {
        this.toastr.info('Iniciación de formulación para Prestaciones Económicas cancelada.', 'Cancelado');
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

  private processInitiateFormulationPrestacionesEconomicas(): void {
    this.processPEService.processInitiateFormulationPrestacionesEconomicas(this.selectedYear).subscribe({
      next: () => {
        this.loadInitialData();
      },
      error: (err: any) => {
        console.error('Error from processPEService:', err);
      }
    });
  }

  private processNewModificationPrestacionesEconomicas(): void {
    this.processPEService.processNewModificationPrestacionesEconomicas(
      this.formulations,
      this.selectedYear,
      this.newModificationQuarterPrestacionesEconomicas!,
      this.quarterLabels
    ).subscribe({
      next: () => {
        this.displayNewModificationDialogPrestacionesEconomicas = false;
        this.loadInitialData();
      },
      error: (err: any) => {
        this.displayNewModificationDialogPrestacionesEconomicas = false;
        console.error('Error from processPEService:', err);
      }
    });
  }

  getModificationNumbers(depTypeName: string, formTypeName?: string): number[] {
    const target = formTypeName
      ? this.groupedFormulations[depTypeName]?.[formTypeName]
      : this.groupedFormulations[depTypeName]?.['General'];

    const mods = this.Object.keys(target || {}).map(Number).sort((a, b) => a - b);
    return mods.length > 0 ? mods : [1];
  }

  getDependencyTypeNames(): string[] {
    return this.Object.keys(this.groupedFormulations).sort();
  }

  getFormulationTypeNames(depTypeName: string): string[] {
    return this.Object.keys(this.groupedFormulations[depTypeName] || {}).sort();
  }

  getFormulationsForGroup(depTypeName: string, formTypeName: string, modification: number): Formulation[] {
    return this.groupedFormulations[depTypeName]?.[formTypeName]?.[modification] || [];
  }
}