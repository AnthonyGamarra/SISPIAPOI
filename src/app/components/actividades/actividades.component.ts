import { Component } from '@angular/core';
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
export class ActividadesComponent {
  products: OperationalActivity[] = [];

  statuses = [
    { label: 'In Stock', value: 'INSTOCK' },
    { label: 'Low Stock', value: 'LOWSTOCK' },
    { label: 'Out of Stock', value: 'OUTOFSTOCK' }
  ];

  constructor(
    private operationalActivityService: OperationalActivityService,
    private goalService: GoalService,
    private strategicAction: StrategicAction,
    private formulation: Formulation,
    private managementCenter: ManagementCenter,
    private costCenter: CostCenter,
    private measurementType: MeasurementType,
    private priority: Priority,
    private toastr: ToastrService
  ) {}

  getSeverity(status: string): string {
    switch (status) {
      case 'INSTOCK':
        return 'success';
      case 'LOWSTOCK':
        return 'warning';
      case 'OUTOFSTOCK':
        return 'danger';
      default:
        return '';
    }
  }

  onRowEditInit(product: OperationalActivity) {
    console.log('Edit Init', product);
  }

  onRowEditSave(product: OperationalActivity) {
    const actividad: OperationalActivity = {
      ...product,
      strategicAction: { idStrategicAction: product.strategicAction.idStrategicAction },
      formulation: { idFormulation: product.formulation.idFormulation },
      financialFund: { idFinancialFund: product.financialFund.idFinancialFund },
      managementCenter: { idManagementCenter: product.managementCenter.idManagementCenter },
      costCenter: { idCostCenter: product.costCenter.idCostCenter },
      measurementType: { idMeasurementType: product.measurementType.idMeasurementType },
      priority: { idPriority: product.priority.idPriority },
      goals: undefined // No goals yet
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
      value: 123,
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
}
