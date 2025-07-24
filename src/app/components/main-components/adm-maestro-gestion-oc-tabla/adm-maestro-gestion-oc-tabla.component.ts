import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastrService } from 'ngx-toastr';
import { RippleModule } from 'primeng/ripple';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { forkJoin, Observable } from 'rxjs';

import { ActivityDetail } from '../../../models/logic/activityDetail.model';
import { StrategicAction } from '../../../models/logic/strategicAction.model';
import { StrategicObjective } from '../../../models/logic/strategicObjective.model';
import { Goal } from '../../../models/logic/goal.model';
import { FormulationType } from '../../../models/logic/formulationType.model';

import { ActivityDetailService } from '../../../core/services/logic/activity-detail.service';
import { StrategicActionService } from '../../../core/services/logic/strategic-action.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { GoalService } from '../../../core/services/logic/goal.service';
import { FormulationTypeService } from '../../../core/services/logic/formulation-type.service';

@Component({
  selector: 'app-adm-maestros-gestion-oc-tabla',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    RippleModule,
    SelectButtonModule,
    TooltipModule,
    TextareaModule,
    ProgressSpinnerModule
  ],
  templateUrl: './adm-maestro-gestion-oc-tabla.component.html',
  styleUrl: './adm-maestro-gestion-oc-tabla.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmMaestroGestionOcTablaComponent implements OnInit {

  // Data arrays
  activityDetails: ActivityDetail[] = [];
  allActivityDetails: ActivityDetail[] = [];
  strategicObjectives: StrategicObjective[] = [];
  allStrategicObjectives: StrategicObjective[] = [];
  strategicActions: StrategicAction[] = [];
  filteredStrategicActions: StrategicAction[] = [];
  formulationTypes: FormulationType[] = [];

  // Año
  years: number[] = [];
  yearOptions: Array<{ label: string; value: number }> = [];
  selectedYear: number = new Date().getFullYear();

  // Current formulation type (ID 2 - OD ACTIVIDADES DE GESTIÓN)
  currentFormulationType: FormulationType | null = null;

  // Table editing
  clonedActivities: { [s: string]: ActivityDetail } = {};
  editingRowKeys: { [s: string]: boolean } = {};
  loading = false;

  // Global filter and sizing
  globalFilterValue = '';
  selectedSize: any = 'small';
  sizes = [
    { name: 'Pequeño', value: 'small' },
    { name: 'Normal', value: 'normal' },
    { name: 'Grande', value: 'large' }
  ];

  // Counter for new activities (negative IDs)
  newActivityCounter = -1;

  // Modal for OE/AE selection
  displayOeAeModal = false;
  tempSelectedStrategicObjectiveId: number | null = null;
  tempSelectedStrategicActionId: number | null = null;
  currentEditingActivity: ActivityDetail | null = null;

  // Delete confirmation
  showDeleteConfirmation = false;
  activityToDelete: ActivityDetail | null = null;
  activityToDeleteIndex: number | null = null;

  constructor(
    private activityDetailService: ActivityDetailService,
    private strategicActionService: StrategicActionService,
    private strategicObjectiveService: StrategicObjectiveService,
    private goalService: GoalService,
    private formulationTypeService: FormulationTypeService,
    private toastr: ToastrService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadYearsAndData();
  }

  loadYearsAndData() {
    this.loading = true;
    this.strategicObjectiveService.getMinMaxYears().subscribe({
      next: (yearsRange) => {
        const minYear = yearsRange.minYear;
        const maxYear = yearsRange.maxYear;
        this.years = [];
        this.yearOptions = [];
        for (let year = minYear!; year! <= maxYear!; year!++) {
          this.years.push(year!);
          this.yearOptions.push({ label: year!.toString(), value: year! });
        }
        this.selectedYear = this.years.includes(this.selectedYear) ? this.selectedYear : this.years[this.years.length - 1];
        this.loadData();
      },
      error: (err) => {
        this.toastr.error('Error al cargar rango de años.', 'Error');
        this.loading = false;
      }
    });
  }

  loadData() {
    this.loading = true;
    
    // Load all required data
    Promise.all([
      this.loadStrategicObjectives(),
      this.loadStrategicActions(),
      this.loadFormulationTypes()
    ]).then(() => {
      this.loadActivityDetails();
    }).catch(error => {
      console.error('Error loading data:', error);
      this.toastr.error('Error al cargar los datos', 'Error');
      this.loading = false;
    });
  }

  loadStrategicObjectives(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.strategicObjectiveService.getAll().subscribe({
        next: (data) => {
          this.allStrategicObjectives = data
            .filter(so => so.active)
            .sort((a, b) => parseInt(a.code ?? '0', 10) - parseInt(b.code ?? '0', 10))
            .map(obj => ({
              ...obj,
              name: `O.E.${obj.code}: ${obj.name}`
            }));
          this.filterStrategicObjectivesByYear();
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  filterStrategicObjectivesByYear() {
    this.strategicObjectives = this.allStrategicObjectives.filter(so =>
      so.startYear <= this.selectedYear && so.endYear >= this.selectedYear
    );
  }

  loadStrategicActions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.strategicActionService.getAll().subscribe({
        next: (data) => {
          this.strategicActions = data
            .filter(sa => sa.active)
            .sort((a, b) => parseInt(a.code ?? '0', 10) - parseInt(b.code ?? '0', 10))
            .map(action => ({
              ...action,
              name: `A.E.${action.code}: ${action.name}`
            }));
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  loadFormulationTypes(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.formulationTypeService.getAll().subscribe({
        next: (data) => {
          this.formulationTypes = data.filter(ft => ft.active);
          // Set current formulation type to ID 2
          this.currentFormulationType = data.find(ft => ft.idFormulationType === 2) || null;
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  loadActivityDetails() {
    this.activityDetailService.getAll().subscribe({
      next: (data) => {
        // Guardar todas las actividades y filtrar por año y tipo
        this.allActivityDetails = data.filter(ad => ad.formulationType && ad.formulationType.idFormulationType === 2);
        this.filterActivityDetailsByYear();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading activity details:', error);
        this.toastr.error('Error al cargar las actividades de gestión', 'Error');
        this.loading = false;
      }
    });
  }

  filterActivityDetailsByYear() {
    this.activityDetails = this.allActivityDetails.filter(ad => ad.year === this.selectedYear).map(activity => {
      // Ensure goals are properly initialized and have correct references
      const loadedGoals = activity.goals || [];
      activity.goals = Array.from({ length: 4 }, (_, i) => {
        const existingGoal = loadedGoals.find(g => g.goalOrder === i + 1);
        return existingGoal || {
          goalOrder: i + 1,
          value: 0,
          activityDetail: { idActivityDetail: activity.idActivityDetail } as ActivityDetail
        } as Goal;
      });
      // Sort goals by order to ensure consistency
      activity.goals.sort((a, b) => a.goalOrder - b.goalOrder);
      return activity;
    });
  }

  // Table operations
  onRowEditInit(activity: ActivityDetail) {
    // Deep clone to preserve goals array
    this.clonedActivities[activity.idActivityDetail!] = {
      ...activity,
      goals: activity.goals ? [...activity.goals.map(g => ({ ...g }))] : []
    };
  }

  onRowEditSave(activity: ActivityDetail) {
    if (!this.isValidActivity(activity)) {
      this.toastr.error('Por favor complete todos los campos requeridos', 'Error de validación');
      return;
    }

    const strategicActionId = activity.strategicAction?.idStrategicAction;
    const strategicObjectiveId = activity.strategicAction?.strategicObjective?.idStrategicObjective;

    if (!strategicActionId || !strategicObjectiveId) {
      this.toastr.error('Debe seleccionar un Objetivo Estratégico y una Acción Estratégica.', 'Error de validación');
      return;
    }

    // Preparar el array de metas para enviar al backend
    const goalsToSend: Goal[] = (activity.goals || []).map(g => ({
      idGoal: g.idGoal,
      goalOrder: g.goalOrder,
      value: g.value,
      active: g.active !== undefined ? g.active : true,
      activityDetail: { idActivityDetail: activity.idActivityDetail || undefined } as ActivityDetail
    }));

    // Construir el objeto principal incluyendo goals y el año seleccionado
    const finalActivity: ActivityDetail = {
      ...activity,
      year: this.selectedYear,
      strategicAction: {
        idStrategicAction: strategicActionId,
        strategicObjective: { idStrategicObjective: strategicObjectiveId } as StrategicObjective
      } as StrategicAction,
      formulationType: this.currentFormulationType!,
      goals: goalsToSend
    };

    if (finalActivity.idActivityDetail && finalActivity.idActivityDetail > 0) {
      // Update existing activity (con metas incluidas)
      this.activityDetailService.update(finalActivity).subscribe({
        next: () => {
          this.toastr.success('Actividad y metas actualizadas correctamente.', 'Éxito');
          this.loadActivityDetails();
        },
        error: (err) => {
          this.toastr.error('Error al actualizar la actividad.', 'Error');
          console.error('Error al actualizar la actividad:', err);
          this.loadActivityDetails(); // Revert changes in UI
        }
      });
    } else {
      // Create new activity (con metas incluidas)
      const { idActivityDetail, ...activityForCreation } = finalActivity;

      this.activityDetailService.create(activityForCreation).subscribe({
        next: () => {
          this.toastr.success('Actividad y metas creadas correctamente.', 'Éxito');
          this.loadActivityDetails();
        },
        error: (err) => {
          this.toastr.error('Error al crear la actividad.', 'Error');
          console.error('Error al crear la actividad:', err);
          this.loadActivityDetails(); // Revert changes
        }
      });
    }

    delete this.editingRowKeys[activity.idActivityDetail!];
    delete this.clonedActivities[activity.idActivityDetail!];
  }

  onRowEditCancel(activity: ActivityDetail, index: number) {
    if (activity.idActivityDetail && activity.idActivityDetail > 0) {
      // Revert to original state for existing activities
      const clonedActivity = this.clonedActivities[activity.idActivityDetail];
      if (clonedActivity) {
        const activityIndex = this.activityDetails.findIndex(ad => ad.idActivityDetail === activity.idActivityDetail);
        if (activityIndex !== -1) {
          // Deep clone to restore goals properly
          this.activityDetails[activityIndex] = {
            ...clonedActivity,
            goals: clonedActivity.goals ? [...clonedActivity.goals.map(g => ({ ...g }))] : []
          };
        }
      }
    } else {
      // Remove newly added (unsaved) activities
      this.activityDetails.splice(index, 1);
      this.activityDetails = [...this.activityDetails]; // Force change detection
    }
    
    delete this.editingRowKeys[activity.idActivityDetail!];
    delete this.clonedActivities[activity.idActivityDetail!];
  }

  addNewActivity() {
    const newActivity: ActivityDetail = {
      idActivityDetail: this.newActivityCounter--, // Negative ID for new activities
      name: '',
      description: '',
      measurementUnit: '',
      active: true,
      head: false,
      year: this.selectedYear,
      strategicAction: {} as StrategicAction,
      formulationType: this.currentFormulationType!,
      goals: [
        { goalOrder: 1, value: 0, activityDetail: {} } as Goal,
        { goalOrder: 2, value: 0, activityDetail: {} } as Goal,
        { goalOrder: 3, value: 0, activityDetail: {} } as Goal,
        { goalOrder: 4, value: 0, activityDetail: {} } as Goal
      ]
    };

    this.activityDetails = [...this.activityDetails, newActivity];
    this.editingRowKeys[newActivity.idActivityDetail as any] = true;
  }

  onYearChange() {
    this.filterStrategicObjectivesByYear();
    this.filterActivityDetailsByYear();
  }

  deleteActivity(activity: ActivityDetail, index: number) {
    // Use the new eliminarActividad method
    this.eliminarActividad(index, activity);
  }

  // Filter strategic actions by objective
  getFilteredStrategicActions(strategicObjectiveId?: number): StrategicAction[] {
    if (!strategicObjectiveId) {
      return this.strategicActions;
    }
    return this.strategicActions.filter(sa => 
      sa.strategicObjective?.idStrategicObjective === strategicObjectiveId
    );
  }

  onStrategicObjectiveChange(activity: ActivityDetail, strategicObjectiveId: number) {
    // Reset strategic action when objective changes
    activity.strategicAction = {} as StrategicAction;
  }

  // Utility methods
  isValidActivity(activity: ActivityDetail): boolean {
    return !!(
      activity.name?.trim() &&
      activity.measurementUnit?.trim() &&
      activity.strategicAction?.idStrategicAction &&
      activity.strategicAction?.strategicObjective?.idStrategicObjective &&
      Array.isArray(activity.goals) && activity.goals.length > 0
    );
  }

  clear(table: any) {
    table.clear();
    this.globalFilterValue = '';
  }

  onGlobalFilter(table: any, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  getSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  getStatusText(active: boolean): string {
    return active ? 'Activo' : 'Inactivo';
  }

  getTotalGoals(activity: ActivityDetail): number {
    if (!activity.goals) return 0;
    return activity.goals.reduce((total, goal) => total + (goal.value || 0), 0);
  }

  // Modal methods for OE/AE selection
  openOeAeSelectionModal(activity: ActivityDetail) {
    this.currentEditingActivity = activity;
    this.tempSelectedStrategicObjectiveId = activity.strategicAction?.strategicObjective?.idStrategicObjective || null;
    this.tempSelectedStrategicActionId = activity.strategicAction?.idStrategicAction || null;
    this.displayOeAeModal = true;
    this.updateFilteredStrategicActions();
  }

  onModalStrategicObjectiveChange(event: any) {
    this.tempSelectedStrategicActionId = null;
    this.updateFilteredStrategicActions();
  }

  updateFilteredStrategicActions() {
    if (this.tempSelectedStrategicObjectiveId) {
      this.filteredStrategicActions = this.strategicActions.filter(sa => 
        sa.strategicObjective?.idStrategicObjective === this.tempSelectedStrategicObjectiveId
      );
    } else {
      this.filteredStrategicActions = [];
    }
  }

  confirmOeAeSelection() {
    if (this.currentEditingActivity && this.tempSelectedStrategicObjectiveId && this.tempSelectedStrategicActionId) {
      const selectedObjective = this.strategicObjectives.find(so => 
        so.idStrategicObjective === this.tempSelectedStrategicObjectiveId
      );
      const selectedAction = this.strategicActions.find(sa => 
        sa.idStrategicAction === this.tempSelectedStrategicActionId
      );

      if (selectedObjective && selectedAction) {
        this.currentEditingActivity.strategicAction = {
          ...selectedAction,
          strategicObjective: selectedObjective
        };
      }
    }
    this.cancelOeAeSelection();
  }

  cancelOeAeSelection() {
    this.displayOeAeModal = false;
    this.currentEditingActivity = null;
    this.tempSelectedStrategicObjectiveId = null;
    this.tempSelectedStrategicActionId = null;
    this.filteredStrategicActions = [];
  }

  // Utility methods for display
  getStrategicObjectiveCodeDisplay(objectiveId?: number): string {
    if (!objectiveId) return '';
    const objective = this.strategicObjectives.find(so => so.idStrategicObjective === objectiveId);
    return objective && objective.code ? `O.E. ${objective.code}` : '';
  }

  getStrategicObjectiveName(objectiveId?: number): string {
    if (!objectiveId) return '';
    const objective = this.strategicObjectives.find(so => so.idStrategicObjective === objectiveId);
    return objective?.name || '';
  }

  getStrategicActionCodeDisplay(actionId?: number): string {
    if (!actionId) return '';
    const action = this.strategicActions.find(sa => sa.idStrategicAction === actionId);
    return action && action.code ? `A.E. ${action.code}` : '';
  }

  getStrategicActionName(actionId?: number): string {
    if (!actionId) return '';
    const action = this.strategicActions.find(sa => sa.idStrategicAction === actionId);
    return action?.name || '';
  }

  // Delete confirmation methods
  eliminarActividad(index: number, activity: ActivityDetail) {
    if (activity.idActivityDetail && activity.idActivityDetail > 0) {
      this.activityToDelete = activity;
      this.activityToDeleteIndex = index;
      this.showDeleteConfirmation = true;
    } else {
      // It's a new (unsaved) activity, remove directly from the table
      this.activityDetails.splice(index, 1);
      this.activityDetails = [...this.activityDetails]; // Force change detection for the table
      this.toastr.info('Actividad no guardada eliminada.', 'Información');
    }
  }

  confirmDelete() {
    if (this.activityToDelete && this.activityToDelete.idActivityDetail) {
      this.activityDetailService.delete(this.activityToDelete.idActivityDetail).subscribe({
        next: () => {
          if (this.activityToDeleteIndex !== null) {
            this.activityDetails.splice(this.activityToDeleteIndex, 1);
            this.activityDetails = [...this.activityDetails];
          }
          this.toastr.success('Actividad eliminada correctamente.', 'Éxito');
          this.cancelDelete();
        },
        error: (error) => {
          console.error('Error deleting activity:', error);
          this.toastr.error('Error al eliminar la actividad.', 'Error');
          this.cancelDelete();
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteConfirmation = false;
    this.activityToDelete = null;
    this.activityToDeleteIndex = null;
  }
}