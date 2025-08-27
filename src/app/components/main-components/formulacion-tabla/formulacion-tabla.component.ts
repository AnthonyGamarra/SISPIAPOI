import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AnimationOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { StrategicActionService } from '../../../core/services/logic/strategic-action.service';
import { FinancialFundService } from '../../../core/services/logic/financial-fund.service';
import { ManagementCenterService } from '../../../core/services/logic/management-center.service';
import { CostCenterService } from '../../../core/services/logic/cost-center.service';
import { MeasurementTypeService } from '../../../core/services/logic/measurement-type.service';
import { PriorityService } from '../../../core/services/logic/priority.service';
import { OperationalActivityService } from '../../../core/services/logic/operational-activity.service';
import { GoalService } from '../../../core/services/logic/goal.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';

// Middlewares
import { SapCodeGeneratorMiddleware } from './middlewares/sap-code-generator.middleware';
import { ActivityValidatorMiddleware } from './middlewares/activity-validator.middleware';

// Subcomponentes
import { FormulacionOspesTablaComponent } from './formulacion-ospes-tabla/formulacion-ospes-tabla.component';
import { FormulacionSocialesTablaComponent } from './formulacion-sociales-tabla/formulacion-sociales-tabla.component';

import { StrategicObjective } from '../../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../../models/logic/strategicAction.model';
import { FinancialFund } from '../../../models/logic/financialFund.model';
import { ManagementCenter } from '../../../models/logic/managementCenter.model';
import { CostCenter } from '../../../models/logic/costCenter.model';
import { MeasurementType } from '../../../models/logic/measurementType.model';
import { Priority } from '../../../models/logic/priority.model';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';
import { Goal } from '../../../models/logic/goal.model';
import { Formulation } from '../../../models/logic/formulation.model';
import { ExecutedGoal } from '../../../models/logic/executedGoal.model';
import { MonthlyGoal } from '../../../models/logic/monthlyGoal.model';
import { MonthlyBudget } from '../../../models/logic/monthlyBudget.model';

import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface Accion {
  id?: number;
  nombre: string;
}

@Component({
  selector: 'app-formulacion-tabla',
  templateUrl: './formulacion-tabla.component.html',
  styleUrls: ['./formulacion-tabla.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    TagModule,
    DialogModule,
    SelectButtonModule,
    LottieComponent,
    TextareaModule,
    TooltipModule,
    ProgressSpinnerModule,
    FormulacionOspesTablaComponent,
    FormulacionSocialesTablaComponent
  ]
})
export class FormulacionTablaComponent implements OnInit, OnChanges {

  @Output() activitiesCountChanged = new EventEmitter<number>();

  @Input() mostrar = false;
  @Input() ano: string | null = null;
  @Input() idFormulation: number | null = null;
  @Input() idDependency: string | null = null;
  // This is the key input for reacting to state changes
  @Input() currentFormulation: Formulation | null = null;

  quarter: number | null = null;
  state: number | null = null; // Stores the idFormulationState
  active: boolean | null = null;
  stateName: string | null = null; // Stores the name of the formulation state for display/logic
  selectedSize: any = 'small';
  sizes!: any[];

  @Output() seleccionCambio = new EventEmitter<Accion>();

  products: OperationalActivity[] = [];
  clonedProducts: { [s: string]: OperationalActivity } = {};

  strategicObjectives: StrategicObjective[] = [];
  strategicActions: StrategicAction[] = [];
  filteredStrategicActions: StrategicAction[] = [];
  financialFunds: FinancialFund[] = [];
  managementCenters: ManagementCenter[] = [];
  costCenters: CostCenter[] = [];
  measurementTypes: MeasurementType[] = [];
  priorities: Priority[] = [];
  editingRowKeys: { [s: string]: boolean } = {};
  showDeleteConfirmation: boolean = false;
  activityToDelete: OperationalActivity | null = null;
  activityToDeleteIndex: number | null = null;

  selectedProductForOeAe: OperationalActivity | null = null;
  displayOeAeModal: boolean = false;
  tempSelectedStrategicObjectiveId: number | null = null;
  tempSelectedStrategicActionId: number | null = null;
  year: number | null = null;

  // Flags to control UI elements based on formulation state
  canEdit: boolean = false;
  canAdd: boolean = false;
  canDelete: boolean = false;

  // Loading states
  isLoadingActivities: boolean = false;
  isSearchingFormulation: boolean = false;
  isLoadingFormulation: boolean = false;
  hasSearchedFormulation: boolean = false; // Nueva variable para saber si ya se buscó

  private strategicActionService = inject(StrategicActionService);
  private financialFundService = inject(FinancialFundService);
  private managementCenterService = inject(ManagementCenterService);
  private costCenterService = inject(CostCenterService);
  private measurementTypeService = inject(MeasurementTypeService);
  private priorityService = inject(PriorityService);
  private operationalActivityService = inject(OperationalActivityService);
  private goalService = inject(GoalService);
  private toastr = inject(ToastrService);
  private strategicObjectiveService = inject(StrategicObjectiveService);
  private formulationService = inject(FormulationService);

  // Middleware injections
  private sapCodeGenerator = inject(SapCodeGeneratorMiddleware);
  private activityValidator = inject(ActivityValidatorMiddleware);

  private newActivityCounter: number = -1;

  private lastSelectedAno: string | null = null;
  private lastSelectedDependency: string | null = null;

  options: AnimationOptions = {
    path: 'resources/warning-allert.json'
  };

  ngOnInit(): void {
    this.sizes = [
      { name: 'Pequeño', value: 'small' },
      { name: 'Mediano', value: undefined },
      { name: 'Grande', value: 'large' }
    ];
  }

