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
import { ActivityDetailService } from '../../../core/services/logic/activity-detail.service'; // << AÑADIR ESTA LÍNEA
import { OperationalActivityService } from '../../../core/services/logic/operational-activity.service'; // << AÑADIR ESTA LÍNEA
import { FormulationTypeService } from '../../../core/services/logic/formulation-type.service';

import { Formulation } from '../../../models/logic/formulation.model';
import { DependencyType } from '../../../models/logic/dependencyType.model';
import { FormulationState } from '../../../models/logic/formulationState.model';
import { FormulationType } from '../../../models/logic/formulationType.model';
import { Observable, forkJoin } from 'rxjs';
import { Dependency } from '../../../models/logic/dependency.model'; // << AÑADIR ESTA LÍNEA
import { ActivityDetail } from '../../../models/logic/activityDetail.model';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';

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
  displayNewModificationDialogOODD: boolean = false;
  showSuccessAnimation = false;
  newModificationQuarter: number | null = null;
  newModificationQuarterOODD: number | null = null;
  public canInitiateFormulation = false; // << NUEVA BANDERA
  public canInitiateFormulationOODD = false; // << NUEVA BANDERA PARA OODD

  public Object = Object;

  private toastr = inject(ToastrService);

  constructor(
    private formulationService: FormulationService,
    private dependencyTypeService: DependencyTypeService,
    private formulationTypeService: FormulationTypeService,
    private confirmationService: ConfirmationService,
    private yearsService: StrategicObjectiveService,
    private dependencyService: DependencyService, // << INYECTAR EL SERVICIO
    private activityDetailService: ActivityDetailService, // << INYECTAR EL SERVICIO
    private operationalActivityService: OperationalActivityService // << INYECTAR EL SERVICIO
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
          (ft: FormulationType) => ft.idFormulationType !== undefined && ft.idFormulationType >= 2
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

    // Verificar si existen formulaciones OODD (tipo 2)
    const ocFormulations = filteredByYear.filter(f =>
      f.dependency?.dependencyType?.idDependencyType === 1 &&
      f.formulationType?.idFormulationType === 1
    );
    const ooddFormulations = filteredByYear.filter(f =>
      f.dependency?.dependencyType?.idDependencyType === 2 &&
      f.formulationType?.idFormulationType === 2
    );

    // Solo permitir iniciar formulación OODD si existen formulaciones OC pero no OODD
    this.canInitiateFormulationOODD = ooddFormulations.length === 0;

    // Initialize the structure
    this.dependencyTypes.forEach(depType => {
      this.groupedFormulations[depType.name] = {};
      
      if (depType.idDependencyType === 2) {
        // For OODD (dependency type 2), group by formulation type
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
          // For OODD, use formulation type name
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
    let maxModification = 0;
    // Solo considerar formulaciones OC y tipo 1
    const ocFormulations = this.formulations.filter(f =>
      f.year === this.selectedYear &&
      f.dependency?.dependencyType?.idDependencyType === 1 &&
      f.formulationType?.idFormulationType === 1
    );

    ocFormulations.forEach(f => {
      if (f.modification && f.modification > maxModification) {
        maxModification = f.modification;
      }
    });

    if (maxModification === 0) {
      this.toastr.warning(`No hay formulaciones OC para el año ${this.selectedYear} para generar una modificatoria.`, 'Advertencia');
      this.displayNewModificationDialog = false;
      return;
    }

    if (maxModification >= 8) {
      this.toastr.warning(`Ya se ha alcanzado el límite máximo de modificatorias (8) para OC en el año ${this.selectedYear}.`, 'Advertencia');
      this.displayNewModificationDialog = false;
      return;
    }

    const formulationsToModify = ocFormulations.filter(
      f => f.modification === maxModification
    );

    if (formulationsToModify.length === 0) {
      this.toastr.warning(`No se encontraron formulaciones OC con la mayor modificatoria (${maxModification}) para el año ${this.selectedYear}.`, 'Advertencia');
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
          this.toastr.success(`Se crearon ${results.length} nuevas modificatorias OC para el trimestre ${this.quarterLabels[this.newModificationQuarter!]}.`, 'Éxito');
          this.displayNewModificationDialog = false;
          this.loadInitialData();
        },
        error: (err) => {
          this.toastr.error('Error al crear nuevas modificatorias OC.', 'Error');
          console.error('Error adding new modifications', err);
          this.displayNewModificationDialog = false;
        }
      });
    } else {
      this.toastr.info('No hay formulaciones OC para procesar la nueva modificatoria.', 'Info');
      this.displayNewModificationDialog = false;
    }
  }

  // << NUEVO: Métodos para modificatorias OODD
  openNewModificationDialogOODD(): void {
    this.newModificationQuarterOODD = null;
    this.displayNewModificationDialogOODD = true;
  }

  addNewModificationOODD(): void {
    if (this.newModificationQuarterOODD === null || this.newModificationQuarterOODD < 1 || this.newModificationQuarterOODD > 4) {
      this.toastr.warning('Por favor ingrese un trimestre válido (I-IV).', 'Advertencia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de crear una nueva modificatoria de actividades de gestión para el ${this.quarterLabels[this.newModificationQuarterOODD]} para todas las formulaciones OODD del año ${this.selectedYear}?`,
      header: 'Confirmar Nueva Modificatoria OODD',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processNewModificationOODD();
      },
      reject: () => {
        this.toastr.info('Creación de nueva modificatoria OODD cancelada.', 'Cancelado');
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

  private processNewModificationOODD(): void {
    let maxModification = 0;
    // Solo considerar formulaciones OODD y tipo 2 (OODD ACTIVIDADES DE GESTIÓN)
    const ooddFormulations = this.formulations.filter(f =>
      f.year === this.selectedYear &&
      f.dependency?.dependencyType?.idDependencyType === 2 &&
      f.formulationType?.idFormulationType === 2
    );
    
    ooddFormulations.forEach(f => {
      if (f.modification && f.modification > maxModification) {
        maxModification = f.modification;
      }
    });

    if (maxModification === 0) {
      this.toastr.warning(`No hay formulaciones OODD para el año ${this.selectedYear} para generar una modificatoria.`, 'Advertencia');
      this.displayNewModificationDialogOODD = false;
      return;
    }

    if (maxModification >= 8) {
      this.toastr.warning(`Ya se ha alcanzado el límite máximo de modificatorias (8) para OODD en el año ${this.selectedYear}.`, 'Advertencia');
      this.displayNewModificationDialogOODD = false;
      return;
    }

    const formulationsToModify = ooddFormulations.filter(
      f => f.modification === maxModification
    );

    if (formulationsToModify.length === 0) {
      this.toastr.warning(`No se encontraron formulaciones OODD con la mayor modificatoria (${maxModification}) para el año ${this.selectedYear}.`, 'Advertencia');
      this.displayNewModificationDialogOODD = false;
      return;
    }

    const modificationRequests: Observable<Formulation>[] = [];
    formulationsToModify.forEach(formulation => {
      if (formulation.idFormulation !== undefined) {
        modificationRequests.push(
          this.formulationService.addModification(formulation.idFormulation, this.newModificationQuarterOODD!)
        );
      }
    });

    if (modificationRequests.length > 0) {
      forkJoin(modificationRequests).subscribe({
        next: (results) => {
          this.toastr.success(`Se crearon ${results.length} nuevas modificatorias OODD para el trimestre ${this.quarterLabels[this.newModificationQuarterOODD!]}.`, 'Éxito');
          this.displayNewModificationDialogOODD = false;
          this.loadInitialData();
        },
        error: (err) => {
          this.toastr.error('Error al crear nuevas modificatorias OODD.', 'Error');
          console.error('Error adding new modifications OODD', err);
          this.displayNewModificationDialogOODD = false;
        }
      });
    } else {
      this.toastr.info('No hay formulaciones OODD para procesar la nueva modificatoria.', 'Info');
      this.displayNewModificationDialogOODD = false;
    }
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
    this.dependencyService.getAll().subscribe({
      next: (allDependencies: Dependency[]) => {
        const creationRequests: Observable<Formulation>[] = [];
        const formulationStateInitial = { idFormulationState: 1 } as FormulationState;

        // Filtrar solo dependencias OC
        const ocDependencies = allDependencies.filter(dep => dep.dependencyType?.idDependencyType === 1);

        ocDependencies.forEach(dependency => {
          const newFormulation: Formulation = {
            year: this.selectedYear,
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
            this.loadInitialData(); // Recargar datos para ver los cambios
          },
          error: (err) => {
            this.toastr.error('Error al iniciar la formulación OC.', 'Error');
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

  // << NUEVO: Método para iniciar la formulación de actividades de gestión para OODD
  onInitiateFormulationOODD(): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de iniciar la formulación de actividades de gestión para OODD para el año ${this.selectedYear}?`,
      header: 'Confirmar Iniciación de Formulación para OODD',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.processInitiateFormulationOODD();
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
        }, 2500);
      },
      reject: () => {
        this.toastr.info('Iniciación de formulación para OODD cancelada.', 'Cancelado');
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

  private processInitiateFormulationOODD(): void {
    // Primero obtener todas las dependencias OODD
    this.dependencyService.getAll().subscribe({
      next: (allDependencies: Dependency[]) => {
        const ooddDependencies = allDependencies.filter(dep => dep.dependencyType?.idDependencyType === 2);

        if (ooddDependencies.length === 0) {
          this.toastr.warning('No se encontraron dependencias OODD para crear formulaciones.', 'Advertencia');
          return;
        }

        // Crear formulaciones para todas las dependencias OODD
        const formulationCreationRequests: Observable<Formulation>[] = [];
        const formulationStateInitial = { idFormulationState: 1 } as FormulationState;

        ooddDependencies.forEach(dependency => {
          const newFormulation: Formulation = {
            year: this.selectedYear,
            dependency: dependency,
            formulationState: formulationStateInitial,
            active: true,
            modification: 1,
            quarter: 1,
            formulationType: { idFormulationType: 2 } // Tipo 2 para OODD
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
                  ad.year === this.selectedYear &&
                  ad.formulationType?.idFormulationType === 2
                );

                if (filteredDetails.length === 0) {
                  this.toastr.success(`Se crearon ${formulationsCreated.length} formulaciones OODD pero no hay actividades de gestión definidas para el año ${this.selectedYear}.`, 'Formulaciones Creadas');
                  this.loadInitialData();
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
                        `Se crearon ${formulationsCreated.length} formulaciones OODD y ${activitiesCreated.length} actividades operativas correctamente.`,
                        'Éxito Completo'
                      );
                      this.loadInitialData();
                    },
                    error: (err) => {
                      this.toastr.error('Error al crear las actividades operativas OODD. Verifique que los valores por defecto sean válidos.', 'Error');
                      console.error('Error creating operational activities', err);
                      console.error('Error details:', err.error);
                    }
                  });
                } else {
                  this.toastr.success(`Se crearon ${formulationsCreated.length} formulaciones OODD correctamente.`, 'Éxito');
                  this.loadInitialData();
                }
              },
              error: (err) => {
                this.toastr.error('Error al cargar los detalles de actividad.', 'Error');
                console.error('Error fetching activity details', err);
              }
            });
          },
          error: (err) => {
            this.toastr.error('Error al crear las formulaciones OODD.', 'Error');
            console.error('Error creating OODD formulations', err);
          }
        });
      },
      error: (err) => {
        this.toastr.error('Error al cargar la lista de dependencias.', 'Error');
        console.error('Error fetching dependencies', err);
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


// Mira el adm-maestro-gcspe. Quiero que agregues la funcionalidad de "Iniciar formulación para prestaciones económicas" y "Nueva Modificatoria para prestaciones económicas".

// PERO HAY CONSIDERACIONES DISTINTAS.
// 1. FormulationType es 4
// 2. Se debe generar para los de dependencyType = 3
// 3. En la modificatoria no es por el campo quarter, sino por month que es del 1 al 12