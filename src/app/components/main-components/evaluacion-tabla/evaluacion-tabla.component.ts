import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AnimationOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';

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
import { ExecutedGoalService } from '../../../core/services/logic/executed-goal.service'; // NEW: Import ExecutedGoalService

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
  selector: 'app-evaluacion-tabla',
  templateUrl: './evaluacion-tabla.component.html',
  styleUrls: ['./evaluacion-tabla.component.scss'],
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
    LottieComponent
  ]
})
export class EvaluacionTablaComponent implements OnChanges {

  @Input() mostrar = false;
  @Input() ano: string | null = null;
  @Input() idFormulation: number | null = null;
  @Input() idDependency: string | null = null;
  // This is the key input for reacting to state changes
  @Input() currentFormulation: Formulation | null = null;

  quarter: number | null = null;
  state: number | null = null;
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

  private strategicActionService = inject(StrategicActionService);
  private financialFundService = inject(FinancialFundService);
  private managementCenterService = inject(ManagementCenterService);
  private costCenterService = inject(CostCenterService);
  private measurementTypeService = inject(MeasurementTypeService);
  private priorityService = inject(PriorityService);
  private operationalActivityService = inject(OperationalActivityService);
  private goalService = inject(GoalService);
  private executedGoalService = inject(ExecutedGoalService); // NEW: Inject ExecutedGoalService
  private toastr = inject(ToastrService);
  private strategicObjectiveService = inject(StrategicObjectiveService);
  private formulationService = inject(FormulationService);

  private newActivityCounter: number = -1;
  
  options: AnimationOptions = {
    path: 'resources/warning-allert.json'
  };

  ngOnChanges(changes: SimpleChanges) {
    const cambioAno = changes['ano'] && !changes['ano'].firstChange;
    const cambioMostrar = changes['mostrar'];
    const cambioIdDependency = changes['idDependency'];
    

    if (cambioAno || (cambioMostrar && !this.mostrar) || (cambioIdDependency && changes['idDependency'].currentValue === null)) {
      this.products = [];
    }

    if (this.mostrar && this.ano && this.idFormulation) {
      if (changes['idFormulation'] || changes['mostrar']) {
        this.loadFormulationDetails();
      }
      this.cargarDatos();
      this.loadOperationalActivities();
      if (cambioIdDependency || (!changes['idDependency']?.firstChange && this.idDependency !== null)) {
        this.loadCombos();
      }
    }
  }

  ngOnInit(): void {
    this.sizes = [
      { name: 'Pequeño', value: 'small' },
      { name: 'Mediano', value: undefined },
      { name: 'Grande', value: 'large' }
    ];
  }

  loadFormulationDetails(): void {
    if (this.idFormulation) {
      this.formulationService.getById(this.idFormulation).subscribe({
        next: (formulation: Formulation) => {
          this.quarter = formulation.quarter || null;
          this.state = formulation.formulationState?.idFormulationState || null;
        },
        error: (err) => {
          this.toastr.error('Error al cargar detalles de la formulación.', 'Error');
          console.error('Error al cargar detalles de la formulación:', err);
          this.quarter = null;
          this.state = null;
        }
      });
    }
  }

  loadCombos(): void {
    const dependencyId = this.idDependency ? Number(this.idDependency) : null;

    this.strategicActionService.getAll().subscribe(data => this.strategicActions = data);    
    this.measurementTypeService.getAll().subscribe(data => this.measurementTypes = data);
    this.priorityService.getAll().subscribe(data => this.priorities = data);
    this.strategicObjectiveService.getAll().subscribe(data => this.strategicObjectives = data);

    this.financialFundService.getAll().subscribe(data => {
      this.financialFunds = dependencyId
        ? data.filter(ff => ff.dependency?.idDependency === dependencyId)
        : data;
    });

    this.managementCenterService.getAll().subscribe(data => {
      this.managementCenters = dependencyId
        ? data.filter(mc => mc.dependency?.idDependency === dependencyId)
        : data;
    });

    this.costCenterService.getAll().subscribe(data => {
      this.costCenters = dependencyId
        ? data.filter(cc => cc.dependency?.idDependency === dependencyId)
        : data;
    });
  }

