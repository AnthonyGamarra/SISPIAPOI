import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastrService } from 'ngx-toastr';

import { FormulationService } from '../../../../core/services/logic/formulation.service';
import { DependencyService } from '../../../../core/services/logic/dependency.service';
import { OperationalActivityService } from '../../../../core/services/logic/operational-activity.service';

import { Formulation } from '../../../../models/logic/formulation.model';
import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { StrategicObjective } from '../../../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../../../models/logic/strategicAction.model';
import { FinancialFund } from '../../../../models/logic/financialFund.model';
import { ManagementCenter } from '../../../../models/logic/managementCenter.model';
import { CostCenter } from '../../../../models/logic/costCenter.model';
import { MeasurementType } from '../../../../models/logic/measurementType.model';
import { Priority } from '../../../../models/logic/priority.model';
import { MonthlyGoal } from '../../../../models/logic/monthlyGoal.model';
import { MonthlyBudget } from '../../../../models/logic/monthlyBudget.model';

import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-formulacion-ospes-tabla',
  templateUrl: './formulacion-ospes-tabla.component.html',
  styleUrls: ['./formulacion-ospes-tabla.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ProgressSpinnerModule,
    TextareaModule,
    InputTextModule,
    DropdownModule,
    RadioButtonModule
  ]
})
export class FormulacionOspesTablaComponent {
  @Input() currentFormulation: Formulation | null = null;
  @Input() selectedSize: any = 'small';
  @Input() strategicObjectives: StrategicObjective[] = [];
  @Input() strategicActions: StrategicAction[] = [];
  @Input() financialFunds: FinancialFund[] = [];
  @Input() managementCenters: ManagementCenter[] = [];
  @Input() costCenters: CostCenter[] = [];
  @Input() measurementTypes: MeasurementType[] = [];
  @Input() priorities: Priority[] = [];

  @Output() modalClosed = new EventEmitter<void>();

  displayModal: boolean = false;
  prestacionesEconomicasFormulations: Formulation[] = [];
  prestacionesEconomicasActivities: OperationalActivity[] = [];
  groupedActivitiesByDependency: { [dependencyName: string]: OperationalActivity[] } = {};
  dependencyNamesList: string[] = [];
  isLoading: boolean = false;
  editingActivity: OperationalActivity | null = null;
  showMonthlyDetailsModal: boolean = false;
  selectedActivityForDetails: OperationalActivity | null = null;
  
  // Propiedades para vista consolidada
  showConsolidatedView: boolean = false;
  consolidatedActivities: any[] = [];

  private toastr = inject(ToastrService);
  private formulationService = inject(FormulationService);
  private dependencyService = inject(DependencyService);
  private operationalActivityService = inject(OperationalActivityService);

  openModal(): void {
    if (!this.currentFormulation?.year || !this.currentFormulation?.modification) {
      this.toastr.error('No se ha seleccionado una formulación válida.', 'Error');
      return;
    }

    this.displayModal = true;
    this.loadPrestacionesEconomicasData();
  }

