import { Component, Input, Output, EventEmitter, inject, OnDestroy } from '@angular/core';
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
import { map } from 'rxjs/operators';

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
export class FormulacionOspesTablaComponent implements OnDestroy {
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
  @Output() activitiesCreated = new EventEmitter<OperationalActivity[]>();

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
  
  // Propiedades para manejo automático de actividades
  private activitiesCreatedFromConsolidated: boolean = false;
  private consolidatedActivitiesHash: string = '';
  private createdActivityIds: number[] = [];
  private lastActivitiesHash: string = ''; // Para detectar cambios en actividades originales
  private observationInterval: any = null; // Para observación periódica
  private isUpdatingActivities: boolean = false; // Para evitar actualizaciones concurrentes

  private toastr = inject(ToastrService);
  private formulationService = inject(FormulationService);
  private dependencyService = inject(DependencyService);
  private operationalActivityService = inject(OperationalActivityService);

  ngOnDestroy(): void {
    this.stopAutoObservation();
  }

  openModal(): void {
    if (!this.currentFormulation?.year || !this.currentFormulation?.modification) {
      this.toastr.error('No se ha seleccionado una formulación válida.', 'Error');
      return;
    }

    this.displayModal = true;
    this.loadPrestacionesEconomicasData();
    this.startAutoObservation(); // Iniciar observación automática
  }

  // Método público para recargar datos desde el componente padre
  public reloadData(): void {
    if (this.displayModal && this.currentFormulation?.year && this.currentFormulation?.modification) {
      this.loadPrestacionesEconomicasData();
    }
  }

  // Método para limpiar actividades duplicadas auto-generadas
  private cleanDuplicateAutoGeneratedActivities(): void {
    if (!this.currentFormulation?.idFormulation) {
      return;
    }

    this.operationalActivityService.searchByFormulation(this.currentFormulation.idFormulation)
      .subscribe({
        next: (activities) => {
          const autoGeneratedActivities = activities.filter(activity => 
            activity.active === false && 
            (activity.description?.includes('[AUTO]') || activity.description?.includes('[AUTO-UPD]'))
          );

          if (autoGeneratedActivities.length > this.consolidatedActivities.length) {
            console.log(`Encontradas ${autoGeneratedActivities.length} actividades auto-generadas, pero solo se necesitan ${this.consolidatedActivities.length}`);
            
            // Mantener solo las primeras N actividades (donde N = número de consolidados)
            const activitiesToKeep = autoGeneratedActivities.slice(0, this.consolidatedActivities.length);
            const activitiesToDelete = autoGeneratedActivities.slice(this.consolidatedActivities.length);
            
            console.log(`Eliminando ${activitiesToDelete.length} actividades duplicadas`);
            
            activitiesToDelete.forEach(activity => {
              if (activity.idOperationalActivity) {
                this.operationalActivityService.deleteById(activity.idOperationalActivity).subscribe({
                  next: () => console.log(`Actividad duplicada eliminada: ${activity.idOperationalActivity}`),
                  error: (err) => console.error('Error eliminando actividad duplicada:', err)
                });
              }
            });
          }
        },
        error: (err) => {
          console.error('Error al verificar actividades duplicadas:', err);
        }
      });
  }

  // Iniciar observación automática de cambios
  private startAutoObservation(): void {
    // Limpiar observación anterior si existe
    if (this.observationInterval) {
      clearInterval(this.observationInterval);
    }

    // Establecer hash inicial
    this.lastActivitiesHash = this.createOriginalActivitiesHash();

    // Observar cambios cada 3 segundos mientras el modal esté abierto
    // Solo si hay actividades auto-generadas o está en vista consolidada
    this.observationInterval = setInterval(() => {
      if (this.showConsolidatedView || this.activitiesCreatedFromConsolidated) {
        this.checkForOriginalActivitiesChanges();
      }
    }, 3000);
  }

  // Detener observación automática
  private stopAutoObservation(): void {
    if (this.observationInterval) {
      clearInterval(this.observationInterval);
      this.observationInterval = null;
    }
  }

