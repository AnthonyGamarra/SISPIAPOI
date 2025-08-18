// form.component.ts
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

import { StrategicActionService } from '../../../core/services/logic/strategic-action.service';
import { FinancialFundService } from '../../../core/services/logic/financial-fund.service';
import { ManagementCenterService } from '../../../core/services/logic/management-center.service';
import { CostCenterService } from '../../../core/services/logic/cost-center.service';
import { MeasurementTypeService } from '../../../core/services/logic/measurement-type.service';
import { PriorityService } from '../../../core/services/logic/priority.service';
import { OperationalActivityService } from '../../../core/services/logic/operational-activity.service';
import { GoalService } from '../../../core/services/logic/goal.service';

import { StrategicAction } from '../../../models/logic/strategicAction.model';
import { FinancialFund } from '../../../models/logic/financialFund.model';
import { ManagementCenter } from '../../../models/logic/managementCenter.model';
import { CostCenter } from '../../../models/logic/costCenter.model';
import { MeasurementType } from '../../../models/logic/measurementType.model';
import { Priority } from '../../../models/logic/priority.model';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';
import { Goal } from '../../../models/logic/goal.model';
import { Formulation } from '../../../models/logic/formulation.model';

@Component({
  selector: 'app-form',
  standalone: true,
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    InputTextModule,
    TableModule,
    ButtonModule
  ]
})
export class FormComponent implements OnChanges {
  @Input() formulation: Formulation | null = null;

  filas: any[] = [];
  existingActivities: OperationalActivity[] = [];

  strategicActions: StrategicAction[] = [];
  financialFunds: FinancialFund[] = [];
  managementCenters: ManagementCenter[] = [];
  costCenters: CostCenter[] = [];
  measurementTypes: MeasurementType[] = [];
  priorities: Priority[] = [];

  private sas = inject(StrategicActionService);
  private ffs = inject(FinancialFundService);
  private mcs = inject(ManagementCenterService);
  private ccs = inject(CostCenterService);
  private mts = inject(MeasurementTypeService);
  private ps = inject(PriorityService);
  private oas = inject(OperationalActivityService);
  private gs = inject(GoalService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formulation'] && this.formulation?.idFormulation) {
      this.loadData();
    }
  }

  loadData(): void {
    const idDep = this.formulation!.dependency?.idDependency;
    if (!idDep) return;

    this.filas = [];

    this.sas.getAll().subscribe(sa => {
      this.strategicActions = sa;
      this.ffs.getAll().subscribe(ff => {
        this.financialFunds = ff;
        this.mcs.getAll().subscribe(mc => {
          this.managementCenters = mc.filter(m => m.dependency?.idDependency === idDep);
          this.ccs.getAll().subscribe(cc => {
            this.costCenters = cc.filter(c => c.dependency?.idDependency === idDep);
            this.mts.getAll().subscribe(mt => {
              this.measurementTypes = mt;
              this.ps.getAll().subscribe(pr => {
                this.priorities = pr;
                this.oas.searchByFormulation(this.formulation!.idFormulation!)
                  .subscribe(res => this.existingActivities = res);
              });
            });
          });
        });
      });
    });
  }

  agregarFila(): void {
    this.filas.push({
      denominacion: '', indicador: '', comportamiento: null,
      metaI: null, metaII: null, metaIII: null, metaIV: null, metaTotal: null,
      remuneraciones: null, bienes: null, servicios: null,
      strategicAction: null, financialFund: null,
      managementCenter: null, costCenter: null,
      measurementType: null, priority: null
    });
  }

  async guardarFila(index: number): Promise<void> {
    const fila = this.filas[index];
    const formulation = this.formulation;
    if (!formulation?.idFormulation) return;

    const actividad: OperationalActivity = {
      sapCode: '', name: fila.denominacion,
      measurementUnit: fila.indicador,
      executedGoal: 0, expectedGoal: fila.metaTotal || 0,
      goods: fila.bienes || 0, remuneration: fila.remuneraciones || 0, services: fila.servicios || 0,
      active: true,
      formulation,
      strategicAction: fila.strategicAction,
      financialFund: fila.financialFund,
      managementCenter: fila.managementCenter,
      costCenter: fila.costCenter,
      measurementType: fila.measurementType,
      priority: fila.priority,
      goals: []
    };

    const response = await firstValueFrom(this.oas.create(actividad));
    const location = response.headers.get('Location');
    const idStr = location?.split('/').pop();
    const id = Number(idStr);

    if (!id || isNaN(id)) return;

    const paddedId = String(id).padStart(3, '0');
    const code =
      (fila.strategicAction?.code?.charAt(0) ?? '').toUpperCase() +
      (fila.strategicAction?.code?.slice(0, 2) ?? '').toUpperCase() +
      (fila.costCenter?.costCenterCode?.padEnd(10, '0') ?? '----------') +
      paddedId;

    await firstValueFrom(this.oas.update({ ...actividad, idOperationalActivity: id, sapCode: code }));

    const metas: Goal[] = [1, 2, 3, 4].map(q => ({
      operationalActivity: {
        idOperationalActivity: id,
        sapCode: code,
        name: actividad.name,
        formulation: actividad.formulation,
        strategicAction: actividad.strategicAction,
        financialFund: actividad.financialFund,
        managementCenter: actividad.managementCenter,
        costCenter: actividad.costCenter,
        measurementType: actividad.measurementType,
        measurementUnit: actividad.measurementUnit,
        expectedGoal: actividad.expectedGoal,
        executedGoal: actividad.executedGoal,
        priority: actividad.priority,
        goods: actividad.goods,
        remuneration: actividad.remuneration,
        services: actividad.services,
        active: true,
        goals: []
      },
      goalOrder: q,
      value: fila[`meta${['I', 'II', 'III', 'IV'][q - 1]}`] || 0
    }));

    for (const goal of metas) {
      await firstValueFrom(this.gs.create(goal));
    }

    this.existingActivities.push({ ...actividad, idOperationalActivity: id, sapCode: code });
    this.filas.splice(index, 1);
  }

  eliminarFila(index: number): void {
    this.filas.splice(index, 1);
  }

  get actividades(): any[] {
    return [...this.existingActivities, ...this.filas];
  }
}