  private loadPrestacionesEconomicasData(): void {
    if (!this.currentFormulation?.year || !this.currentFormulation?.modification) {
      return;
    }

    this.isLoading = true;
    
    // Primero obtener todas las dependencias con dependencyType = 2 y ospe = true
    this.dependencyService.getAll().subscribe({
      next: (allDependencies) => {
        const prestacionesEconomicasDependencies = allDependencies.filter(dep => 
          dep.dependencyType?.idDependencyType === 2 && 
          dep.ospe === true
        );

        if (prestacionesEconomicasDependencies.length === 0) {
          this.isLoading = false;
          this.prestacionesEconomicasFormulations = [];
          this.prestacionesEconomicasActivities = [];
          this.toastr.info('No se encontraron dependencias de prestaciones económicas.', 'Información');
          return;
        }

        // Buscar formulaciones para cada dependencia con el año y modificación especificados
        const formulationRequests: Observable<Formulation[]>[] = prestacionesEconomicasDependencies.map(dep => 
          this.formulationService.searchByDependencyAndYear(dep.idDependency!, this.currentFormulation!.year!)
        );

        forkJoin(formulationRequests).subscribe({
          next: (formulationArrays) => {
            // Combinar todas las formulaciones y filtrar por modificación
            const allFormulations = formulationArrays.flat();
            this.prestacionesEconomicasFormulations = allFormulations.filter(f => 
              f.modification === this.currentFormulation!.modification &&
              f.formulationType?.idFormulationType === 4 // Tipo de formulación para prestaciones económicas
            );

            if (this.prestacionesEconomicasFormulations.length === 0) {
              this.isLoading = false;
              this.prestacionesEconomicasActivities = [];
              this.toastr.info('No se encontraron formulaciones de prestaciones económicas para el año y modificación seleccionados.', 'Información');
              return;
            }

            // Cargar actividades operativas para todas las formulaciones encontradas
            const activityRequests: Observable<OperationalActivity[]>[] = this.prestacionesEconomicasFormulations.map(f => 
              this.operationalActivityService.searchByFormulation(f.idFormulation!)
            );

            forkJoin(activityRequests).subscribe({
              next: (activityArrays) => {
                // Combinar todas las actividades y crear objetos SIMPLES sin referencias circulares
                this.prestacionesEconomicasActivities = activityArrays.flat().map((activity) => {
                  // Encontrar el nombre de la dependencia directamente aquí
                  const formulation = this.prestacionesEconomicasFormulations.find(f => 
                    f.idFormulation === activity.formulation?.idFormulation
                  );
                  const dependencyName = formulation?.dependency?.name || 'Sin dependencia';
                  
                  // Crear objeto SIMPLE sin referencias profundas
                  const cleanActivity: OperationalActivity = {
                    // IDs y propiedades básicas
                    idOperationalActivity: activity.idOperationalActivity,
                    name: activity.name,
                    measurementUnit: activity.measurementUnit,
                    description: activity.description,
                    sapCode: activity.sapCode,
                    correlativeCode: activity.correlativeCode,
                    active: activity.active,
                    goods: activity.goods,
                    remuneration: activity.remuneration,
                    services: activity.services,
                    activityFamily: activity.activityFamily,
                    
                    // Objetos relacionados SOLO con IDs y nombres - SIN referencias circulares
                    managementCenter: activity.managementCenter ? {
                      idManagementCenter: activity.managementCenter.idManagementCenter,
                      name: activity.managementCenter.name
                    } as ManagementCenter : undefined,
                    
                    costCenter: activity.costCenter ? {
                      idCostCenter: activity.costCenter.idCostCenter,
                      name: activity.costCenter.name
                    } as CostCenter : undefined,
                    
                    financialFund: activity.financialFund ? {
                      idFinancialFund: activity.financialFund.idFinancialFund,
                      name: activity.financialFund.name
                    } as FinancialFund : undefined,
                    
                    priority: activity.priority ? {
                      idPriority: activity.priority.idPriority,
                      name: activity.priority.name
                    } as Priority : undefined,
                    
                    measurementType: activity.measurementType ? {
                      idMeasurementType: activity.measurementType.idMeasurementType,
                      name: activity.measurementType.name
                    } as MeasurementType : undefined,
                    
                    // StrategicAction SIN referencias profundas
                    strategicAction: activity.strategicAction ? {
                      idStrategicAction: activity.strategicAction.idStrategicAction,
                      code: activity.strategicAction.code,
                      name: activity.strategicAction.name,
                      strategicObjective: activity.strategicAction.strategicObjective ? {
                        idStrategicObjective: activity.strategicAction.strategicObjective.idStrategicObjective,
                        name: activity.strategicAction.strategicObjective.name,
                        code: activity.strategicAction.strategicObjective.code
                      } as StrategicObjective : undefined
                    } as StrategicAction : undefined,
                    
                    // Formulation SIMPLE
                    formulation: {
                      idFormulation: activity.formulation?.idFormulation,
                      dependency: {
                        name: dependencyName
                      }
                    } as Formulation,
                    
                    // Arrays NUEVOS sin referencias
                    monthlyGoals: this.createCleanMonthlyGoals(activity.monthlyGoals || []),
                    monthlyBudgets: this.createCleanMonthlyBudgets(activity.monthlyBudgets || [])
                  };
                  
                  return cleanActivity;
                });

                this.groupActivitiesByDependency();
                this.generateConsolidatedActivities(); // Generar vista consolidada
                this.isLoading = false;
              },
              error: (err) => {
                console.error('Error loading activities:', err);
                this.toastr.error('Error al cargar actividades de prestaciones económicas.', 'Error');
                this.isLoading = false;
                this.prestacionesEconomicasActivities = [];
              }
            });
          },
          error: (err) => {
            console.error('Error loading formulations:', err);
            this.toastr.error('Error al cargar formulaciones de prestaciones económicas.', 'Error');
            this.isLoading = false;
            this.prestacionesEconomicasFormulations = [];
            this.prestacionesEconomicasActivities = [];
          }
        });
      },
      error: (err) => {
        console.error('Error loading dependencies:', err);
        this.toastr.error('Error al cargar dependencias.', 'Error');
        this.isLoading = false;
      }
    });
  }