  // Verificar cambios en las actividades originales
  private checkForOriginalActivitiesChanges(): void {
    if (!this.displayModal || !this.prestacionesEconomicasActivities?.length) {
      return;
    }

    const currentHash = this.createOriginalActivitiesHash();
    
    if (this.lastActivitiesHash !== currentHash) {
      console.log('Detectados cambios en actividades originales, regenerando consolidado...');
      
      // Actualizar hash
      this.lastActivitiesHash = currentHash;
      
      // Regenerar consolidado
      this.generateConsolidatedActivities();
      
      // Mostrar notificación discreta
      this.toastr.info('Consolidado actualizado automáticamente', 'Sincronización automática');
    }
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
                
                // Establecer hash inicial después de cargar los datos
                this.lastActivitiesHash = this.createOriginalActivitiesHash();
                
                // Limpiar duplicados si es necesario (solo en la primera carga)
                if (this.consolidatedActivities.length > 0) {
                  setTimeout(() => {
                    this.cleanDuplicateAutoGeneratedActivities();
                  }, 1000);
                }
                
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
    this.stopAutoObservation(); // Detener observación automática
    this.prestacionesEconomicasFormulations = [];
    this.prestacionesEconomicasActivities = [];
    this.groupedActivitiesByDependency = {};
    this.dependencyNamesList = [];
    
    // Resetear estado automático
    this.activitiesCreatedFromConsolidated = false;
    this.consolidatedActivitiesHash = '';
    this.createdActivityIds = [];
    this.consolidatedActivities = [];
    this.showConsolidatedView = false;
    this.editingActivity = null;
    this.showMonthlyDetailsModal = false;
    this.selectedActivityForDetails = null;
    this.lastActivitiesHash = '';
    this.isUpdatingActivities = false; // Resetear bandera de actualización
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
        
        // Regenerar consolidado después de guardar
        this.generateConsolidatedActivities();
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
          this.generateConsolidatedActivities(); // Regenerar consolidado
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
    
    // Verificar si hay cambios en el consolidado
    this.checkAndUpdateConsolidatedActivities();
  }

  // Método para extraer información de centros del consolidado
  private extractCentersFromConsolidated(consolidatedItem: any): {
    managementCenter?: ManagementCenter,
    costCenter?: CostCenter,
    financialFund?: FinancialFund
  } {
    // Buscar la primera actividad que coincida con este consolidado para obtener sus centros
    const matchingActivity = this.prestacionesEconomicasActivities.find(activity => 
      this.createGroupKey(activity) === consolidatedItem.groupKey
    );
    
    return {
      managementCenter: matchingActivity?.managementCenter || this.managementCenters?.[0],
      costCenter: matchingActivity?.costCenter || this.costCenters?.[0],
      financialFund: matchingActivity?.financialFund || this.financialFunds?.[0]
    };
  }

  // Método para verificar si ya existen actividades auto-generadas
  private checkForExistingAutoGeneratedActivities(): Observable<OperationalActivity[]> {
    if (!this.currentFormulation?.idFormulation) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    return this.operationalActivityService.searchByFormulation(this.currentFormulation.idFormulation)
      .pipe(
        map((activities: OperationalActivity[]) => 
          activities.filter(activity => 
            activity.active === false && 
            (activity.description?.includes('[AUTO]') || activity.description?.includes('[AUTO-UPD]')) &&
            activity.description?.includes('Actividad') && 
            (activity.description?.includes('automáticamente') || activity.description?.includes('actualizada'))
          )
        )
      );
  }

  // Método para verificar cambios y actualizar actividades automáticamente
  private checkAndUpdateConsolidatedActivities(): void {
    if (!this.consolidatedActivities?.length || !this.currentFormulation || this.isUpdatingActivities) {
      return;
    }

    this.isUpdatingActivities = true;

    // Verificar si ya existen actividades auto-generadas
    this.checkForExistingAutoGeneratedActivities().subscribe({
      next: (existingAutoActivities) => {
        console.log('Actividades auto-generadas encontradas:', existingAutoActivities.length);
        console.log('Actividades consolidadas actuales:', this.consolidatedActivities.length);
        
        if (existingAutoActivities.length === 0) {
          // No hay actividades auto-generadas, crear nuevas
          console.log('Creando nuevas actividades auto-generadas...');
          this.createActivitiesFromConsolidatedAutomatically();
          this.activitiesCreatedFromConsolidated = true;
          this.consolidatedActivitiesHash = this.createConsolidatedHash();
        } else {
          // Ya existen actividades auto-generadas, verificar si necesitan actualización
          const currentHash = this.createConsolidatedHash();
          if (this.consolidatedActivitiesHash !== currentHash && this.consolidatedActivitiesHash !== '') {
            console.log('Actualizando actividades auto-generadas existentes...');
            this.updateExistingAutoGeneratedActivities(existingAutoActivities);
            this.consolidatedActivitiesHash = currentHash;
          } else {
            console.log('Sin cambios en el consolidado, no se requiere actualización');
            this.activitiesCreatedFromConsolidated = true;
            this.consolidatedActivitiesHash = currentHash;
          }
        }
        
        this.isUpdatingActivities = false;
      },
      error: (err) => {
        console.error('Error checking existing auto-generated activities:', err);
        this.isUpdatingActivities = false;
      }
    });
  }