  loadOperationalActivities(): void {
    if (!this.idFormulation) return;

    this.operationalActivityService.searchByFormulation(this.idFormulation).subscribe({
      next: (data) => {
        this.products = data.map(activity => {
          // Initialize goals if missing or incomplete, and map existing ones
          const loadedGoals = activity.goals || [];
          activity.goals = Array.from({ length: 4 }, (_, i) => {
            const existingGoal = loadedGoals.find(g => g.goalOrder === i + 1);
            // Crucial Fix: Ensure operationalActivity has the correct ID
            return existingGoal
              ? { ...existingGoal, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } as OperationalActivity }
              : { goalOrder: i + 1, value: 0, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } } as Goal;
          });
          activity.goals.sort((a, b) => a.goalOrder - b.goalOrder); // Ensure correct order

          // Initialize executedGoals if missing or incomplete, and map existing ones
          const loadedExecutedGoals = activity.executedGoals || [];
          activity.executedGoals = Array.from({ length: 4 }, (_, i) => {
            const existingExecutedGoal = loadedExecutedGoals.find(eg => eg.goalOrder === i + 1);
            // Crucial Fix: Ensure operationalActivity has the correct ID
            return existingExecutedGoal
              ? { ...existingExecutedGoal, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } as OperationalActivity }
              : { goalOrder: i + 1, value: 0, operationalActivity: { idOperationalActivity: activity.idOperationalActivity } } as ExecutedGoal;
          });
          activity.executedGoals.sort((a, b) => a.goalOrder - b.goalOrder); // Ensure correct order
          
          return activity;
        });
      },
      error: () => {
        this.toastr.error('Error al cargar actividades operativas.', 'Error');
      }
    });
  }

  agregarActividad(): void {
    if (this.state === 3) {
      this.toastr.warning('No se pueden agregar actividades en estado de solo visualización.', 'Acción no permitida');
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
      formulation: {} as Formulation,
      goals: [
        { goalOrder: 1, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 2, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 3, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 4, value: 0, operationalActivity: {} } as Goal
      ],
      executedGoals: [ // Initialize executedGoals for new activity
        { goalOrder: 1, value: 0, operationalActivity: {} } as ExecutedGoal,
        { goalOrder: 2, value: 0, operationalActivity: {} } as ExecutedGoal,
        { goalOrder: 3, value: 0, operationalActivity: {} } as ExecutedGoal,
        { goalOrder: 4, value: 0, operationalActivity: {} } as ExecutedGoal
      ],
    };
    this.products = [...this.products, nuevaActividad];
    this.editingRowKeys[nuevaActividad.idOperationalActivity as any] = true;
  }

  eliminarActividad(index: number, product: OperationalActivity): void {
  if (this.state === 3) {
    this.toastr.warning('No se pueden eliminar actividades en estado de solo visualización.', 'Acción no permitida');
    return;
  }

  if (product.idOperationalActivity && product.idOperationalActivity > 0) {
    this.activityToDelete = product;
    this.activityToDeleteIndex = index;
    this.showDeleteConfirmation = true;
    } else {
      this.products.splice(index, 1);
      this.products = [...this.products];
      this.toastr.info('Actividad no guardada eliminada.', 'Información');
    }
  }

  confirmDelete(): void {
    if (this.activityToDelete && this.activityToDelete.idOperationalActivity) {
      this.operationalActivityService.deleteById(this.activityToDelete.idOperationalActivity).subscribe({
        next: () => {
          if (this.activityToDeleteIndex !== null) {
            this.products.splice(this.activityToDeleteIndex, 1);
            this.products = [...this.products];
          }
          this.toastr.success('Actividad eliminada exitosamente.', 'Éxito');
          this.showDeleteConfirmation = false;
          this.activityToDelete = null;
          this.activityToDeleteIndex = null;
          this.loadOperationalActivities();
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
    if (!product.description || product.description.trim() === '') {
      this.toastr.error('El campo "El detalle de la actividad" no puede estar vacío.', 'Error de validación');
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

    // NEW: Validate executed goals
    if (product.executedGoals && product.executedGoals.length === 4) {
      for (let i = 0; i < product.executedGoals.length; i++) {
        const executedGoal = product.executedGoals[i];
        if (typeof executedGoal.value !== 'number' || isNaN(executedGoal.value)) {
          this.toastr.error(`La meta ejecutada del trimestre ${i + 1} debe ser un número válido.`, 'Error de validación');
          return false;
        }
      }
    } else {
      this.toastr.error('Las metas ejecutadas de los trimestres no están completas.', 'Error de validación');
      return false;
    }

    return true;
  }

  onRowEditSave(product: OperationalActivity) {
    if (!this.idFormulation) return;

    if (this.state === 3) {
      this.toastr.warning('No se pueden guardar cambios en estado de solo visualización.', 'Acción no permitida');
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

    // Separate goals and executedGoals for the main activity object
    const { goals, executedGoals, ...actividadSinGoals } = product;

    const actividad: OperationalActivity = {
      ...actividadSinGoals,
      strategicAction: {
          idStrategicAction: strategicActionId,
          strategicObjective: { idStrategicObjective: strategicObjectiveId } as StrategicObjective
      } as StrategicAction,
      formulation: { idFormulation: this.idFormulation } as Formulation,
      financialFund: { idFinancialFund: product.financialFund.idFinancialFund } as FinancialFund,
      managementCenter: { idManagementCenter: product.managementCenter.idManagementCenter } as ManagementCenter,
      costCenter: { idCostCenter: product.costCenter.idCostCenter } as CostCenter,
      measurementType: { idMeasurementType: product.measurementType.idMeasurementType } as MeasurementType,
      priority: { idPriority: product.priority.idPriority } as Priority,
      sapCode: product.sapCode || ''
    };

    if (product.idOperationalActivity && product.idOperationalActivity > 0) {
      // UPDATE EXISTING ACTIVITY
      this.operationalActivityService.update(actividad).subscribe({
        next: () => {
          const goalObservables: Observable<any>[] = [];
          const executedGoalObservables: Observable<any>[] = []; // NEW: Executed goal observables

          if (product.goals) {
            for (const g of product.goals) {
              if (this.quarter !== null && g.goalOrder < this.quarter) {
                continue;
              }
              const goal: Goal = {
                idGoal: g.idGoal,
                goalOrder: g.goalOrder,
                value: g.value,
                operationalActivity: { idOperationalActivity: product.idOperationalActivity } as OperationalActivity
              };
              if (g.idGoal) {
                goalObservables.push(this.goalService.update(goal));
              } else {
                goalObservables.push(this.goalService.create(goal));
              }
            }
          }

          // NEW: Process executed goals
          if (product.executedGoals) {
            for (const eg of product.executedGoals) {
              if (this.quarter !== null && eg.goalOrder < this.quarter) {
                continue;
              }
              const executedGoal: ExecutedGoal = {
                idExecutedGoal: eg.idExecutedGoal,
                goalOrder: eg.goalOrder,
                value: eg.value,
                operationalActivity: { idOperationalActivity: product.idOperationalActivity } as OperationalActivity
              };
              if (eg.idExecutedGoal) {
                executedGoalObservables.push(this.executedGoalService.update(executedGoal));
              } else {
                executedGoalObservables.push(this.executedGoalService.create(executedGoal));
              }
            }
          }

          // Combine all observables for goals and executed goals
          const allGoalObservables = [...goalObservables, ...executedGoalObservables];

          if (allGoalObservables.length > 0) {
            forkJoin(allGoalObservables).subscribe({
              next: () => {
                this.toastr.success('Evaluación de actividad operativa y metas actualizadas.', 'Éxito');
                this.loadOperationalActivities();
              },
              error: (err) => {
                this.toastr.error('Error al actualizar una o más metas/metas ejecutadas.', 'Error');
                console.error('Error al actualizar metas/metas ejecutadas:', err);
                this.loadOperationalActivities();
              }
            });
          } else {
            this.toastr.success('Actividad operativa actualizada.', 'Éxito');
            this.loadOperationalActivities();
          }
        },
        error: (err) => {
          this.toastr.error('Error al actualizar la actividad operativa.', 'Error');
          console.error('Error al actualizar la actividad operativa:', err);
        }
      });
    } else {
      // CREATE NEW ACTIVITY
      delete actividad.idOperationalActivity;

      this.operationalActivityService.create(actividad).subscribe({
        next: (actividadCreada: OperationalActivity) => {
          const id = actividadCreada.idOperationalActivity;

          if (id && !isNaN(id)) {
            this._generateSapCodeAndCorrelative(product).subscribe({
              next: (result: { sapCode: string, correlativeCode: string }) => {
                const activityWithCodes: OperationalActivity = {
                  ...actividadCreada,
                  sapCode: result.sapCode,
                  correlativeCode: result.correlativeCode
                };

                this.operationalActivityService.update(activityWithCodes).subscribe({
                  next: () => {
                    const goalObservables: Observable<any>[] = [];
                    const executedGoalObservables: Observable<any>[] = []; // NEW: Executed goal observables for creation

                    if (product.goals) {
                      for (const g of product.goals) {
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

                    // NEW: Process executed goals for creation
                    if (product.executedGoals) {
                      for (const eg of product.executedGoals) {
                        if (this.quarter !== null && eg.goalOrder < this.quarter) {
                          continue;
                        }
                        const executedGoal: ExecutedGoal = {
                          goalOrder: eg.goalOrder,
                          value: eg.value,
                          operationalActivity: { idOperationalActivity: id } as OperationalActivity
                        };
                        executedGoalObservables.push(this.executedGoalService.create(executedGoal));
                      }
                    }

                    // Combine all observables for goals and executed goals
                    const allGoalObservables = [...goalObservables, ...executedGoalObservables];

                    if (allGoalObservables.length > 0) {
                      forkJoin(allGoalObservables).subscribe({
                        next: () => {
                          this.toastr.success('Actividad operativa creada, metas y metas ejecutadas guardadas.', 'Éxito');
                          this.loadOperationalActivities();
                        },
                        error: (err) => {
                          this.toastr.error('Error al guardar las metas/metas ejecutadas de la nueva actividad.', 'Error');
                          console.error('Error al crear metas/metas ejecutadas para la nueva actividad:', err);
                          this.loadOperationalActivities();
                        }
                      });
                    } else {
                      this.toastr.success('Actividad operativa creada.', 'Éxito');
                      this.loadOperationalActivities();
                    }
                  },
                  error: (err) => {
                    this.toastr.error('Error al actualizar la actividad con el código SAP y correlativo.', 'Error');
                    console.error('Error al actualizar la actividad con el código SAP y correlativo:', err);
                  }
                });
              },
              error: (err) => {
                this.toastr.error('Error al generar el código SAP y correlativo.', 'Error');
                console.error('Error generating SAP code and correlative:', err);
              }
            });
          } else {
            this.toastr.error('El ID devuelto no es válido.', 'Error');
          }
        },
        error: (err) => {
          this.toastr.error('Error al crear la actividad operativa.', 'Error');
          console.error('Error al crear la actividad operativa:', err);
        }
      });
    }
  }

  onRowEditInit(product: OperationalActivity) {
    if (this.state === 3) {
      this.toastr.warning('No se pueden editar actividades en estado de solo visualización.', 'Acción no permitida');
      return;
    }
    this.clonedProducts[product.idOperationalActivity as any] = { ...product };
  }

  onRowEditCancel(product: OperationalActivity, index: number) {
    if (product.idOperationalActivity && product.idOperationalActivity > 0) {
      let clonedProduct = this.clonedProducts[product.idOperationalActivity as any];
      let productIndex = this.products.findIndex(p => p.idOperationalActivity === product.idOperationalActivity);
      if (productIndex !== -1) {
        this.products[productIndex] = clonedProduct;
      }
    } else {
      this.products.splice(index, 1);
    }
    this.products = [...this.products];
    delete this.clonedProducts[product.idOperationalActivity as any];
  }

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

  cargarDatos() {
    const year = parseInt(this.ano!, 10);
    this.year = year;

    this.strategicObjectiveService.getAll().subscribe((objectives: StrategicObjective[]) => {
      this.strategicObjectives = objectives.filter(
        obj => year >= obj.startYear && year <= obj.endYear
      );
    });
  }

  openOeAeSelectionModal(product: OperationalActivity) {
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
    this.tempSelectedStrategicActionId = null;
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
    product.strategicAction.idStrategicAction = id;
    const selectedAction = this.strategicActions.find(a => a.idStrategicAction === id);
    if (selectedAction) {
      product.strategicAction = { ...selectedAction, strategicObjective: selectedAction.strategicObjective || product.strategicAction.strategicObjective };
    }
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

  /**
   * Generates the SAP Code and correlative code for an Operational Activity.
   * @param activity The OperationalActivity object with strategic action and cost center details.
   * @returns An Observable that emits an object containing the generated SAP code string and the correlative code.
   */
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

    return this.operationalActivityService.getHigherCorrelativeCodeByCostCenter(idCostCenter).pipe(
      map(correlativeCodeStr => {
        const currentCorrelative = parseInt(correlativeCodeStr, 10);
        const nextCorrelative = (isNaN(currentCorrelative) ? 0 : currentCorrelative) + 1;
        const formattedActivityId = String(nextCorrelative).padStart(3, '0');

        const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${formattedActivityId}`;
        console.log(correlativeCodeStr);

        return { sapCode: sapCode, correlativeCode: formattedActivityId };
      }),
      catchError(err => {
        this.toastr.error('Error al obtener el código correlativo superior para el código SAP.', 'Error');
        console.error('Error fetching higher correlative code:', err);
        return of({ sapCode: '', correlativeCode: '' });
      })
    );
  }

  /**
   * Calculates the compliance percentage for a given quarter.
   * @param goalValue The planned goal value.
   * @param executedGoalValue The executed goal value.
   * @returns The compliance percentage (0-100), or 0 if goalValue is zero or invalid.
   */
  getCompliancePercentage(goalValue: number | undefined, executedGoalValue: number | undefined): number {
    const goal = goalValue || 0;
    const executed = executedGoalValue || 0;

    if (goal === 0) {
      // If the goal is 0 and executed is also 0, it can be considered 100% or 0% depending on business logic.
      // For now, if no goal, no meaningful percentage. Return 0 for consistency with "Sin Avance" logic below.
      // If you want "100%" for 0/0, change this to `return executed === 0 ? 100 : 0;`
      return 0;
    }

    const percentage = (executed / goal) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  }

  /**
   * Determines the compliance level based on the percentage and activity status.
   * @param goalValue The planned goal value for the quarter.
   * @param executedGoalValue The executed goal value for the quarter.
   * @param quarterOrder The order of the quarter (1, 2, 3, or 4).
   * @param product The operational activity.
   * @returns The compliance level string.
   */
  getComplianceLevel(goalValue: number | undefined, executedGoalValue: number | undefined, quarterOrder: number, product: OperationalActivity): string {
    const percentage = this.getCompliancePercentage(goalValue, executedGoalValue);
    const currentQuarter = this.quarter || 0; // Current system quarter

    // Check if the current quarter is the one being evaluated or a past one
    // const isEvaluatedQuarter = quarterOrder <= currentQuarter;

    // Check if any goals or executed goals exist for the current activity
    const hasAnyGoalData = product.goals?.some(g => (g.value || 0) > 0) || product.executedGoals?.some(eg => (eg.value || 0) > 0);

    if (goalValue === undefined || executedGoalValue === undefined || goalValue === null || executedGoalValue === null) {
      // If data is entirely missing for the specific quarter being displayed
      return 'No Evaluada';
    }

    // if (isEvaluatedQuarter) {
      // For quarters that should have been evaluated
      if (percentage >= 90) {
        return 'Excelente';
      } else if (percentage >= 75) {
        return 'Bueno';
      } else if (percentage >= 60) {
        return 'Regular';
      } else if (percentage > 0) { // Malo: >0% and <60%
        return 'Malo';
      } else if (percentage === 0) {
        // If percentage is 0, check if it was reported (goal/executed present but zero percent)
        if ((goalValue > 0 || executedGoalValue > 0) || (goalValue === 0 && executedGoalValue === 0 && hasAnyGoalData)) {
          return 'Sin Avance';
        } else {
          // If no goals set for this specific quarter, or no executed goals, and it's past the quarter to evaluate
          return 'No Evaluada';
        }
      }
    // } else {
    //   // For future quarters that have not yet arrived
    //   return 'No Evaluada';
    // }
    return 'No Evaluada'; // Default fallback
  }
}