  // --- Core Data Loading and Reactivity ---
  ngOnChanges(changes: SimpleChanges): void {
    // 1. Manejar cambios en 'currentFormulation'
    if (changes['currentFormulation']) {
      const newFormulation = changes['currentFormulation'].currentValue;
      const oldFormulation = changes['currentFormulation'].previousValue;

      // Si recibimos una formulación válida
      if (newFormulation && newFormulation.idFormulation) {
        // Resetear todos los estados de búsqueda
        this.isSearchingFormulation = false;
        this.isLoadingFormulation = false;
        this.hasSearchedFormulation = true;

        // Cargar datos de la formulación
        this.idFormulation = newFormulation.idFormulation;
        this.ano = newFormulation.year?.toString() ?? null;
        this.idDependency = newFormulation.dependency?.idDependency?.toString() ?? null;
        this.lastSelectedAno = this.ano;
        this.lastSelectedDependency = this.idDependency;
        this.quarter = newFormulation.quarter || null;
        this.state = newFormulation.formulationState?.idFormulationState || null;
        this.stateName = newFormulation.formulationState?.name || null;
        this.active = newFormulation.active;

        this.updatePermissions();

        // Verificar si la formulación realmente cambió
        const hasFormulationChanged = newFormulation?.idFormulation !== oldFormulation?.idFormulation ||
          newFormulation?.modification !== oldFormulation?.modification ||
          newFormulation?.formulationState?.idFormulationState !== oldFormulation?.formulationState?.idFormulationState;

        // Cargar datos si la formulación cambió (sin importar mostrar)
        if (hasFormulationChanged) {
          console.log('Cargando datos para nueva formulación:', newFormulation.idFormulation);
          this.cargarDatos();
          this.loadCombos();
          this.loadOperationalActivities();
        }
        // O si se está mostrando por primera vez y no había formulación antes
        else if (changes['mostrar'] && changes['mostrar'].currentValue === true && !changes['mostrar'].previousValue && !oldFormulation) {
          console.log('Cargando datos para primera visualización');
          this.cargarDatos();
          this.loadCombos();
          this.loadOperationalActivities();
        }
      }
      // Si recibimos null/undefined (no se encontró formulación)
      else {
        // SIEMPRE resetear estados de búsqueda cuando se recibe null/undefined
        this.isSearchingFormulation = false;
        this.isLoadingFormulation = false;
        this.hasSearchedFormulation = true;
        this.clearFormulationDetails(false); // No resetear hasSearchedFormulation
      }
    }

    // 2. Manejar cambios en año - Solo para estado de UI
    if (changes['ano']) {
      const newAno = changes['ano'].currentValue;
      this.lastSelectedAno = newAno;

      // Si no hay formulación actual, actualizar año local
      if (!this.currentFormulation) {
        this.ano = newAno;
      }

      // Si tenemos año y dependencia pero no formulación, mostrar estado de búsqueda
      if (newAno && this.idDependency && !this.currentFormulation) {
        this.isSearchingFormulation = true;
        this.isLoadingFormulation = false;
        this.hasSearchedFormulation = false;
      }
      // Si no tenemos año, resetear estados
      else if (!newAno) {
        this.isSearchingFormulation = false;
        this.hasSearchedFormulation = false;
      }
    }

    // 3. Manejar cambios en dependencia - Solo para estado de UI
    if (changes['idDependency']) {
      const newDependency = changes['idDependency'].currentValue;
      this.lastSelectedDependency = newDependency;

      // Si no hay formulación actual, actualizar dependencia local
      if (!this.currentFormulation) {
        this.idDependency = newDependency;
      }

      // Si tenemos año y dependencia pero no formulación, mostrar estado de búsqueda
      if (newDependency && this.ano && !this.currentFormulation) {
        this.isSearchingFormulation = true;
        this.isLoadingFormulation = false;
        this.hasSearchedFormulation = false;
      }
      // Si no tenemos dependencia, resetear estados
      else if (!newDependency) {
        this.isSearchingFormulation = false;
        this.hasSearchedFormulation = false;
      }
    }

    // 4. Manejar cambios en 'mostrar'
    if (changes['mostrar']) {
      const isShowing = changes['mostrar'].currentValue;
      const wasShowing = changes['mostrar'].previousValue;

      if (isShowing && !wasShowing) {
        // Si se está mostrando y hay formulación, cargar datos
        if (this.currentFormulation && this.currentFormulation.idFormulation) {
          this.cargarDatos();
          this.loadCombos();
          this.loadOperationalActivities();
        }
      } else if (!isShowing && wasShowing) {
        // Si se está ocultando, limpiar todo
        this.clearFormulationDetails(true);
      }
    }
  }
  // Helper to update permissions based on the current state
  updatePermissions(): void {
    if (this.state && this.active) {
      const allowedStates = [1, 3];
      const allowedActive = true;
      const hasPermission = allowedStates.includes(this.state) && allowedActive === true;
      this.canEdit = hasPermission;
      this.canAdd = hasPermission;
      this.canDelete = hasPermission;
    }
  }
  clearFormulationDetails(resetSearchedFlag: boolean = true): void {
    this.quarter = null;
    this.state = null;
    this.stateName = null;
    this.active = null;
    this.products = [];
    this.isLoadingActivities = false;
    this.isLoadingFormulation = false;
    this.isSearchingFormulation = false;
    
    // Only reset hasSearchedFormulation if explicitly requested
    if (resetSearchedFlag) {
      this.hasSearchedFormulation = false;
    }

    // Usar los últimos valores seleccionados para mantener la información de la selección
    this.ano = this.lastSelectedAno;
    this.idDependency = this.lastSelectedDependency;

    this.idFormulation = null;
    this.updatePermissions();

    // Emitir que no hay actividades
    this.activitiesCountChanged.emit(0);
  }

