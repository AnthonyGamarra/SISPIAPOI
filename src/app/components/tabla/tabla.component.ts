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

import { StrategicObjectiveService } from '../../core/services/logic/strategic-objective.service';
import { StrategicActionService } from '../../core/services/logic/strategic-action.service';
import { FinancialFundService } from '../../core/services/logic/financial-fund.service';
import { ManagementCenterService } from '../../core/services/logic/management-center.service';
import { CostCenterService } from '../../core/services/logic/cost-center.service';
import { MeasurementTypeService } from '../../core/services/logic/measurement-type.service';
import { PriorityService } from '../../core/services/logic/priority.service';
import { OperationalActivityService } from '../../core/services/logic/operational-activity.service';
import { GoalService } from '../../core/services/logic/goal.service';

import { StrategicObjective } from '../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../models/logic/strategicAction.model';
import { FinancialFund } from '../../models/logic/financialFund.model';
import { ManagementCenter } from '../../models/logic/managementCenter.model';
import { CostCenter } from '../../models/logic/costCenter.model';
import { MeasurementType } from '../../models/logic/measurementType.model';
import { Priority } from '../../models/logic/priority.model';
import { OperationalActivity } from '../../models/logic/operationalActivity.model';
import { Goal } from '../../models/logic/goal.model';
import { Formulation } from '../../models/logic/formulation.model';

interface Accion {
  id?: number;
  nombre: string;
}

@Component({
  selector: 'app-tabla',
  templateUrl: './tabla.component.html',
  styleUrls: ['./tabla.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    TagModule
  ]
})
export class TablaComponent implements OnChanges {
  @Input() mostrar = false;
  @Input() ano: string | null = null;
  @Input() idFormulation: number | null = null;
  @Output() seleccionCambio = new EventEmitter<Accion>();

  products: OperationalActivity[] = [];

  strategicObjectives: StrategicObjective[] = [];
  strategicActions: StrategicAction[] = [];
  filteredStrategicActions: StrategicAction[] = [];
  financialFunds: FinancialFund[] = [];
  managementCenters: ManagementCenter[] = [];
  costCenters: CostCenter[] = [];
  measurementTypes: MeasurementType[] = [];
  priorities: Priority[] = [];

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

  ngOnChanges(changes: SimpleChanges) {
    const cambioAno = changes['ano'] && !changes['ano'].firstChange;
    const cambioMostrar = changes['mostrar'];

    if (cambioAno || (cambioMostrar && !this.mostrar)) {
      this.products = [];
    }

    if (this.mostrar && this.ano && this.idFormulation) {
      this.cargarDatos();
      this.loadOperationalActivities();
    }
  }

  ngOnInit(): void {
    this.loadCombos();
  }

  loadCombos(): void {
    this.strategicActionService.getAll().subscribe(data => this.strategicActions = data);
    this.financialFundService.getAll().subscribe(data => this.financialFunds = data);
    this.managementCenterService.getAll().subscribe(data => this.managementCenters = data);
    this.costCenterService.getAll().subscribe(data => this.costCenters = data);
    this.measurementTypeService.getAll().subscribe(data => this.measurementTypes = data);
    this.priorityService.getAll().subscribe(data => this.priorities = data);
    this.strategicObjectiveService.getAll().subscribe(data => this.strategicObjectives = data);
  }

  loadOperationalActivities(): void {
    if (!this.idFormulation) return;

    this.operationalActivityService.searchByFormulation(this.idFormulation).subscribe({
      next: (data) => {
        this.products = data.map(activity => {
          // Ensure goals array has 4 elements for rendering purposes
          if (!activity.goals || activity.goals.length === 0) {
            activity.goals = [
              { goalOrder: 1, value: 0, operationalActivity: {} } as Goal,
              { goalOrder: 2, value: 0, operationalActivity: {} } as Goal,
              { goalOrder: 3, value: 0, operationalActivity: {} } as Goal,
              { goalOrder: 4, value: 0, operationalActivity: {} } as Goal
            ];
          } else {
            // Fill missing goals if less than 4 exist, and sort existing
            activity.goals.sort((a, b) => a.goalOrder - b.goalOrder);
            while (activity.goals.length < 4) {
              const nextOrder = activity.goals.length + 1;
              activity.goals.push({ goalOrder: nextOrder, value: 0, operationalActivity: {} } as Goal);
            }
          }
          return activity;
        });
      },
      error: () => {
        this.toastr.error('Error al cargar actividades operativas.', 'Error');
      }
    });
  }

