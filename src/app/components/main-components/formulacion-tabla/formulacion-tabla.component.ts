import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
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
import { Dependency } from '../../../models/logic/dependency.model';
import { ExecutedGoal } from '../../../models/logic/executedGoal.model';

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
    DropdownModule,
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
    ProgressSpinnerModule
  ]
})
export class FormulacionTablaComponent implements OnInit, OnChanges {

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

  private newActivityCounter: number = -1;

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

  isLoadingFormulation: boolean = false;
  @Input() isLoadingFormulationExternal: boolean = false; // Nuevo input para loading externo


  // --- Core Data Loading and Reactivity ---
  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar loading externo primero
    if (changes['isLoadingFormulationExternal']) {
      this.isLoadingFormulation = changes['isLoadingFormulationExternal'].currentValue;
    }

    // Priority 1: Handle changes to 'currentFormulation' itself.
    if (changes['currentFormulation']) {
      const newFormulation = changes['currentFormulation'].currentValue;
      const oldFormulation = changes['currentFormulation'].previousValue;

      const hasFormulationChanged = newFormulation?.idFormulation !== oldFormulation?.idFormulation ||
        newFormulation?.modification !== oldFormulation?.modification ||
        newFormulation?.formulationState?.idFormulationState !== oldFormulation?.formulationState?.idFormulationState;

      if (newFormulation && newFormulation.idFormulation) {
        // Formulación encontrada y válida
        this.isLoadingFormulation = false;
        this.idFormulation = newFormulation.idFormulation;
        this.ano = newFormulation.year?.toString() ?? null;
        this.idDependency = newFormulation.dependency?.idDependency?.toString() ?? null;
        this.quarter = newFormulation.quarter || null;
        this.state = newFormulation.formulationState?.idFormulationState || null;
        this.stateName = newFormulation.formulationState?.name || null;
        this.active = newFormulation.active;

        this.updatePermissions();

        if (hasFormulationChanged || (changes['mostrar'] && changes['mostrar'].currentValue === true && !changes['mostrar'].previousValue)) {
          console.log('FormulacionTablaComponent: Loading data for new/updated formulation.');
          this.cargarDatos();
          this.loadCombos();
          this.loadOperationalActivities();
        }
      } else if (newFormulation === null && oldFormulation !== null) {
        // Formulación establecida explícitamente como null (no existe formulación)
        this.isLoadingFormulation = false;
        console.log('FormulacionTablaComponent: No formulation found for the selected criteria.');
        this.clearFormulationDetails();
      }
      // Si newFormulation es undefined, mantiene el estado actual (puede ser loading)
    }