  // Getters para el template
  get displayAno(): string | null {
    return this.ano || this.lastSelectedAno;
  }

  get displayDependency(): string | null {
    return this.idDependency || this.lastSelectedDependency;
  }

  // --- Data Loading Methods ---
  loadFormulationDetails(): void {
    if (this.idFormulation) {
      this.formulationService.getById(this.idFormulation).subscribe({
        next: (formulation: Formulation) => {
          this.currentFormulation = formulation; // Set the currentFormulation for consistency
          this.quarter = formulation.quarter || null;
          this.state = formulation.formulationState?.idFormulationState || null;
          this.stateName = formulation.formulationState?.name || null;
          this.active = formulation.active || null;
          this.updatePermissions(); // Update permissions after loading state
        },
        error: (err) => {
          this.toastr.error('Error al cargar detalles de la formulación.', 'Error');
          this.clearFormulationDetails(true); // Reset search flag on error
        }
      });
    }
  }

  // En tu componente, dentro de la clase

  loadCombos(): void {
    const dependencyId = this.idDependency ? Number(this.idDependency) : null;

    forkJoin({
      strategicObjectives: this.strategicObjectiveService.getAll(),
      strategicActions: this.strategicActionService.getAll(),
      financialFunds: this.financialFundService.getAll(),
      measurementTypes: this.measurementTypeService.getAll(),
      priorities: this.priorityService.getAll(),
      managementCenters: this.managementCenterService.getAll(),
      costCenters: this.costCenterService.getAll(),
    }).subscribe({
      next: ({ strategicObjectives, strategicActions, financialFunds, measurementTypes, priorities, managementCenters, costCenters }) => {
        // 1. Filtrar, ordenar y formatear los Objetivos Estratégicos SOLO por startYear === año de la formulación
        const year = this.year || (this.ano ? parseInt(this.ano, 10) : null);
        this.strategicObjectives = strategicObjectives
          .filter(obj => year !== null && obj.startYear === year)
          .sort((a, b) => parseInt(a.code ?? '0', 10) - parseInt(b.code ?? '0', 10))
          .map(obj => ({
            ...obj,
            name: `O.E.${obj.code}: ${obj.name}`
          }));

        // 2. Formatear y ordenar las Acciones Estratégicas
        this.strategicActions = strategicActions
          .sort((a, b) => parseInt(a.code ?? '0', 10) - parseInt(b.code ?? '0', 10))
          .map(action => ({
            ...action,
            name: `A.E.${action.code}: ${action.name}`
          }));

        // 3. Formatear los Fondos Financieros (FF)
        const filteredFinancialFunds = dependencyId
          ? financialFunds.filter(ff => ff.dependency?.idDependency === dependencyId)
          : financialFunds;
        this.financialFunds = filteredFinancialFunds.map(ff => ({
          ...ff,
          name: `${ff.codFofi}: ${ff.name}`
        }));

        this.measurementTypes = measurementTypes;
        this.priorities = priorities;

        // 4. Formatear los Centros de Costo (CC) y filtrar por dependencia
        const filteredCostCenters = dependencyId
          ? costCenters.filter(cc => cc.dependency?.idDependency === dependencyId)
          : costCenters;

        this.costCenters = filteredCostCenters.map(cc => ({
          ...cc,
          name: `${cc.costCenterCode}: ${cc.name}`
        }));

        // 5. Los Centros de Gestión (MC) se filtran y asignan como estaban, ya que no se pidió formatearlos
        this.managementCenters = dependencyId
          ? managementCenters.filter(mc => mc.dependency?.idDependency === dependencyId)
          : managementCenters;
      },
      error: (err) => {
        this.toastr.error('Error al cargar combos de la tabla.', 'Error de Carga');
      }
    });
  }

