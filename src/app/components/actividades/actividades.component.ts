import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { ToastrService } from 'ngx-toastr';

import { StrategicActionService } from '../../core/services/logic/strategic-action.service';
import { FinancialFundService } from '../../core/services/logic/financial-fund.service';
import { ManagementCenterService } from '../../core/services/logic/management-center.service';
import { CostCenterService } from '../../core/services/logic/cost-center.service';
import { MeasurementTypeService } from '../../core/services/logic/measurement-type.service';
import { PriorityService } from '../../core/services/logic/priority.service';
import { OperationalActivityService } from '../../core/services/logic/operational-activity.service';
import { GoalService } from '../../core/services/logic/goal.service';

import { StrategicAction } from '../../models/logic/strategicAction.model';
import { FinancialFund } from '../../models/logic/financialFund.model';
import { ManagementCenter } from '../../models/logic/managementCenter.model';
import { CostCenter } from '../../models/logic/costCenter.model';
import { MeasurementType } from '../../models/logic/measurementType.model';
import { Priority } from '../../models/logic/priority.model';
import { OperationalActivity } from '../../models/logic/operationalActivity.model';
import { Goal } from '../../models/logic/goal.model';
import { Formulation } from '../../models/logic/formulation.model';

@Component({
  selector: 'app-actividades',
  standalone: true,
  templateUrl: './actividades.component.html',
  styleUrl: './actividades.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    TagModule,
    DropdownModule
  ]
})
export class ActividadesComponent implements OnInit {
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

  ngOnInit(): void {
    this.loadCombos();
    this.initTable(); // puedes reemplazar esto con un getAll real
  }

  loadCombos(): void {
    this.strategicActionService.getAll().subscribe(data => this.strategicActions = data);
    this.financialFundService.getAll().subscribe(data => this.financialFunds = data);
    this.managementCenterService.getAll().subscribe(data => this.managementCenters = data);
    this.costCenterService.getAll().subscribe(data => this.costCenters = data);
    this.measurementTypeService.getAll().subscribe(data => this.measurementTypes = data);
    this.priorityService.getAll().subscribe(data => this.priorities = data);
  }

  initTable(): void {
    this.products = [
      {
        sapCode: '',
        name: '',
        measurementUnit: '',
        costCenter: {} as CostCenter,
        financialFund: {} as FinancialFund,
        formulation: { idFormulation: 1 } as Formulation,
        managementCenter: {} as ManagementCenter,
        measurementType: {} as MeasurementType,
        priority: {} as Priority,
        strategicAction: {} as StrategicAction,
        expectedGoal: 0,
        executedGoal: 0,
        goods: 0,
        remuneration: 0,
        services: 0
      }
    ];
  }

  onRowEditInit(product: OperationalActivity) {
    console.log('Edit Init', product);
  }

  onRowEditSave(product: OperationalActivity) {
    const actividad: OperationalActivity = {
      ...product,
      strategicAction: { idStrategicAction: product.strategicAction.idStrategicAction } as StrategicAction,
      formulation: { idFormulation: product.formulation.idFormulation } as Formulation,
      financialFund: { idFinancialFund: product.financialFund.idFinancialFund } as FinancialFund,
      managementCenter: { idManagementCenter: product.managementCenter.idManagementCenter } as ManagementCenter,
      costCenter: { idCostCenter: product.costCenter.idCostCenter } as CostCenter,
      measurementType: { idMeasurementType: product.measurementType.idMeasurementType } as MeasurementType,
      priority: { idPriority: product.priority.idPriority } as Priority,
      goals: undefined
    };

    this.operationalActivityService.create(actividad).subscribe({
      next: (response) => {
        const locationHeader = response.headers.get('Location');
        const id = locationHeader?.split('/').pop();

        if (id) {
          this.crearGoals(Number(id));
        } else {
          this.toastr.error('No se pudo obtener el ID de la actividad operativa.', 'Error');
        }
      },
      error: () => {
        this.toastr.error('Error al crear la actividad operativa.', 'Error');
      }
    });
  }

  crearGoals(idActividad: number): void {
    const goal: Goal = {
      goalOrder: 1,
      value: 100,
      operationalActivity: { idOperationalActivity: idActividad }
    };

    this.goalService.create(goal).subscribe({
      next: () => {
        this.toastr.success('Metas creadas con éxito.', 'Éxito');
      },
      error: () => {
        this.toastr.error('Error al crear las metas.', 'Error');
      }
    });
  }

  onRowEditCancel(product: OperationalActivity, index: number) {
    console.log('Cancel', product);
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

}