  private createCleanMonthlyGoals(existingGoals: MonthlyGoal[]): MonthlyGoal[] {
    const goals: MonthlyGoal[] = [];
    for (let i = 0; i < 12; i++) {
      const existingGoal = existingGoals?.find(g => g.goalOrder === i + 1);
      goals.push({
        idMonthlyGoal: existingGoal?.idMonthlyGoal || undefined,
        goalOrder: i + 1,
        value: existingGoal?.value || 0
      });
    }
    return goals;
  }

  private createCleanMonthlyBudgets(existingBudgets: MonthlyBudget[]): MonthlyBudget[] {
    const budgets: MonthlyBudget[] = [];
    for (let i = 0; i < 12; i++) {
      const existingBudget = existingBudgets?.find(b => b.budgetOrder === i + 1);
      budgets.push({
        idMonthlyBudget: existingBudget?.idMonthlyBudget || undefined,
        budgetOrder: i + 1,
        value: existingBudget?.value || 0
      });
    }
    return budgets;
  }

  private groupActivitiesByDependency(): void {
    this.groupedActivitiesByDependency = {};
    this.dependencyNamesList = [];
    
    if (!this.prestacionesEconomicasActivities?.length) {
      return;
    }

    // Usar un Set para evitar duplicados
    const processedActivities = new Set<number>();
    
    this.prestacionesEconomicasActivities.forEach((activity) => {
      // Evitar procesar actividades duplicadas
      if (processedActivities.has(activity.idOperationalActivity!)) {
        return;
      }
      
      processedActivities.add(activity.idOperationalActivity!);
      
      const dependencyName = activity.formulation?.dependency?.name || 'Sin dependencia';
      
      if (!this.groupedActivitiesByDependency[dependencyName]) {
        this.groupedActivitiesByDependency[dependencyName] = [];
      }
      
      this.groupedActivitiesByDependency[dependencyName].push(activity);
    });
    
    // Actualizar la lista de nombres de dependencias
    this.dependencyNamesList = Object.keys(this.groupedActivitiesByDependency);
  }

  closeModal(): void {
    this.displayModal = false;
    this.prestacionesEconomicasFormulations = [];
    this.prestacionesEconomicasActivities = [];
    this.groupedActivitiesByDependency = {};
    this.dependencyNamesList = [];
    this.editingActivity = null;
    this.showMonthlyDetailsModal = false;
    this.selectedActivityForDetails = null;
    this.modalClosed.emit();
  }