  loadOperationalActivities(): void {
    if (!this.idFormulation) {
      this.products = []; // Clear products if no formulation ID
      this.activitiesCountChanged.emit(0);
      return;
    }

    this.isLoadingActivities = true;
    this.operationalActivityService.searchByFormulation(this.idFormulation).subscribe({
      next: (data) => {
        // Ordenar por activity.correlativeCode (ascendente)
        data.sort((a, b) => {
          const codeA = a.idOperationalActivity?.toString() || '';
          const codeB = b.idOperationalActivity?.toString() || '';
          return codeA.localeCompare(codeB, undefined, { numeric: true });
        });

        this.products = data.map(activity => {
          // Initialize goals
          const loadedGoals = activity.goals || [];
          activity.goals = Array.from({ length: 4 }, (_, i) => {
            const existingGoal = loadedGoals.find(g => g.goalOrder === i + 1);
            return existingGoal
              ? { ...existingGoal, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } as OperationalActivity }
              : { goalOrder: i + 1, value: 0, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } } as Goal;
          });
          activity.goals.sort((a, b) => a.goalOrder - b.goalOrder);

          // Initialize executedGoals
          const loadedExecutedGoals = activity.executedGoals || [];
          activity.executedGoals = Array.from({ length: 4 }, (_, i) => {
            const existingExecutedGoal = loadedExecutedGoals.find(eg => eg.goalOrder === i + 1);
            return existingExecutedGoal
              ? { ...existingExecutedGoal, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } as OperationalActivity }
              : { goalOrder: i + 1, value: 0, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } } as ExecutedGoal;
          });
          activity.executedGoals.sort((a, b) => a.goalOrder - b.goalOrder);

          return activity;
        });
        this.isLoadingActivities = false;
        this.activitiesCountChanged.emit(this.products.length);
      },
      error: () => {
        this.toastr.error('Error al cargar actividades operativas.', 'Error');
        this.products = []; // Clear products on error
        this.isLoadingActivities = false;
        this.activitiesCountChanged.emit(0);
      }
    });
  }


  cargarDatos() {
    const year = parseInt(this.ano!, 10);
    this.year = year;

    this.strategicObjectiveService.getAll().subscribe((objectives: StrategicObjective[]) => {
      // Solo mostrar los OE cuyo startYear coincide exactamente con el año de la formulación y ordenados por code ascendente
      this.strategicObjectives = objectives
        .filter(obj => obj.startYear === year)
        .sort((a, b) => parseInt(a.code ?? '0', 10) - parseInt(b.code ?? '0', 10));
    });
  }

  @ViewChild('dataTable') table!: Table;
  @ViewChild('ospesTabla') ospesTabla!: FormulacionOspesTablaComponent;
  @ViewChild('socialesTabla') socialesTabla!: FormulacionSocialesTablaComponent;
  
  // Método para notificar cambios en actividades a los modales
  private notifyActivityChangesToModal(): void {
    // Notificar al modal de prestaciones económicas
    if (this.ospesTabla && this.ospesTabla.displayModal) {
      setTimeout(() => {
        this.ospesTabla.reloadData();
      }, 500);
    }
    
    // Notificar al modal de prestaciones sociales
    if (this.socialesTabla && this.socialesTabla.displayModal) {
      setTimeout(() => {
        this.socialesTabla.reloadData();
      }, 500);
    }
  }
  // --- Action Methods ---
  agregarActividad(): void {
    if (!this.canAdd) {
      this.toastr.warning('No se pueden agregar actividades en el estado actual de la formulación.', 'Acción no permitida');
      return;
    }

    const nuevaActividad: OperationalActivity = {
      idOperationalActivity: this.newActivityCounter--,
      active: true,
      sapCode: '',
      correlativeCode: '',
      name: '',
      description: '',
      measurementUnit: '',
      strategicAction: { strategicObjective: {} as StrategicObjective } as StrategicAction,
      financialFund: {} as FinancialFund,
      managementCenter: {} as ManagementCenter,
      costCenter: {} as CostCenter,
      measurementType: {} as MeasurementType,
      priority: {} as Priority,
      goods: 0,
      remuneration: 0,
      services: 0,
      formulation: { idFormulation: this.idFormulation } as Formulation,
      goals: [
        { goalOrder: 1, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 2, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 3, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 4, value: 0, operationalActivity: {} } as Goal
      ],
      executedGoals: [
        { goalOrder: 1, value: 0, operationalActivity: {} } as ExecutedGoal,
        { goalOrder: 2, value: 0, operationalActivity: {} } as ExecutedGoal,
        { goalOrder: 3, value: 0, operationalActivity: {} } as ExecutedGoal,
        { goalOrder: 4, value: 0, operationalActivity: {} } as ExecutedGoal
      ],
    };

    this.products = [...this.products, nuevaActividad];
    this.editingRowKeys[nuevaActividad.idOperationalActivity as any] = true;

    // Navegar a la página donde está la nueva actividad
    setTimeout(() => {
      if (this.table) {
        const newItemIndex = this.products.length - 1;
        const rowsPerPage = this.table.rows || 6;
        const targetPage = Math.floor(newItemIndex / rowsPerPage);

        if (this.table.first !== targetPage * rowsPerPage) {
          this.table.first = targetPage * rowsPerPage;
        }
      }
    }, 0);
  }

  eliminarActividad(index: number, product: OperationalActivity): void {
    if (!this.canDelete) {
      this.toastr.warning('No se pueden eliminar actividades en el estado actual de la formulación.', 'Acción no permitida');
      return;
    }

    if (product.idOperationalActivity && product.idOperationalActivity > 0) {
      this.activityToDelete = product;
      this.activityToDeleteIndex = index;
      this.showDeleteConfirmation = true;
    } else {
      // It's a new (unsaved) activity, remove directly from the table
      this.products.splice(index, 1);
      this.products = [...this.products]; // Force change detection for the table
      this.toastr.info('Actividad no guardada eliminada.', 'Información');
    }
  }

  confirmDelete(): void {
    if (this.activityToDelete && this.activityToDelete.idOperationalActivity) {
      this.operationalActivityService.deleteById(this.activityToDelete.idOperationalActivity).subscribe({
        next: () => {
          if (this.activityToDeleteIndex !== null) {
            // Solo eliminar del array local, sin recargar
            this.products.splice(this.activityToDeleteIndex, 1);
            this.products = [...this.products]; // Trigger change detection
          }
          this.toastr.success('Actividad eliminada exitosamente.', 'Éxito');
          this.notifyActivityChangesToModal(); // Notificar cambios al modal
          this.showDeleteConfirmation = false;
          this.activityToDelete = null;
          this.activityToDeleteIndex = null;
        },
        error: (errorResponse) => {
          const errorMessage = errorResponse?.error?.message || 'Error desconocido al eliminar la actividad.';
          this.toastr.error(`Error al eliminar la actividad: ${errorMessage}`, 'Error');
          this.showDeleteConfirmation = false;
          this.activityToDelete = null;
          this.activityToDeleteIndex = null;
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.activityToDelete = null;
    this.activityToDeleteIndex = null;
  }

  private validateActivity(product: OperationalActivity): boolean {
    return this.activityValidator.validateActivity(product);
  }

  onRowEditSave(product: OperationalActivity) {
    if (!this.canEdit) {
      this.toastr.warning('No se pueden guardar cambios en el estado actual de la formulación.', 'Acción no permitida');
      return;
    }

    if (!this.idFormulation) {
      this.toastr.error('No hay una formulación seleccionada.', 'Error');
      return;
    }

    if (!this.validateActivity(product)) {
      return;
    }

    const strategicActionId = product.strategicAction?.idStrategicAction;
    const strategicObjectiveId = product.strategicAction?.strategicObjective?.idStrategicObjective;

    if (!strategicActionId || !strategicObjectiveId) {
      this.toastr.error('Debe seleccionar un Objetivo Estratégico y una Acción Estratégica.', 'Error de validación');
      return;
    }

    const { goals, executedGoals, ...activityWithoutGoals } = product;

    const baseActividad: OperationalActivity = {
      ...activityWithoutGoals,
      strategicAction: {
        idStrategicAction: strategicActionId,
        strategicObjective: { idStrategicObjective: strategicObjectiveId } as StrategicObjective
      } as StrategicAction,
      formulation: { idFormulation: this.idFormulation } as Formulation,
      sapCode: product.sapCode || '',
      correlativeCode: product.correlativeCode || ''
    };

    // Para creación/actualización: solo enviar objetos con IDs válidos, omitir campos vacíos
    if (product.financialFund?.idFinancialFund) {
      baseActividad.financialFund = { idFinancialFund: product.financialFund.idFinancialFund } as FinancialFund;
    }
    
    if (product.managementCenter?.idManagementCenter) {
      baseActividad.managementCenter = { idManagementCenter: product.managementCenter.idManagementCenter } as ManagementCenter;
    }
    
    if (product.costCenter?.idCostCenter) {
      baseActividad.costCenter = { idCostCenter: product.costCenter.idCostCenter } as CostCenter;
    }
    
    if (product.measurementType?.idMeasurementType) {
      baseActividad.measurementType = { idMeasurementType: product.measurementType.idMeasurementType } as MeasurementType;
    }
    
    if (product.priority?.idPriority) {
      baseActividad.priority = { idPriority: product.priority.idPriority } as Priority;
    }

    let activityToSave$ = this._generateSapCodeAndCorrelative(product).pipe(
      map(result => ({
        ...baseActividad,
        idOperationalActivity: product.idOperationalActivity || undefined,
        sapCode: result.sapCode,
        correlativeCode: result.correlativeCode
      })),
      catchError(err => {
        this.toastr.error('Error al generar el código SAP y correlativo.', 'Error');
        return of(baseActividad);
      })
    );

    activityToSave$.subscribe({
      next: (finalActivity: OperationalActivity) => {
        if (finalActivity.idOperationalActivity && finalActivity.idOperationalActivity > 0) {
          // UPDATE EXISTING ACTIVITY
          this.operationalActivityService.update(finalActivity).subscribe({
            next: () => {
              // Actualizar solo el elemento específico en el array local usando finalActivity
              const index = this.products.findIndex(p => p.idOperationalActivity === finalActivity.idOperationalActivity);
              if (index !== -1) {
                this.products[index] = { ...finalActivity, goals: goals || [], executedGoals: executedGoals || [] };
                this.products = [...this.products]; // Trigger change detection
              }

              const goalObservables: Observable<any>[] = [];
              if (goals) {
                for (const g of goals) {
                  if (this.quarter !== null && g.goalOrder < this.quarter) {
                    continue;
                  }

                  const goal: Goal = {
                    idGoal: g.idGoal,
                    goalOrder: g.goalOrder,
                    value: g.value,
                    operationalActivity: { idOperationalActivity: finalActivity.idOperationalActivity } as OperationalActivity
                  };

                  if (g.idGoal) {
                    goalObservables.push(this.goalService.update(goal));
                  } else {
                    goalObservables.push(this.goalService.create(goal));
                  }
                }
              }

              if (goalObservables.length > 0) {
                forkJoin(goalObservables).subscribe({
                  next: (updatedGoals) => {
                    // Actualizar las metas en el elemento local
                    if (index !== -1 && updatedGoals) {
                      this.products[index].goals = goals;
                      this.products = [...this.products];
                    }
                    this.toastr.success('Actividad operativa y metas actualizadas.', 'Éxito');
                    this.notifyActivityChangesToModal(); // Notificar cambios al modal
                  },
                  error: (err) => {
                    this.toastr.error('Error al actualizar una o más metas.', 'Error');
                  }
                });
              } else {
                this.toastr.success('Actividad operativa actualizada.', 'Éxito');
                this.notifyActivityChangesToModal(); // Notificar cambios al modal
              }
            },
            error: (err) => {
              this.toastr.error('Error al actualizar la actividad operativa.', 'Error');
            }
          });
        } else {
          // CREATE NEW ACTIVITY
          const { idOperationalActivity, ...activityForCreation } = finalActivity;

          this.operationalActivityService.create(activityForCreation).subscribe({
            next: (actividadCreada: OperationalActivity) => {
              const id = actividadCreada.idOperationalActivity;

              if (id && !isNaN(id)) {
                // Actualizar el elemento en el array local con el ID real
                const index = this.products.findIndex(p => p.idOperationalActivity === product.idOperationalActivity);
                if (index !== -1) {
                  this.products[index] = { ...actividadCreada, goals: goals || [], executedGoals: executedGoals || [] };
                  this.products = [...this.products];
                }

                const goalObservables: Observable<any>[] = [];
                if (goals) {
                  for (const g of goals) {
                    if (this.quarter !== null && g.goalOrder < this.quarter) {
                      continue;
                    }

                    const goal: Goal = {
                      goalOrder: g.goalOrder,
                      value: g.value,
                      operationalActivity: { idOperationalActivity: id } as OperationalActivity
                    };
                    goalObservables.push(this.goalService.create(goal));
                  }
                }

                if (goalObservables.length > 0) {
                  forkJoin(goalObservables).subscribe({
                    next: (createdGoals) => {
                      // Actualizar las metas en el elemento local
                      if (index !== -1 && createdGoals) {
                        this.products[index].goals = goals;
                        this.products = [...this.products];
                      }
                      this.toastr.success('Actividad operativa creada, metas guardadas.', 'Éxito');
                      this.notifyActivityChangesToModal(); // Notificar cambios al modal
                    },
                    error: (err) => {
                      this.toastr.error('Error al guardar las metas de la nueva actividad.', 'Error');
                    }
                  });
                } else {
                  this.toastr.success('Actividad operativa creada.', 'Éxito');
                  this.notifyActivityChangesToModal(); // Notificar cambios al modal
                }
              } else {
                this.toastr.error('El ID devuelto por la creación de la actividad no es válido.', 'Error');
              }
            },
            error: (err) => {
              this.toastr.error('Error al crear la actividad operativa.', 'Error');
            }
          });
        }
      },
      error: (err) => {
        this.toastr.error('No se pudo procesar la actividad debido a un error de código SAP/correlativo.', 'Error');
      }
    });

    delete this.editingRowKeys[product.idOperationalActivity as any];
  }

  onRowEditInit(product: OperationalActivity) {
    if (!this.canEdit) {
      this.toastr.warning('No se pueden editar actividades en el estado actual de la formulación.', 'Acción no permitida');
      return;
    }
    // Store a clone of the product for cancellation purposes
    this.clonedProducts[product.idOperationalActivity as any] = { ...product };
  }

  onRowEditCancel(product: OperationalActivity, index: number) {
    if (product.idOperationalActivity && product.idOperationalActivity > 0) {
      // Revert to original state for existing products
      let clonedProduct = this.clonedProducts[product.idOperationalActivity as any];
      let productIndex = this.products.findIndex(p => p.idOperationalActivity === product.idOperationalActivity);
      if (productIndex !== -1) {
        this.products[productIndex] = clonedProduct;
      }
    } else {
      // Remove newly added (unsaved) products
      this.products.splice(index, 1);
    }
    this.products = [...this.products]; // Force change detection
    delete this.clonedProducts[product.idOperationalActivity as any];
    delete this.editingRowKeys[product.idOperationalActivity as any]; // Remove from editing statea
    this.toastr.info('Actividad no guardada.', 'Información');
  }

  // --- Helper Getters for Display ---
  getStrategicObjectiveName(id?: number): string {
    return this.strategicObjectives.find(o => o.idStrategicObjective === id)?.name || '';
  }

  getStrategicActionName(id?: number): string {
    return this.strategicActions.find(a => a.idStrategicAction === id)?.name || '';
  }

  getStrategicObjectiveCodeDisplay(id?: number): string {
    const obj = this.strategicObjectives.find(o => o.idStrategicObjective === id);
    return obj && obj.code ? `O.E. ${obj.code}` : '';
  }

  getStrategicActionCodeDisplay(id?: number): string {
    const act = this.strategicActions.find(a => a.idStrategicAction === id);
    return act && act.code ? `A.E. ${act.code}` : '';
  }

  getFinancialFundName(id?: number): string {
    return this.financialFunds.find(f => f.idFinancialFund === id)?.name || '';
  }

  getManagementCenterName(id?: number): string {
    return this.managementCenters.find(m => m.idManagementCenter === id)?.name || '';
  }

  getCostCenterName(id?: number): string {
    return this.costCenters.find(c => c.idCostCenter === id)?.name || '';
  }

  getMeasurementTypeName(id?: number): string {
    return this.measurementTypes.find(m => m.idMeasurementType === id)?.name || '';
  }

  getPriorityName(id?: number): string {
    return this.priorities.find(p => p.idPriority === id)?.name || '';
  }

  // --- Modal Logic for OE/AE Selection ---
  openOeAeSelectionModal(product: OperationalActivity) {
    if (!this.canEdit) {
      this.toastr.warning('No se puede modificar la selección de OE/AE en el estado actual de la formulación.', 'Acción no permitida');
      return;
    }
    this.selectedProductForOeAe = product;
    this.tempSelectedStrategicObjectiveId = product.strategicAction?.strategicObjective?.idStrategicObjective || null;
    this.tempSelectedStrategicActionId = product.strategicAction?.idStrategicAction || null;

    if (this.tempSelectedStrategicObjectiveId) {
      this.filterStrategicActions({ strategicAction: { strategicObjective: { idStrategicObjective: this.tempSelectedStrategicObjectiveId } } } as OperationalActivity);
    } else {
      this.filteredStrategicActions = [];
    }

    this.displayOeAeModal = true;
  }

  onModalStrategicObjectiveChange(event: any) {
    this.tempSelectedStrategicObjectiveId = event.value;
    this.tempSelectedStrategicActionId = null; // Clear selected action when objective changes
    this.filterStrategicActions({ strategicAction: { strategicObjective: { idStrategicObjective: this.tempSelectedStrategicObjectiveId } } } as OperationalActivity);
  }

  onModalStrategicActionChange(event: any) {
    this.tempSelectedStrategicActionId = event.value;
  }

  confirmOeAeSelection() {
    if (this.selectedProductForOeAe) {
      const selectedObjective = this.strategicObjectives.find(
        obj => obj.idStrategicObjective === this.tempSelectedStrategicObjectiveId
      );
      const selectedAction = this.strategicActions.find(
        act => act.idStrategicAction === this.tempSelectedStrategicActionId
      );

      if (selectedObjective && selectedAction) {
        this.selectedProductForOeAe.strategicAction = {
          ...selectedAction,
          strategicObjective: selectedObjective
        };
      } else {
        this.toastr.warning('Por favor, selecciona tanto un Objetivo Estratégico como una Acción Estratégica.', 'Selección Incompleta');
        return;
      }
    }
    this.displayOeAeModal = false;
  }

  cancelOeAeSelection() {
    this.displayOeAeModal = false;
    this.selectedProductForOeAe = null;
    this.tempSelectedStrategicObjectiveId = null;
    this.tempSelectedStrategicActionId = null;
  }

  filterStrategicActions(product: OperationalActivity): void {
    if (product.strategicAction?.strategicObjective?.idStrategicObjective) {
      this.filteredStrategicActions = this.strategicActions.filter(
        action => action.strategicObjective?.idStrategicObjective === product.strategicAction?.strategicObjective?.idStrategicObjective
      );
    } else {
      this.filteredStrategicActions = [];
    }
  }

  onSeleccionar(id: number, product: OperationalActivity) {
    // This method seems to be for the inline select in the table, not the modal
    // It updates the product's strategicAction based on the selected ID
    if (!product.strategicAction) {
      product.strategicAction = {} as StrategicAction;
    }
    product.strategicAction.idStrategicAction = id;
    const selectedAction = this.strategicActions.find(a => a.idStrategicAction === id);
    if (selectedAction) {
      // Ensure the strategicObjective is also linked correctly
      product.strategicAction = { ...selectedAction, strategicObjective: selectedAction.strategicObjective || product.strategicAction?.strategicObjective };
    }
  }

  // --- SAP Code Generation Logic ---
  private _generateSapCodeAndCorrelative(activity: OperationalActivity): Observable<{ sapCode: string, correlativeCode: string }> {
    return this.sapCodeGenerator.generateSapCodeAndCorrelative(
      activity,
      this.strategicActions,
      this.strategicObjectives,
      this.costCenters
    );
  }

  // --- Prestaciones Económicas Modal Methods ---
  openPrestacionesEconomicasModal(): void {
    if (this.ospesTabla) {
      this.ospesTabla.openModal();
    }
  }

  // --- Prestaciones Sociales Modal Methods ---
  openPrestacionesSocialesModal(): void {
    if (this.socialesTabla) {
      this.socialesTabla.openModal();
    }
  }

  // Función para inicializar objetos nulos/undefined
  private initializeActivityObjects(activity: OperationalActivity): OperationalActivity {
    return {
      ...activity,
      managementCenter: activity.managementCenter || {} as ManagementCenter,
      costCenter: activity.costCenter || {} as CostCenter,
      financialFund: activity.financialFund || {} as FinancialFund,
      measurementType: activity.measurementType || {} as MeasurementType,
      priority: activity.priority || {} as Priority
    };
  }

  // Método para recibir actividades creadas/actualizadas desde el consolidado
  onActivitiesCreatedFromConsolidated(activities: OperationalActivity[]): void {
    if (!activities?.length) {
      return;
    }

    const newActivities: OperationalActivity[] = [];
    const updatedActivities: OperationalActivity[] = [];
    const activitiesToCreatePhysically: OperationalActivity[] = [];

    activities.forEach(activity => {
      // Inicializar objetos para evitar errores de null/undefined
      const initializedActivity = this.initializeActivityObjects(activity);
      
      // Si no tiene ID, necesita creación física
      if (!initializedActivity.idOperationalActivity) {
        activitiesToCreatePhysically.push(initializedActivity);
        return;
      }

      // Si es un ID real (positivo), verificar si existe para actualizar
      if (initializedActivity.idOperationalActivity > 0) {
        const existingIndex = this.products.findIndex(p => 
          p.idOperationalActivity === initializedActivity.idOperationalActivity
        );

        if (existingIndex >= 0) {
          // Actualizar actividad existente físicamente
          this.updateActivityPhysically(initializedActivity);
          this.products[existingIndex] = { ...initializedActivity };
          updatedActivities.push(initializedActivity);
        }
      } else {
        // ID temporal negativo - agregar a la vista temporalmente
        const existingIndex = this.products.findIndex(p => 
          p.idOperationalActivity === initializedActivity.idOperationalActivity
        );

        if (existingIndex >= 0) {
          this.products[existingIndex] = { ...initializedActivity };
          updatedActivities.push(initializedActivity);
        } else {
          newActivities.push(initializedActivity);
        }
      }
    });

    // Crear actividades físicamente si es necesario
    if (activitiesToCreatePhysically.length > 0) {
      this.createActivitiesPhysically(activitiesToCreatePhysically);
    }

    // Agregar solo las nuevas actividades temporales
    if (newActivities.length > 0) {
      this.products = [...this.products, ...newActivities];
    }

    // Actualizar el contador de actividades
    this.activitiesCountChanged.emit(this.products.length);

    // Mostrar mensaje apropiado
    if (activitiesToCreatePhysically.length > 0) {
      this.toastr.success(
        `Se crearon físicamente ${activitiesToCreatePhysically.length} actividades consolidadas`,
        'Creación física'
      );
    } else if (newActivities.length > 0 && updatedActivities.length > 0) {
      this.toastr.info(
        `Consolidado: ${newActivities.length} nuevas, ${updatedActivities.length} actualizadas`,
        'Auto-sincronización'
      );
    } else if (newActivities.length > 0) {
      this.toastr.success(
        `Se crearon automáticamente ${newActivities.length} actividades`,
        'Auto-creación'
      );
    } else if (updatedActivities.length > 0) {
      this.toastr.info(
        `Se actualizaron ${updatedActivities.length} actividades`,
        'Auto-actualización'
      );
    }

    // Navegar a la última página solo si hay nuevas actividades
    if (newActivities.length > 0 || activitiesToCreatePhysically.length > 0) {
      setTimeout(() => {
        if (this.table && this.table.paginator) {
          const totalPages = Math.ceil(this.products.length / (this.table.rows || 6));
          this.table.first = (totalPages - 1) * (this.table.rows || 6);
        }
      }, 100);
    }

    // Forzar detección de cambios
    this.products = [...this.products];
  }

  // Método para crear actividades físicamente en la base de datos
  private createActivitiesPhysically(activities: OperationalActivity[]): void {
    if (!activities?.length) {
      return;
    }

    activities.forEach(activity => {
      // Limpiar actividad antes de enviar: omitir campos vacíos para creación
      const activityToCreate = { ...activity };
      
      // Para creación: eliminar campos que están vacíos para evitar enviar objetos {}
      if (!activityToCreate.managementCenter?.idManagementCenter) {
        delete activityToCreate.managementCenter;
      }
      if (!activityToCreate.costCenter?.idCostCenter) {
        delete activityToCreate.costCenter;
      }
      if (!activityToCreate.financialFund?.idFinancialFund) {
        delete activityToCreate.financialFund;
      }
      if (!activityToCreate.measurementType?.idMeasurementType) {
        delete activityToCreate.measurementType;
      }
      if (!activityToCreate.priority?.idPriority) {
        delete activityToCreate.priority;
      }
      
      this.operationalActivityService.create(activityToCreate).subscribe({
        next: (createdActivity) => {
          // Reemplazar la actividad temporal con la actividad creada
          const tempIndex = this.products.findIndex(p => 
            p.name === activity.name && 
            p.description === activity.description &&
            p.active === false
          );
          
          if (tempIndex >= 0) {
            this.products[tempIndex] = createdActivity;
            this.products = [...this.products]; // Forzar detección de cambios
          } else {
            // Si no se encuentra, agregar la actividad creada
            this.products.push(createdActivity);
            this.products = [...this.products];
          }
        },
        error: (err) => {
          console.error('Error creating consolidated activity physically:', err);
          this.toastr.error(`Error al crear actividad: ${activity.name}`, 'Error de creación');
        }
      });
    });
  }

  // Método para actualizar actividad físicamente en la base de datos
  private updateActivityPhysically(activity: OperationalActivity): void {
    if (!activity?.idOperationalActivity) {
      return;
    }

    // Preparar actividad para actualización: solo enviar objetos con IDs, omitir campos vacíos
    const activityToUpdate = { ...activity };
    
    if (activityToUpdate.managementCenter?.idManagementCenter) {
      activityToUpdate.managementCenter = { idManagementCenter: activityToUpdate.managementCenter.idManagementCenter } as ManagementCenter;
    } else {
      delete activityToUpdate.managementCenter;
    }
    
    if (activityToUpdate.costCenter?.idCostCenter) {
      activityToUpdate.costCenter = { idCostCenter: activityToUpdate.costCenter.idCostCenter } as CostCenter;
    } else {
      delete activityToUpdate.costCenter;
    }
    
    if (activityToUpdate.financialFund?.idFinancialFund) {
      activityToUpdate.financialFund = { idFinancialFund: activityToUpdate.financialFund.idFinancialFund } as FinancialFund;
    } else {
      delete activityToUpdate.financialFund;
    }
    
    if (activityToUpdate.measurementType?.idMeasurementType) {
      activityToUpdate.measurementType = { idMeasurementType: activityToUpdate.measurementType.idMeasurementType } as MeasurementType;
    } else {
      delete activityToUpdate.measurementType;
    }
    
    if (activityToUpdate.priority?.idPriority) {
      activityToUpdate.priority = { idPriority: activityToUpdate.priority.idPriority } as Priority;
    } else {
      delete activityToUpdate.priority;
    }

    this.operationalActivityService.update(activityToUpdate).subscribe({
      next: (updatedActivity) => {
        console.log('Actividad consolidada actualizada físicamente:', updatedActivity);
      },
      error: (err) => {
        console.error('Error updating consolidated activity physically:', err);
        this.toastr.error(`Error al actualizar actividad: ${activity.name}`, 'Error de actualización');
      }
    });
  }

  // --- Safe Getters y Setters para evitar errores de null/undefined ---
  getManagementCenterId(product: OperationalActivity): number | null {
    return product.managementCenter?.idManagementCenter ?? null;
  }

  setManagementCenterId(product: OperationalActivity, value: number | null): void {
    if (!product.managementCenter) {
      product.managementCenter = {} as ManagementCenter;
    }
    product.managementCenter.idManagementCenter = value ?? undefined;
  }

  getCostCenterId(product: OperationalActivity): number | null {
    return product.costCenter?.idCostCenter ?? null;
  }

  setCostCenterId(product: OperationalActivity, value: number | null): void {
    if (!product.costCenter) {
      product.costCenter = {} as CostCenter;
    }
    product.costCenter.idCostCenter = value ?? undefined;
  }

  getFinancialFundId(product: OperationalActivity): number | null {
    return product.financialFund?.idFinancialFund ?? null;
  }

  setFinancialFundId(product: OperationalActivity, value: number | null): void {
    if (!product.financialFund) {
      product.financialFund = {} as FinancialFund;
    }
    product.financialFund.idFinancialFund = value ?? undefined;
  }

  getMeasurementTypeId(product: OperationalActivity): number | null {
    return product.measurementType?.idMeasurementType ?? null;
  }

  setMeasurementTypeId(product: OperationalActivity, value: number | null): void {
    if (!product.measurementType) {
      product.measurementType = {} as MeasurementType;
    }
    product.measurementType.idMeasurementType = value ?? undefined;
  }

  getPriorityId(product: OperationalActivity): number | null {
    return product.priority?.idPriority ?? null;
  }

  setPriorityId(product: OperationalActivity, value: number | null): void {
    if (!product.priority) {
      product.priority = {} as Priority;
    }
    product.priority.idPriority = value ?? undefined;
  }

}