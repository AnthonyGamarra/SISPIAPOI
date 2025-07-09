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

  objetivos: { id?: number; nombre: string; acciones: { id?: number; nombre: string }[] }[] = [];
  opcionSeleccionadaId: number | null = null;

  products: OperationalActivity[] = [];

  strategicActions: StrategicAction[] = [];
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

  constructor(private strategicObjectiveService: StrategicObjectiveService) {}

  ngOnChanges(changes: SimpleChanges) {
    const cambioAno = changes['ano'] && !changes['ano'].firstChange;
    const cambioMostrar = changes['mostrar'];

    if (cambioAno || (cambioMostrar && !this.mostrar)) {
      this.opcionSeleccionadaId = null;
      this.objetivos = [];
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
  }

  loadOperationalActivities(): void {
    if (!this.idFormulation) return;

    this.operationalActivityService.searchByFormulation(this.idFormulation).subscribe({
      next: (data) => {
        this.products = data;
      },
      error: () => {
        this.toastr.error('Error al cargar actividades operativas.', 'Error');
      }
    });
  }

  agregarActividad(): void {
    const nuevaActividad: OperationalActivity = {
      sapCode: '',
      name: '',
      measurementUnit: '',
      strategicAction: {} as StrategicAction,
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
        { goalOrder: 1, value: 0, operationalActivity: {} },
        { goalOrder: 2, value: 0, operationalActivity: {} },
        { goalOrder: 3, value: 0, operationalActivity: {} },
        { goalOrder: 4, value: 0, operationalActivity: {} }
      ]
    };
    this.products = [...this.products, nuevaActividad];
  }

  eliminarActividad(index: number): void {
    this.products.splice(index, 1);
    this.products = [...this.products];
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
    };

    this.operationalActivityService.create(actividad).subscribe({
      next: (actividadCreada: OperationalActivity) => {
        const id = actividadCreada.idOperationalActivity;

        if (id && !isNaN(id)) {
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

          this.toastr.success('Actividad operativa creada.', 'Éxito');
          this.loadOperationalActivities();
        } else {
          this.toastr.error('El ID devuelto no es válido.', 'Error');
        }
      },
      error: () => {
        this.toastr.error('Error al crear la actividad operativa.', 'Error');
      }
    });
  }

  onRowEditInit(product: OperationalActivity) {}

  onRowEditCancel(product: OperationalActivity, index: number) {}

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
      this.strategicActionService.getAll().subscribe((actions: StrategicAction[]) => {
        const filteredObjectives = objectives.filter(
          obj => year >= obj.startYear && year <= obj.endYear
        );

        this.objetivos = filteredObjectives.map(obj => ({
          id: obj.idStrategicObjective,
          nombre: obj.name,
          acciones: actions
            .filter(a => a.strategicObjective?.idStrategicObjective === obj.idStrategicObjective)
            .map(a => ({ id: a.idStrategicAction, nombre: a.name }))
        })).filter(obj => obj.acciones.length > 0);
      });
    });
  }

  onSeleccionar(id: number) {
    this.opcionSeleccionadaId = id;
    const accionSeleccionada = this.objetivos
      .flatMap(o => o.acciones)
      .find(a => a.id === id);

    if (accionSeleccionada) {
      this.seleccionCambio.emit(accionSeleccionada);
    }
  }
}