  agregarActividad(): void {
    const nuevaActividad: OperationalActivity = {
      sapCode: '', // Se enviará vacío y se generará después
      name: '',
      measurementUnit: '',
      strategicAction: { strategicObjective: {} as StrategicObjective } as StrategicAction,
      financialFund: {} as FinancialFund,
      managementCenter: {} as ManagementCenter,
      costCenter: {} as CostCenter,
      measurementType: {} as MeasurementType,
      priority: {} as Priority,
      expectedGoal: 0,
      executedGoal: 0,
      goods: 0,
      remuneration: 0,
      services: 0,
      formulation: {} as Formulation,
      goals: [
        { goalOrder: 1, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 2, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 3, value: 0, operationalActivity: {} } as Goal,
        { goalOrder: 4, value: 0, operationalActivity: {} } as Goal
      ]
    };
    this.products = [...this.products, nuevaActividad];
  }

  eliminarActividad(index: number, product: OperationalActivity): void {
    if (product.idOperationalActivity) {
      this.operationalActivityService.deleteById(product.idOperationalActivity).subscribe({
        next: () => {
          this.toastr.success('Actividad operativa eliminada.', 'Éxito');
          this.products.splice(index, 1);
          this.products = [...this.products];
        },
        error: () => {
          this.toastr.error('Error al eliminar la actividad operativa.', 'Error');
        }
      });
    } else {
      this.products.splice(index, 1);
      this.products = [...this.products];
      this.toastr.info('Actividad no guardada eliminada.', 'Información');
    }
  }