  getDependencyNames(): string[] {
    return this.dependencyNamesList;
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  getObjectKeysForActivities(): string[] {
    return Object.keys(this.groupedActivitiesByDependency || {});
  }

  getActivitiesForDependency(dependencyName: string): OperationalActivity[] {
    return this.groupedActivitiesByDependency?.[dependencyName] || [];
  }

  editActivity(activity: OperationalActivity): void {
    // Crear una copia SIMPLE sin referencias circulares
    this.editingActivity = {
      idOperationalActivity: activity.idOperationalActivity,
      name: activity.name,
      measurementUnit: activity.measurementUnit,
      description: activity.description,
      sapCode: activity.sapCode,
      correlativeCode: activity.correlativeCode,
      active: activity.active,
      goods: activity.goods,
      remuneration: activity.remuneration,
      services: activity.services,
      activityFamily: activity.activityFamily,
      
      // Strategic Action para mostrar correctamente
      strategicAction: activity.strategicAction ? {
        idStrategicAction: activity.strategicAction.idStrategicAction,
        code: activity.strategicAction.code,
        name: activity.strategicAction.name,
        strategicObjective: activity.strategicAction.strategicObjective ? {
          idStrategicObjective: activity.strategicAction.strategicObjective.idStrategicObjective,
          name: activity.strategicAction.strategicObjective.name,
          code: activity.strategicAction.strategicObjective.code
        } as StrategicObjective : undefined
      } as StrategicAction : undefined,

      // Formulation para guardar correctamente
      formulation: activity.formulation ? {
        idFormulation: activity.formulation.idFormulation
      } as Formulation : undefined,

      // Solo IDs para los objetos relacionados
      managementCenter: {
        idManagementCenter: activity.managementCenter?.idManagementCenter
      } as ManagementCenter,
      
      costCenter: {
        idCostCenter: activity.costCenter?.idCostCenter
      } as CostCenter,
      
      financialFund: {
        idFinancialFund: activity.financialFund?.idFinancialFund
      } as FinancialFund,
      
      priority: {
        idPriority: activity.priority?.idPriority
      } as Priority,
      
      // Arrays NUEVOS
      monthlyGoals: this.createCleanMonthlyGoals(activity.monthlyGoals || []),
      monthlyBudgets: this.createCleanMonthlyBudgets(activity.monthlyBudgets || [])
    } as OperationalActivity;
  }

  saveActivity(): void {
    if (!this.editingActivity || !this.editingActivity.idOperationalActivity) {
      return;
    }

    // Validaciones
    const validationErrors: string[] = [];

    if (!this.editingActivity.name?.trim()) {
      validationErrors.push('Nombre de actividad');
    }

    if (!this.editingActivity.measurementUnit?.trim()) {
      validationErrors.push('Unidad de medida');
    }

    if (!this.editingActivity.managementCenter?.idManagementCenter) {
      validationErrors.push('Centro gestor');
    }

    if (!this.editingActivity.costCenter?.idCostCenter) {
      validationErrors.push('Centro de costos');
    }

    if (!this.editingActivity.financialFund?.idFinancialFund) {
      validationErrors.push('Fondo financiero');
    }

    if (!this.editingActivity.priority?.idPriority) {
      validationErrors.push('Prioridad');
    }

    // Validar metas y presupuestos
    const hasValidGoals = this.editingActivity.monthlyGoals?.some(goal => (goal.value || 0) > 0);
    if (!hasValidGoals) {
      validationErrors.push('Al menos una meta mensual debe ser mayor a 0');
    }

    const hasValidBudgets = this.editingActivity.monthlyBudgets?.some(budget => (budget.value || 0) > 0);
    if (!hasValidBudgets) {
      validationErrors.push('Al menos un presupuesto mensual debe ser mayor a 0');
    }

    if (validationErrors.length > 0) {
      this.toastr.error(`Campos requeridos: ${validationErrors.join(', ')}`, 'Error de validación');
      return;
    }

    // Preparar actividad para actualizar
    const activityToUpdate = { ...this.editingActivity };
    
    // Asegurar que la formulación esté incluida (usar la de la actividad específica)
    if (this.editingActivity?.formulation?.idFormulation) {
      activityToUpdate.formulation = { idFormulation: this.editingActivity.formulation.idFormulation } as Formulation;
    } else if (this.currentFormulation?.idFormulation) {
      // Fallback al currentFormulation si la actividad no tiene uno
      activityToUpdate.formulation = { idFormulation: this.currentFormulation.idFormulation } as Formulation;
    }
    
    // Asegurar que los objetos relacionados tengan solo los IDs
    if (activityToUpdate.managementCenter?.idManagementCenter) {
      activityToUpdate.managementCenter = { idManagementCenter: activityToUpdate.managementCenter.idManagementCenter } as ManagementCenter;
    }
    
    if (activityToUpdate.costCenter?.idCostCenter) {
      activityToUpdate.costCenter = { idCostCenter: activityToUpdate.costCenter.idCostCenter } as CostCenter;
    }
    
    if (activityToUpdate.financialFund?.idFinancialFund) {
      activityToUpdate.financialFund = { idFinancialFund: activityToUpdate.financialFund.idFinancialFund } as FinancialFund;
    }
    
    if (activityToUpdate.priority?.idPriority) {
      activityToUpdate.priority = { idPriority: activityToUpdate.priority.idPriority } as Priority;
    }

    this.operationalActivityService.update(activityToUpdate).subscribe({
      next: () => {
        // Actualizar la actividad en la lista
        const index = this.prestacionesEconomicasActivities.findIndex(a => 
          a.idOperationalActivity === activityToUpdate.idOperationalActivity
        );
        if (index !== -1) {
          // Obtener los objetos completos para la visualización
          const fullManagementCenter = this.managementCenters.find(mc => 
            mc.idManagementCenter === activityToUpdate.managementCenter?.idManagementCenter
          );
          const fullCostCenter = this.costCenters.find(cc => 
            cc.idCostCenter === activityToUpdate.costCenter?.idCostCenter
          );
          const fullFinancialFund = this.financialFunds.find(ff => 
            ff.idFinancialFund === activityToUpdate.financialFund?.idFinancialFund
          );
          const fullPriority = this.priorities.find(p => 
            p.idPriority === activityToUpdate.priority?.idPriority
          );

          // Mantener la estructura sin referencias circulares
          this.prestacionesEconomicasActivities[index] = {
            ...this.prestacionesEconomicasActivities[index],
            name: activityToUpdate.name,
            measurementUnit: activityToUpdate.measurementUnit,
            description: activityToUpdate.description,
            managementCenter: fullManagementCenter || activityToUpdate.managementCenter,
            costCenter: fullCostCenter || activityToUpdate.costCenter,
            financialFund: fullFinancialFund || activityToUpdate.financialFund,
            priority: fullPriority || activityToUpdate.priority,
            monthlyGoals: activityToUpdate.monthlyGoals,
            monthlyBudgets: activityToUpdate.monthlyBudgets
          };
          
          this.groupActivitiesByDependency();
        }
        
        this.editingActivity = null;
        this.toastr.success('Actividad actualizada correctamente.', 'Éxito');
      },
      error: (err: any) => {
        console.error('Error updating activity:', err);
        this.toastr.error('Error al actualizar la actividad.', 'Error');
      }
    });
  }

  cancelEdit(): void {
    this.editingActivity = null;
  }

  deleteActivity(activity: OperationalActivity): void {
    if (!activity.idOperationalActivity) {
      return;
    }

    if (confirm('¿Está seguro de que desea eliminar esta actividad?')) {
      this.operationalActivityService.deleteById(activity.idOperationalActivity).subscribe({
        next: () => {
          // Remover la actividad de la lista
          this.prestacionesEconomicasActivities = this.prestacionesEconomicasActivities.filter(a => 
            a.idOperationalActivity !== activity.idOperationalActivity
          );
          this.groupActivitiesByDependency();
          this.toastr.success('Actividad eliminada correctamente.', 'Éxito');
        },
        error: (err: any) => {
          console.error('Error deleting activity:', err);
          this.toastr.error('Error al eliminar la actividad.', 'Error');
        }
      });
    }
  }

  isEditing(activity: OperationalActivity): boolean {
    return this.editingActivity?.idOperationalActivity === activity.idOperationalActivity;
  }

  // Helper methods para display - SIMPLES sin loops
  getStrategicObjectiveName(id?: number): string {
    if (!id) return '';
    return this.strategicObjectives.find(o => o.idStrategicObjective === id)?.name || '';
  }

  getStrategicActionName(id?: number): string {
    if (!id) return '';
    return this.strategicActions.find(a => a.idStrategicAction === id)?.name || '';
  }

  getStrategicObjectiveCodeDisplay(id?: number): string {
    if (!id) return '';
    const obj = this.strategicObjectives.find(o => o.idStrategicObjective === id);
    return obj?.code ? `O.E. ${obj.code}` : '';
  }

  getStrategicActionCodeDisplay(id?: number): string {
    if (!id) return '';
    const act = this.strategicActions.find(a => a.idStrategicAction === id);
    return act?.code ? `A.E. ${act.code}` : '';
  }

  getFinancialFundName(id?: number): string {
    if (!id) return '';
    return this.financialFunds.find(f => f.idFinancialFund === id)?.name || '';
  }

  getManagementCenterName(id?: number): string {
    if (!id) return '';
    return this.managementCenters.find(m => m.idManagementCenter === id)?.name || '';
  }

  getCostCenterName(id?: number): string {
    if (!id) return '';
    return this.costCenters.find(c => c.idCostCenter === id)?.name || '';
  }

  getMeasurementTypeName(id?: number): string {
    if (!id) return '';
    return this.measurementTypes.find(m => m.idMeasurementType === id)?.name || '';
  }

  getPriorityName(id?: number): string {
    if (!id) return '';
    return this.priorities.find(p => p.idPriority === id)?.name || '';
  }

  getDependencyName(activity: OperationalActivity): string {
    return activity?.formulation?.dependency?.name || 'Sin dependencia';
  }

  getMonthName(monthOrder: number): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthOrder - 1] || `Mes ${monthOrder}`;
  }

  // Funciones para calcular valores agregados (evita loops en template)
  getQuarterlyGoal(activity: OperationalActivity, quarter: number): number {
    if (!activity?.monthlyGoals || activity.monthlyGoals.length === 0) {
      return 0;
    }
    
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    
    let total = 0;
    for (let month = startMonth; month <= endMonth; month++) {
      const goal = activity.monthlyGoals.find(g => g.goalOrder === month);
      total += goal?.value || 0;
    }
    
    return total;
  }

  getTotalBudgetByType(activity: OperationalActivity, type: 'remuneration' | 'goods' | 'services'): number {
    if (!activity?.monthlyBudgets || activity.monthlyBudgets.length === 0) {
      // Si no hay presupuesto mensual, usar los valores básicos
      switch (type) {
        case 'remuneration': return activity?.remuneration || 0;
        case 'goods': return activity?.goods || 0;
        case 'services': return activity?.services || 0;
        default: return 0;
      }
    }
    
    // Sumar todos los presupuestos mensuales (asumiendo que están distribuidos)
    let total = 0;
    activity.monthlyBudgets.forEach(budget => {
      total += budget?.value || 0;
    });
    
    // Si hay presupuesto mensual, dividir proporcionalmente
    const totalBasic = (activity?.remuneration || 0) + (activity?.goods || 0) + (activity?.services || 0);
    if (totalBasic > 0) {
      const proportion = (activity?.[type] || 0) / totalBasic;
      return total * proportion;
    }
    
    return total / 3; // Dividir igualmente entre los 3 tipos si no hay proporción
  }

  viewMonthlyDetails(activity: OperationalActivity): void {
    this.selectedActivityForDetails = activity;
    this.showMonthlyDetailsModal = true;
  }

  closeMonthlyDetailsModal(): void {
    this.showMonthlyDetailsModal = false;
    this.selectedActivityForDetails = null;
  }

  // Update methods
  updateGoalValue(index: number, value: number): void {
    if (this.editingActivity?.monthlyGoals && this.editingActivity.monthlyGoals[index]) {
      this.editingActivity.monthlyGoals[index].value = value || 0;
    }
  }

  updateBudgetValue(index: number, value: number): void {
    if (this.editingActivity?.monthlyBudgets && this.editingActivity.monthlyBudgets[index]) {
      this.editingActivity.monthlyBudgets[index].value = value || 0;
    }
  }

  updateMonthlyGoal(index: number, value: string): void {
    if (this.editingActivity?.monthlyGoals && this.editingActivity.monthlyGoals[index]) {
      const numericValue = parseFloat(value) || 0;
      // No permitir valores negativos
      this.editingActivity.monthlyGoals[index].value = Math.max(0, numericValue);
    }
  }

  updateMonthlyBudget(index: number, value: string): void {
    if (this.editingActivity?.monthlyBudgets && this.editingActivity.monthlyBudgets[index]) {
      const numericValue = parseFloat(value) || 0;
      // No permitir valores negativos
      this.editingActivity.monthlyBudgets[index].value = Math.max(0, numericValue);
    }
  }

  updateManagementCenter(idManagementCenter: number): void {
    if (this.editingActivity) {
      this.editingActivity.managementCenter = { idManagementCenter } as ManagementCenter;
    }
  }

  updateCostCenter(idCostCenter: number): void {
    if (this.editingActivity) {
      this.editingActivity.costCenter = { idCostCenter } as CostCenter;
    }
  }

  updateFinancialFund(idFinancialFund: number): void {
    if (this.editingActivity) {
      this.editingActivity.financialFund = { idFinancialFund } as FinancialFund;
    }
  }

  updatePriority(idPriority: number): void {
    if (this.editingActivity) {
      this.editingActivity.priority = { idPriority } as Priority;
    }
  }

  updateActivityName(name: string): void {
    if (this.editingActivity) {
      this.editingActivity.name = name;
    }
  }

  updateMeasurementUnit(measurementUnit: string): void {
    if (this.editingActivity) {
      this.editingActivity.measurementUnit = measurementUnit;
    }
  }

  updateDescription(description: string): void {
    if (this.editingActivity) {
      this.editingActivity.description = description;
    }
  }

  // Métodos para calcular totales
  getTotalMonthlyGoals(activity: OperationalActivity | null): number {
    if (!activity?.monthlyGoals || activity.monthlyGoals.length === 0) {
      return 0;
    }
    return activity.monthlyGoals.reduce((total, goal) => total + (goal.value || 0), 0);
  }

  getTotalMonthlyBudgets(activity: OperationalActivity | null): number {
    if (!activity?.monthlyBudgets || activity.monthlyBudgets.length === 0) {
      return 0;
    }
    return activity.monthlyBudgets.reduce((total, budget) => total + (budget.value || 0), 0);
  }

  // Métodos para vista consolidada
  generateConsolidatedActivities(): void {
    if (!this.prestacionesEconomicasActivities?.length) {
      this.consolidatedActivities = [];
      return;
    }

    const groupedMap = new Map<string, any>();

    this.prestacionesEconomicasActivities.forEach(activity => {
      // Crear clave única para agrupar
      const groupKey = this.createGroupKey(activity);
      
      if (groupedMap.has(groupKey)) {
        const existing = groupedMap.get(groupKey);
        
        // Sumar metas mensuales
        for (let i = 0; i < 12; i++) {
          const existingGoal = existing.consolidatedGoals[i] || 0;
          const activityGoal = activity.monthlyGoals?.[i]?.value || 0;
          existing.consolidatedGoals[i] = existingGoal + activityGoal;
        }
        
        // Sumar presupuestos mensuales
        for (let i = 0; i < 12; i++) {
          const existingBudget = existing.consolidatedBudgets[i] || 0;
          const activityBudget = activity.monthlyBudgets?.[i]?.value || 0;
          existing.consolidatedBudgets[i] = existingBudget + activityBudget;
        }
        
        // Incrementar contador de actividades
        existing.activityCount++;
        
      } else {
        // Crear nuevo grupo
        const consolidatedItem = {
          groupKey,
          strategicAction: activity.strategicAction,
          name: activity.name,
          measurementUnit: activity.measurementUnit,
          activityCount: 1,
          consolidatedGoals: new Array(12).fill(0),
          consolidatedBudgets: new Array(12).fill(0)
        };
        
        // Inicializar metas mensuales
        for (let i = 0; i < 12; i++) {
          consolidatedItem.consolidatedGoals[i] = activity.monthlyGoals?.[i]?.value || 0;
        }
        
        // Inicializar presupuestos mensuales
        for (let i = 0; i < 12; i++) {
          consolidatedItem.consolidatedBudgets[i] = activity.monthlyBudgets?.[i]?.value || 0;
        }
        
        groupedMap.set(groupKey, consolidatedItem);
      }
    });

    this.consolidatedActivities = Array.from(groupedMap.values());
  }

  private createGroupKey(activity: OperationalActivity): string {
    return [
      activity.strategicAction?.strategicObjective?.idStrategicObjective || '',
      activity.strategicAction?.idStrategicAction || '',
      activity.name || '',
      activity.measurementUnit || ''
    ].join('|');
  }

  getConsolidatedTotalGoals(consolidatedItem: any): number {
    if (!consolidatedItem?.consolidatedGoals) {
      return 0;
    }
    return consolidatedItem.consolidatedGoals.reduce((total: number, goal: number) => total + (goal || 0), 0);
  }

  getConsolidatedTotalBudgets(consolidatedItem: any): number {
    if (!consolidatedItem?.consolidatedBudgets) {
      return 0;
    }
    return consolidatedItem.consolidatedBudgets.reduce((total: number, budget: number) => total + (budget || 0), 0);
  }

  // Método para cambiar entre vistas
  toggleConsolidatedView(): void {
    this.showConsolidatedView = !this.showConsolidatedView;
    if (this.showConsolidatedView) {
      this.generateConsolidatedActivities();
    }
  }
}