    // Priority 2: Handle 'mostrar' input changing
    else if (changes['mostrar']) {
      const isShowing = changes['mostrar'].currentValue;
      const wasShowing = changes['mostrar'].previousValue;

      if (isShowing && !wasShowing) {
        if (this.currentFormulation && this.currentFormulation.idFormulation) {
          this.isLoadingFormulation = false;
          console.log('FormulacionTablaComponent: Table just became visible, ensuring data is loaded.');
          this.cargarDatos();
          this.loadCombos();
          this.loadOperationalActivities();
        }
      } else if (!isShowing && wasShowing) {
        this.isLoadingFormulation = false;
        console.log('FormulacionTablaComponent: Table just became hidden, clearing data.');
        this.clearFormulationDetails();
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

  clearFormulationDetails(): void {
    this.quarter = null;
    this.state = null;
    this.stateName = null;
    this.active = null;
    this.products = [];
    this.isLoadingActivities = false;
    this.isLoadingFormulation = false;

    // NUEVO: Limpiar también ano e idDependency
    this.ano = null;
    this.idDependency = null;

    this.updatePermissions();
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
          console.error('Error al cargar detalles de la formulación:', err);
          this.clearFormulationDetails();
        }
      });
    }
  }

  // En tu componente, dentro de la clase

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
        console.error('Error loading table combos:', err);
      }
    });
  }

  loadOperationalActivities(): void {
    if (!this.idFormulation) {
      this.products = []; // Clear products if no formulation ID
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
      },
      error: () => {
        this.toastr.error('Error al cargar actividades operativas.', 'Error');
        this.products = []; // Clear products on error
        this.isLoadingActivities = false;
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
  // --- Action Methods ---
  agregarActividad(): void {
    if (!this.canAdd) {
      this.toastr.warning('No se pueden agregar actividades en el estado actual de la formulación.', 'Acción no permitida');
      return;
    }

    const nuevaActividad: OperationalActivity = {
      idOperationalActivity: this.newActivityCounter--,
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
          this.showDeleteConfirmation = false;
          this.activityToDelete = null;
          this.activityToDeleteIndex = null;
        },
        error: (errorResponse) => {
          const errorMessage = errorResponse?.error?.message || 'Error desconocido al eliminar la actividad.';
          this.toastr.error(`Error al eliminar la actividad: ${errorMessage}`, 'Error');
          console.error('Error deleting activity:', errorResponse);
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
    if (!product.name || product.name.trim() === '') {
      this.toastr.error('El campo "Nombre de actividad" no puede estar vacío.', 'Error de validación');
      return false;
    }
    if (!product.measurementUnit || product.measurementUnit.trim() === '') {
      this.toastr.error('El campo "Unidad de medida" no puede estar vacío.', 'Error de validación');
      return false;
    }
    if (!product.strategicAction?.idStrategicAction || !product.strategicAction?.strategicObjective?.idStrategicObjective) {
      this.toastr.error('Debe seleccionar un Objetivo Estratégico y una Acción Estratégica.', 'Error de validación');
      return false;
    }
    if (!product.financialFund?.idFinancialFund) {
      this.toastr.error('Debe seleccionar un Fondo financiero.', 'Error de validación');
      return false;
    }
    if (!product.managementCenter?.idManagementCenter) {
      this.toastr.error('Debe seleccionar un Centro gestor.', 'Error de validación');
      return false;
    }
    if (!product.costCenter?.idCostCenter) {
      this.toastr.error('Debe seleccionar un Centro de costos.', 'Error de validación');
      return false;
    }
    if (!product.measurementType?.idMeasurementType) {
      this.toastr.error('Debe seleccionar un Tipo de medida.', 'Error de validación');
      return false;
    }
    if (!product.priority?.idPriority) {
      this.toastr.error('Debe seleccionar una Prioridad.', 'Error de validación');
      return false;
    }
    // Validate numeric fields for goods, remuneration, services
    if (typeof product.goods !== 'number' || isNaN(product.goods)) {
      this.toastr.error('El campo "Bienes" debe ser un número válido.', 'Error de validación');
      return false;
    }
    if (typeof product.remuneration !== 'number' || isNaN(product.remuneration)) {
      this.toastr.error('El campo "Remuneraciones" debe ser un número válido.', 'Error de validación');
      return false;
    }
    if (typeof product.services !== 'number' || isNaN(product.services)) {
      this.toastr.error('El campo "Servicios" debe ser un número válido.', 'Error de validación');
      return false;
    }

    if (product.goals && product.goals.length === 4) {
      for (let i = 0; i < product.goals.length; i++) {
        const goal = product.goals[i];
        if (typeof goal.value !== 'number' || isNaN(goal.value)) {
          this.toastr.error(`La meta del trimestre ${i + 1} debe ser un número válido.`, 'Error de validación');
          return false;
        }
      }
    } else {
      this.toastr.error('Las metas de los trimestres no están completas.', 'Error de validación');
      return false;
    }

    return true;
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
      financialFund: { idFinancialFund: product.financialFund.idFinancialFund } as FinancialFund,
      managementCenter: { idManagementCenter: product.managementCenter.idManagementCenter } as ManagementCenter,
      costCenter: { idCostCenter: product.costCenter.idCostCenter } as CostCenter,
      measurementType: { idMeasurementType: product.measurementType?.idMeasurementType } as MeasurementType,
      priority: { idPriority: product.priority.idPriority } as Priority,
      sapCode: product.sapCode || '',
      correlativeCode: product.correlativeCode || ''
    };

    let activityToSave$ = this._generateSapCodeAndCorrelative(product).pipe(
      map(result => ({
        ...baseActividad,
        idOperationalActivity: product.idOperationalActivity || undefined,
        sapCode: result.sapCode,
        correlativeCode: result.correlativeCode
      })),
      catchError(err => {
        this.toastr.error('Error al generar el código SAP y correlativo.', 'Error');
        console.error('Error generating SAP code and correlative:', err);
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
                  },
                  error: (err) => {
                    this.toastr.error('Error al actualizar una o más metas.', 'Error');
                    console.error('Error al actualizar metas:', err);
                  }
                });
              } else {
                this.toastr.success('Actividad operativa actualizada.', 'Éxito');
              }
            },
            error: (err) => {
              this.toastr.error('Error al actualizar la actividad operativa.', 'Error');
              console.error('Error al actualizar la actividad operativa:', err);
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
                    },
                    error: (err) => {
                      this.toastr.error('Error al guardar las metas de la nueva actividad.', 'Error');
                      console.error('Error al crear metas para la nueva actividad:', err);
                    }
                  });
                } else {
                  this.toastr.success('Actividad operativa creada.', 'Éxito');
                }
              } else {
                this.toastr.error('El ID devuelto por la creación de la actividad no es válido.', 'Error');
              }
            },
            error: (err) => {
              this.toastr.error('Error al crear la actividad operativa.', 'Error');
              console.error('Error al crear la actividad operativa:', err);
            }
          });
        }
      },
      error: (err) => {
        this.toastr.error('No se pudo procesar la actividad debido a un error de código SAP/correlativo.', 'Error');
        console.error('Error in SAP code generation flow:', err);
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
    // This method seems to be for the inline dropdown in the table, not the modal
    // It updates the product's strategicAction based on the selected ID
    product.strategicAction.idStrategicAction = id;
    const selectedAction = this.strategicActions.find(a => a.idStrategicAction === id);
    if (selectedAction) {
      // Ensure the strategicObjective is also linked correctly
      product.strategicAction = { ...selectedAction, strategicObjective: selectedAction.strategicObjective || product.strategicAction.strategicObjective };
    }
  }

  // --- SAP Code Generation Logic ---
  private _generateSapCodeAndCorrelative(activity: OperationalActivity): Observable<{ sapCode: string, correlativeCode: string }> {
    const selectedStrategicAction = this.strategicActions.find(
      sa => sa.idStrategicAction == activity.strategicAction.idStrategicAction
    );
    const strategicObjectiveCode = this.strategicObjectives.find(
      so => so.idStrategicObjective == selectedStrategicAction?.strategicObjective?.idStrategicObjective
    )?.code || '';
    const strategicActionCode = selectedStrategicAction?.code || '';

    const selectedCostCenter = this.costCenters.find(
      cc => cc.idCostCenter === activity.costCenter.idCostCenter
    );
    const costCenterCode = selectedCostCenter?.costCenterCode || '';

    const formattedObjectiveCode = String(strategicObjectiveCode).padStart(1, '0');
    const formattedActionCode = String(strategicActionCode).padStart(2, '0');
    const formattedCostCenterCode = String(costCenterCode).padStart(10, '0');

    const idCostCenter = activity.costCenter?.idCostCenter;

    if (!idCostCenter) {
      this.toastr.error('ID de Centro de Costos es nulo para generar código SAP.', 'Error');
      return of({ sapCode: '', correlativeCode: '' });
    }

    // --- NEW LOGIC: Check if activity already has a correlativeCode ---
    if (activity.correlativeCode) {
      const existingCorrelativeCode = String(activity.correlativeCode).padStart(3, '0');
      const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${existingCorrelativeCode}`;
      return of({ sapCode: sapCode, correlativeCode: existingCorrelativeCode });
    }
    // --- END NEW LOGIC ---

    return this.operationalActivityService.getHigherCorrelativeCodeByCostCenter(idCostCenter).pipe(
      map(correlativeCodeStr => {
        const currentCorrelative = parseInt(correlativeCodeStr, 10);
        const nextCorrelative = (isNaN(currentCorrelative) ? 0 : currentCorrelative) + 1;
        const formattedActivityId = String(nextCorrelative).padStart(3, '0');

        const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${formattedActivityId}`;

        return { sapCode: sapCode, correlativeCode: formattedActivityId };
      }),
      catchError(err => {
        this.toastr.error('Error al obtener el código correlativo superior para el código SAP.', 'Error');
        console.error('Error fetching higher correlative code:', err);
        return of({ sapCode: '', correlativeCode: '' });
      })
    );
  }

}