  onRowEditSave(product: OperationalActivity) {
    if (!this.idFormulation) return;

    const { goals, ...actividadSinGoals } = product;

    const actividad: OperationalActivity = {
      ...actividadSinGoals,
      strategicAction: { idStrategicAction: product.strategicAction.idStrategicAction } as StrategicAction,
      formulation: { idFormulation: this.idFormulation } as Formulation,
      financialFund: { idFinancialFund: product.financialFund.idFinancialFund } as FinancialFund,
      managementCenter: { idManagementCenter: product.managementCenter.idManagementCenter } as ManagementCenter,
      costCenter: { idCostCenter: product.costCenter.idCostCenter } as CostCenter,
      measurementType: { idMeasurementType: product.measurementType.idMeasurementType } as MeasurementType,
      priority: { idPriority: product.priority.idPriority } as Priority,
      sapCode: '' // Asegurarse de enviar vacío en la creación
    };

    if (product.idOperationalActivity) {
      // Logic for updating existing activity
      this.operationalActivityService.update(actividad).subscribe({
        next: () => {
          if (product.goals) {
            for (const g of product.goals) {
              const goal: Goal = {
                idGoal: g.idGoal,
                goalOrder: g.goalOrder,
                value: g.value,
                operationalActivity: { idOperationalActivity: product.idOperationalActivity }
              };
              if (g.idGoal) {
                this.goalService.update(g.idGoal, goal).subscribe({
                  next: () => {},
                  error: () => {
                    this.toastr.error('Error al actualizar una meta.', 'Error');
                  }
                });
              } else {
                this.goalService.create(goal).subscribe({
                  next: () => {},
                  error: () => {
                    this.toastr.error('Error al crear una meta.', 'Error');
                  }
                });
              }
            }
          }
          this.toastr.success('Actividad operativa actualizada.', 'Éxito');
          this.loadOperationalActivities();
        },
        error: () => {
          this.toastr.error('Error al actualizar la actividad operativa.', 'Error');
        }
      });
    } else {
      // Logic for creating new activity
      this.operationalActivityService.create(actividad).subscribe({
        next: (actividadCreada: OperationalActivity) => {
          const id = actividadCreada.idOperationalActivity;

          if (id && !isNaN(id)) {
            // Generate SAP Code
            const selectedStrategicAction = this.strategicActions.find(
              sa => sa.idStrategicAction === product.strategicAction.idStrategicAction
            );
            const strategicObjectiveCode = this.strategicObjectives.find(
              so => so.idStrategicObjective === selectedStrategicAction?.strategicObjective?.idStrategicObjective
            )?.code || ''; // Asumiendo que StrategicObjective tiene propiedad 'code'
            const strategicActionCode = selectedStrategicAction?.code || ''; // Asumiendo que StrategicAction tiene propiedad 'code'

            const selectedCostCenter = this.costCenters.find(
              cc => cc.idCostCenter === product.costCenter.idCostCenter
            );
            const costCenterCode = selectedCostCenter?.costCenterCode || ''; // Propiedad 'costCenterCode' del modelo CostCenter

            const formattedObjectiveCode = String(strategicObjectiveCode).padStart(1, '0');
            const formattedActionCode = String(strategicActionCode).padStart(2, '0');
            const formattedCostCenterCode = String(costCenterCode).padStart(10, '0');
            const formattedActivityId = String(id).padStart(3, '0');

            const newSapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${formattedActivityId}`;

            const activityWithSapCode: OperationalActivity = {
              ...actividadCreada,
              sapCode: newSapCode
            };

            // Update activity with generated SAP Code
            this.operationalActivityService.update(activityWithSapCode).subscribe({
              next: () => {
                // Save Goals after activity is created and SAP code is updated
                if (product.goals) {
                  for (const g of product.goals) {
                    const goal: Goal = {
                      goalOrder: g.goalOrder,
                      value: g.value,
                      operationalActivity: { idOperationalActivity: id }
                    };
                    this.goalService.create(goal).subscribe({
                      next: () => {},
                      error: () => {
                        this.toastr.error('Error al crear una meta.', 'Error');
                      }
                    });
                  }
                }
                this.toastr.success('Actividad operativa creada y código SAP generado.', 'Éxito');
                this.loadOperationalActivities(); // Reload to show new SAP code and goals
              },
              error: () => {
                this.toastr.error('Error al actualizar la actividad con el código SAP.', 'Error');
              }
            });

          } else {
            this.toastr.error('El ID devuelto no es válido.', 'Error');
          }
        },
        error: () => {
          this.toastr.error('Error al crear la actividad operativa.', 'Error');
        }
      });
    }
  }

  onRowEditInit(product: OperationalActivity) {
    // Cuando se edita una fila, asegurar que el objetivo estratégico se muestre correctamente.
    if (product.strategicAction?.strategicObjective?.idStrategicObjective) {
      product.strategicAction.strategicObjective = this.strategicObjectives.find(
        obj => obj.idStrategicObjective === product.strategicAction?.strategicObjective?.idStrategicObjective
      ) || {idStrategicObjective: product.strategicAction.strategicObjective.idStrategicObjective} as StrategicObjective;
      this.filterStrategicActions(product);
    }
  }

  onRowEditCancel(product: OperationalActivity, index: number) {
    if (!product.idOperationalActivity) {
      // If it's a new unsaved activity, remove it from the list
      this.products.splice(index, 1);
      this.products = [...this.products];
    } else {
      // If it's an existing activity, reload to revert changes
      this.loadOperationalActivities();
    }
  }

  getStrategicObjectiveName(id?: number): string {
    return this.strategicObjectives.find(o => o.idStrategicObjective === id)?.name || '';
  }

  getStrategicActionName(id?: number): string {
    return this.strategicActions.find(a => a.idStrategicAction === id)?.name || '';
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

  cargarDatos() {
    const year = parseInt(this.ano!, 10);

    this.strategicObjectiveService.getAll().subscribe((objectives: StrategicObjective[]) => {
      this.strategicObjectives = objectives.filter(
        obj => year >= obj.startYear && year <= obj.endYear
      );
    });
  }

  onStrategicObjectiveChange(event: any, product: OperationalActivity) {
    const selectedObjectiveId = event.value;
    product.strategicAction.strategicObjective = this.strategicObjectives.find(obj => obj.idStrategicObjective === selectedObjectiveId) || {} as StrategicObjective;
    product.strategicAction.idStrategicAction = undefined; // Limpiar acción estratégica seleccionada
    this.filterStrategicActions(product);
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
}