  // Crear hash único del estado consolidado para detectar cambios
  private createConsolidatedHash(): string {
    return JSON.stringify(
      this.consolidatedActivities.map(item => ({
        groupKey: item.groupKey,
        name: item.name,
        measurementUnit: item.measurementUnit,
        activityCount: item.activityCount,
        consolidatedGoals: item.consolidatedGoals,
        consolidatedBudgets: item.consolidatedBudgets,
        strategicAction: {
          id: item.strategicAction?.idStrategicAction,
          objective: item.strategicAction?.strategicObjective?.idStrategicObjective
        }
      }))
    );
  }

  // Crear hash de las actividades originales para detectar cambios
  private createOriginalActivitiesHash(): string {
    if (!this.prestacionesEconomicasActivities?.length) {
      return '';
    }
    
    return JSON.stringify(
      this.prestacionesEconomicasActivities.map(activity => ({
        id: activity.idOperationalActivity,
        name: activity.name,
        measurementUnit: activity.measurementUnit,
        strategicActionId: activity.strategicAction?.idStrategicAction,
        strategicObjectiveId: activity.strategicAction?.strategicObjective?.idStrategicObjective,
        monthlyGoals: activity.monthlyGoals?.map(mg => ({ order: mg.goalOrder, value: mg.value })),
        monthlyBudgets: activity.monthlyBudgets?.map(mb => ({ order: mb.budgetOrder, value: mb.value })),
        managementCenterId: activity.managementCenter?.idManagementCenter,
        costCenterId: activity.costCenter?.idCostCenter,
        financialFundId: activity.financialFund?.idFinancialFund
      }))
    );
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

  // Método automático para crear actividades (primera vez)
  private createActivitiesFromConsolidatedAutomatically(): void {
    if (!this.consolidatedActivities?.length || !this.currentFormulation) {
      return;
    }

    const createdActivities: OperationalActivity[] = [];

    this.consolidatedActivities.forEach((consolidatedItem, index) => {
      // Calcular presupuesto total mensual para servicios
      const totalMonthlyBudget = consolidatedItem.consolidatedBudgets?.reduce((sum: number, budget: number) => sum + (budget || 0), 0) || 0;
      
      const newActivity: OperationalActivity = {
        idOperationalActivity: undefined, // Será asignado por el backend al crear físicamente
        sapCode: '',
        correlativeCode: '',
        name: consolidatedItem.name || `Actividad Consolidada ${index + 1}`,
        description: `[AUTO] Actividad generada automáticamente desde consolidado. Agrupa ${consolidatedItem.activityCount} actividades.`,
        measurementUnit: consolidatedItem.measurementUnit || '',
        active: false, // Marcar como inactiva para identificar que es auto-generada
        
        strategicAction: consolidatedItem.strategicAction ? {
          idStrategicAction: consolidatedItem.strategicAction.idStrategicAction,
          code: consolidatedItem.strategicAction.code,
          name: consolidatedItem.strategicAction.name,
          strategicObjective: consolidatedItem.strategicAction.strategicObjective ? {
            idStrategicObjective: consolidatedItem.strategicAction.strategicObjective.idStrategicObjective,
            code: consolidatedItem.strategicAction.strategicObjective.code,
            name: consolidatedItem.strategicAction.strategicObjective.name,
            startYear: consolidatedItem.strategicAction.strategicObjective.startYear,
            endYear: consolidatedItem.strategicAction.strategicObjective.endYear
          } as StrategicObjective : {} as StrategicObjective
        } as StrategicAction : {} as StrategicAction,
        
        // Campos eliminados - van vacíos/nulos
        financialFund: undefined,
        managementCenter: undefined,
        costCenter: undefined,
        measurementType: undefined,
        priority: undefined,
        
        // Todo el presupuesto consolidado va a servicios
        goods: 0,
        remuneration: 0,
        services: totalMonthlyBudget,
        
        formulation: this.currentFormulation!,
        
        goals: this.convertMonthlyToQuarterlyGoals(consolidatedItem.consolidatedGoals || []),
        executedGoals: [
          { goalOrder: 1, value: 0, operationalActivity: {} } as any,
          { goalOrder: 2, value: 0, operationalActivity: {} } as any,
          { goalOrder: 3, value: 0, operationalActivity: {} } as any,
          { goalOrder: 4, value: 0, operationalActivity: {} } as any
        ],
        
        monthlyGoals: this.createMonthlyGoalsFromConsolidated(consolidatedItem.consolidatedGoals || []),
        monthlyBudgets: this.createMonthlyBudgetsFromConsolidated(consolidatedItem.consolidatedBudgets || [])
      };

      createdActivities.push(newActivity);
    });

    // Emitir las actividades creadas al componente padre para creación física
    this.activitiesCreated.emit(createdActivities);
    
    // Mostrar mensaje informativo (menos intrusivo)
    this.toastr.info(`Se crearon automáticamente ${createdActivities.length} actividades desde el consolidado.`, 'Auto-creación');
  }

  // Método para actualizar actividades auto-generadas existentes
  private updateExistingAutoGeneratedActivities(existingAutoActivities: OperationalActivity[]): void {
    if (!this.consolidatedActivities?.length || !existingAutoActivities.length) {
      return;
    }

    console.log('Consolidado actual tiene', this.consolidatedActivities.length, 'items');
    console.log('Actividades auto-generadas existentes:', existingAutoActivities.length);

    // Limitar las actividades existentes a solo las que corresponden al número actual de consolidados
    const activitiesToUpdate = existingAutoActivities.slice(0, this.consolidatedActivities.length);
    
    const updatedActivities: OperationalActivity[] = [];

    this.consolidatedActivities.forEach((consolidatedItem, index) => {
      // Solo actualizar si existe una actividad correspondiente en el índice
      if (index < activitiesToUpdate.length) {
        const activityToUpdate = activitiesToUpdate[index];
        
        // Calcular presupuesto total mensual para servicios
        const totalMonthlyBudget = consolidatedItem.consolidatedBudgets?.reduce((sum: number, budget: number) => sum + (budget || 0), 0) || 0;
        
        const updatedActivity: OperationalActivity = {
          ...activityToUpdate,
          name: consolidatedItem.name || `Actividad Consolidada ${index + 1}`,
          description: `[AUTO-UPD] Actividad actualizada automáticamente. Agrupa ${consolidatedItem.activityCount} actividades.`,
          measurementUnit: consolidatedItem.measurementUnit || activityToUpdate.measurementUnit,
          
          strategicAction: consolidatedItem.strategicAction ? {
            idStrategicAction: consolidatedItem.strategicAction.idStrategicAction,
            code: consolidatedItem.strategicAction.code,
            name: consolidatedItem.strategicAction.name,
            strategicObjective: consolidatedItem.strategicAction.strategicObjective ? {
              idStrategicObjective: consolidatedItem.strategicAction.strategicObjective.idStrategicObjective,
              code: consolidatedItem.strategicAction.strategicObjective.code,
              name: consolidatedItem.strategicAction.strategicObjective.name,
              startYear: consolidatedItem.strategicAction.strategicObjective.startYear,
              endYear: consolidatedItem.strategicAction.strategicObjective.endYear
            } as StrategicObjective : {} as StrategicObjective
          } as StrategicAction : activityToUpdate.strategicAction,
          
          // Para actualizaciones: mantener los campos existentes de la actividad original
          financialFund: activityToUpdate.financialFund || undefined,
          managementCenter: activityToUpdate.managementCenter || undefined,
          costCenter: activityToUpdate.costCenter || undefined,
          measurementType: activityToUpdate.measurementType || undefined,
          priority: activityToUpdate.priority || undefined,
          
          // Todo el presupuesto consolidado va a servicios
          goods: 0,
          remuneration: 0,
          services: totalMonthlyBudget,
          
          monthlyGoals: this.createMonthlyGoalsFromConsolidated(consolidatedItem.consolidatedGoals || []),
          monthlyBudgets: this.createMonthlyBudgetsFromConsolidated(consolidatedItem.consolidatedBudgets || [])
        };

        updatedActivities.push(updatedActivity);
      } else {
        // Si hay más items consolidados que actividades existentes, crear nuevas
        console.log(`Creando nueva actividad para item consolidado ${index + 1}`);
        
        const totalMonthlyBudget = consolidatedItem.consolidatedBudgets?.reduce((sum: number, budget: number) => sum + (budget || 0), 0) || 0;
        
        const newActivity: OperationalActivity = {
          idOperationalActivity: undefined,
          sapCode: '',
          correlativeCode: '',
          name: consolidatedItem.name || `Nueva Actividad Consolidada ${index + 1}`,
          description: `[AUTO] Nueva actividad generada automáticamente desde consolidado. Agrupa ${consolidatedItem.activityCount} actividades.`,
          measurementUnit: consolidatedItem.measurementUnit || '',
          active: false,
          
          strategicAction: consolidatedItem.strategicAction ? {
            idStrategicAction: consolidatedItem.strategicAction.idStrategicAction,
            code: consolidatedItem.strategicAction.code,
            name: consolidatedItem.strategicAction.name,
            strategicObjective: consolidatedItem.strategicAction.strategicObjective ? {
              idStrategicObjective: consolidatedItem.strategicAction.strategicObjective.idStrategicObjective,
              code: consolidatedItem.strategicAction.strategicObjective.code,
              name: consolidatedItem.strategicAction.strategicObjective.name,
              startYear: consolidatedItem.strategicAction.strategicObjective.startYear,
              endYear: consolidatedItem.strategicAction.strategicObjective.endYear
            } as StrategicObjective : {} as StrategicObjective
          } as StrategicAction : {} as StrategicAction,
          
          // Campos eliminados - van vacíos/nulos
          financialFund: undefined,
          managementCenter: undefined,
          costCenter: undefined,
          measurementType: undefined,
          priority: undefined,
          
          goods: 0,
          remuneration: 0,
          services: totalMonthlyBudget,
          
          formulation: this.currentFormulation!,
          
          goals: this.convertMonthlyToQuarterlyGoals(consolidatedItem.consolidatedGoals || []),
          executedGoals: [
            { goalOrder: 1, value: 0, operationalActivity: {} } as any,
            { goalOrder: 2, value: 0, operationalActivity: {} } as any,
            { goalOrder: 3, value: 0, operationalActivity: {} } as any,
            { goalOrder: 4, value: 0, operationalActivity: {} } as any
          ],
          
          monthlyGoals: this.createMonthlyGoalsFromConsolidated(consolidatedItem.consolidatedGoals || []),
          monthlyBudgets: this.createMonthlyBudgetsFromConsolidated(consolidatedItem.consolidatedBudgets || [])
        };

        updatedActivities.push(newActivity);
      }
    });

    if (updatedActivities.length > 0) {
      // Emitir las actividades actualizadas al componente padre para actualización física
      this.activitiesCreated.emit(updatedActivities);
      
      // Mostrar mensaje discreto de actualización
      const updateCount = updatedActivities.filter(a => a.idOperationalActivity).length;
      const createCount = updatedActivities.filter(a => !a.idOperationalActivity).length;
      
      if (updateCount > 0 && createCount > 0) {
        this.toastr.info(`Actualizadas: ${updateCount}, Creadas: ${createCount}`, 'Sincronización automática');
      } else if (updateCount > 0) {
        this.toastr.info(`Se actualizaron automáticamente ${updateCount} actividades consolidadas.`, 'Auto-actualización');
      } else if (createCount > 0) {
        this.toastr.info(`Se crearon automáticamente ${createCount} actividades consolidadas.`, 'Auto-creación');
      }
    }
  }

  // Método para actualizar actividades existentes cuando cambia el consolidado (método legacy)
  private updateExistingActivitiesFromConsolidated(): void {
    // Este método ahora es manejado por updateExistingAutoGeneratedActivities
    // Mantenido para compatibilidad pero puede ser removido en futuras versiones
    return;
  }

  // Método para crear actividades desde el consolidado
  createActivitiesFromConsolidated(): void {
    if (!this.consolidatedActivities?.length || !this.currentFormulation) {
      this.toastr.warning('No hay datos consolidados para crear actividades.', 'Advertencia');
      return;
    }

    const createdActivities: OperationalActivity[] = [];

    this.consolidatedActivities.forEach((consolidatedItem, index) => {
      // Calcular presupuesto total mensual para servicios
      const totalMonthlyBudget = consolidatedItem.consolidatedBudgets?.reduce((sum: number, budget: number) => sum + (budget || 0), 0) || 0;
      
      // Crear una nueva actividad operacional basada en el item consolidado
      const newActivity: OperationalActivity = {
        idOperationalActivity: undefined, // Será asignado por el backend
        sapCode: '', // Se generará automáticamente
        correlativeCode: '', // Se generará automáticamente
        name: consolidatedItem.name || `Actividad Consolidada ${index + 1}`,
        description: `Actividad creada desde consolidado de prestaciones económicas. Agrupa ${consolidatedItem.activityCount} actividades.`,
        measurementUnit: consolidatedItem.measurementUnit || '',
        active: false, // Marcar como inactiva para identificar que es auto-generada
        
        // Usar la información del strategic action del consolidado
        strategicAction: consolidatedItem.strategicAction ? {
          idStrategicAction: consolidatedItem.strategicAction.idStrategicAction,
          code: consolidatedItem.strategicAction.code,
          name: consolidatedItem.strategicAction.name,
          strategicObjective: consolidatedItem.strategicAction.strategicObjective ? {
            idStrategicObjective: consolidatedItem.strategicAction.strategicObjective.idStrategicObjective,
            code: consolidatedItem.strategicAction.strategicObjective.code,
            name: consolidatedItem.strategicAction.strategicObjective.name,
            startYear: consolidatedItem.strategicAction.strategicObjective.startYear,
            endYear: consolidatedItem.strategicAction.strategicObjective.endYear
          } as StrategicObjective : {} as StrategicObjective
        } as StrategicAction : {} as StrategicAction,
        
        // Campos eliminados - van vacíos/nulos
        financialFund: undefined,
        managementCenter: undefined,
        costCenter: undefined,
        measurementType: undefined,
        priority: undefined,
        
        // Todo el presupuesto consolidado va a servicios
        goods: 0,
        remuneration: 0,
        services: totalMonthlyBudget,
        
        formulation: this.currentFormulation!,
        
        // Convertir metas mensuales consolidadas a metas trimestrales
        goals: this.convertMonthlyToQuarterlyGoals(consolidatedItem.consolidatedGoals || []),
        executedGoals: [
          { goalOrder: 1, value: 0, operationalActivity: {} } as any,
          { goalOrder: 2, value: 0, operationalActivity: {} } as any,
          { goalOrder: 3, value: 0, operationalActivity: {} } as any,
          { goalOrder: 4, value: 0, operationalActivity: {} } as any
        ],
        
        // Crear metas y presupuestos mensuales desde el consolidado
        monthlyGoals: this.createMonthlyGoalsFromConsolidated(consolidatedItem.consolidatedGoals || []),
        monthlyBudgets: this.createMonthlyBudgetsFromConsolidated(consolidatedItem.consolidatedBudgets || [])
      };

      createdActivities.push(newActivity);
    });

    // Emitir las actividades creadas al componente padre
    this.activitiesCreated.emit(createdActivities);
    
    // Mostrar mensaje de éxito
    this.toastr.success(`Se crearon ${createdActivities.length} actividades desde el consolidado.`, 'Éxito');
    
    // Cerrar el modal
    this.closeModal();
  }

  // Método auxiliar para convertir metas mensuales a trimestrales
  private convertMonthlyToQuarterlyGoals(monthlyGoals: number[]): any[] {
    const quarterlyGoals = [0, 0, 0, 0];
    
    // Sumar metas por trimestre
    for (let i = 0; i < 12; i++) {
      const quarter = Math.floor(i / 3);
      quarterlyGoals[quarter] += monthlyGoals[i] || 0;
    }
    
    return quarterlyGoals.map((value, index) => ({
      goalOrder: index + 1,
      value: value,
      operationalActivity: {}
    }));
  }

  // Método auxiliar para crear metas mensuales
  private createMonthlyGoalsFromConsolidated(consolidatedGoals: number[]): MonthlyGoal[] {
    return consolidatedGoals.map((value, index) => ({
      idMonthlyGoal: undefined,
      goalOrder: index + 1,
      value: value || 0,
      operationalActivity: {} as OperationalActivity
    } as MonthlyGoal));
  }

  // Método auxiliar para crear presupuestos mensuales
  private createMonthlyBudgetsFromConsolidated(consolidatedBudgets: number[]): MonthlyBudget[] {
    return consolidatedBudgets.map((value, index) => ({
      idMonthlyBudget: undefined,
      budgetOrder: index + 1,
      value: value || 0,
      operationalActivity: {} as OperationalActivity
    } as MonthlyBudget));
  }
}
