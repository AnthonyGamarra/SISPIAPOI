import { Component, OnInit, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
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
import { CheckboxModule } from 'primeng/checkbox';
import { forkJoin, Observable } from 'rxjs';

import { ActivityDetail } from '../../../models/logic/activityDetail.model';
import { StrategicAction } from '../../../models/logic/strategicAction.model';
import { StrategicObjective } from '../../../models/logic/strategicObjective.model';
import { FormulationType } from '../../../models/logic/formulationType.model';
import { ActivityFamily } from '../../../models/logic/activityFamily.model';
import { Dependency } from '../../../models/logic/dependency.model';

import { ActivityDetailService } from '../../../core/services/logic/activity-detail.service';
import { StrategicActionService } from '../../../core/services/logic/strategic-action.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { FormulationTypeService } from '../../../core/services/logic/formulation-type.service';
import { ActivityFamilyService } from '../../../core/services/logic/activity-family.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';

@Component({
  selector: 'app-adm-maestro-gcpamypcd-tabla',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
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
    ProgressSpinnerModule,
    CheckboxModule
  ],
  templateUrl: './adm-maestro-gcpamypcd-tabla.component.html',
  styleUrl: './adm-maestro-gcpamypcd-tabla.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmMaestroGcpamypcdTablaComponent implements OnInit {

  // ViewChild references for tables
  @ViewChild('familiesTable') familiesTable!: Table;
  @ViewChildren('activitiesTable') activitiesTables!: QueryList<Table>;

  // Data arrays
  activityDetails: ActivityDetail[] = [];
  allActivityDetails: ActivityDetail[] = [];
  strategicObjectives: StrategicObjective[] = [];
  allStrategicObjectives: StrategicObjective[] = [];
  strategicActions: StrategicAction[] = [];
  filteredStrategicActions: StrategicAction[] = [];
  formulationTypes: FormulationType[] = [];
  activityFamilies: ActivityFamily[] = [];
  dependencies: Dependency[] = [];
  groupedActivitiesByFamily: { [familyName: string]: ActivityDetail[] } = {};

  // Año
  years: number[] = [];
  yearOptions: Array<{ label: string; value: number }> = [];
  selectedYear: number = new Date().getFullYear();

  // Current formulation type (ID 4 - OD ACTIVIDADES DE GESTIÓN)
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

  // Replicate dialog
  showReplicateDialog = false;
  replicateYear: number | null = null;

  // Family management
  editingFamilyRowKeys: { [s: string]: boolean } = {};
  clonedFamilies: { [s: string]: ActivityFamily } = {};
  newFamilyCounter = -1;
  showDeleteFamilyConfirmation = false;
  familyToDelete: ActivityFamily | null = null;
  familyToDeleteIndex: number | null = null;

  constructor(
    private activityDetailService: ActivityDetailService,
    private strategicActionService: StrategicActionService,
    private strategicObjectiveService: StrategicObjectiveService,
    private formulationTypeService: FormulationTypeService,
    private activityFamilyService: ActivityFamilyService,
    private dependencyService: DependencyService,
    private toastr: ToastrService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

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
      this.loadFormulationTypes(),
      this.loadActivityFamilies(),
      this.loadDependencies()
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
          // Set current formulation type to ID 5
          this.currentFormulationType = data.find(ft => ft.idFormulationType === 5) || null;
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  loadActivityFamilies(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.activityFamilyService.getAll().subscribe({
        next: (data) => {
          // Filter only families with type 'sociales' and sort alphabetically
          this.activityFamilies = data
            .filter(af => af.active && af.type === 'sociales')
            .sort((a, b) => a.name.localeCompare(b.name));
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  loadDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dependencyService.getAll().subscribe({
        next: (data) => {
          // Filter dependencies with dependencyType = 2 and ospe = false
          this.dependencies = data.filter(dep =>
            dep.active &&
            dep.dependencyType?.idDependencyType === 2 &&
            dep.ospe === false
          ).sort((a, b) => {
            // Primary sort: Alphabetically descending (Z to A)
            const nameComparison = b.name.localeCompare(a.name);
            if (nameComparison !== 0) {
              return nameComparison;
            }
            // Secondary sort: social = true first (checked), then false (unchecked)
            return b.social ? 1 : -1;
          });
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
        this.allActivityDetails = data.filter(ad => ad.formulationType && ad.formulationType.idFormulationType === 5);
        this.filterActivityDetailsByYear();
        this.groupActivitiesByFamily();
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
    this.activityDetails = this.allActivityDetails.filter(ad => ad.year === this.selectedYear);
    this.groupActivitiesByFamily();
  }

  groupActivitiesByFamily() {
    this.groupedActivitiesByFamily = {};

    this.activityDetails.forEach(activity => {
      // Only group activities that belong to families with type 'sociales'
      if (activity.activityFamily && activity.activityFamily.type === 'sociales') {
        const familyName = activity.activityFamily.name || 'Sin unidad operativa';

        if (!this.groupedActivitiesByFamily[familyName]) {
          this.groupedActivitiesByFamily[familyName] = [];
        }

        this.groupedActivitiesByFamily[familyName].push(activity);
      }
    });
  }

  // Table operations
  onRowEditInit(activity: ActivityDetail) {
    // Clone activity for revert purposes
    this.clonedActivities[activity.idActivityDetail!] = { ...activity };
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

    if (!activity.activityFamily?.idActivityFamily) {
      this.toastr.error('Debe seleccionar una Unidad Operativa.', 'Error de validación');
      return;
    }

    // Get the complete family object
    const selectedFamily = this.activityFamilies.find(af =>
      af.idActivityFamily === activity.activityFamily?.idActivityFamily
    );

    // Construir el objeto principal con el año seleccionado
    const finalActivity: ActivityDetail = {
      ...activity,
      year: this.selectedYear,
      strategicAction: {
        idStrategicAction: strategicActionId,
        strategicObjective: { idStrategicObjective: strategicObjectiveId } as StrategicObjective
      } as StrategicAction,
      formulationType: this.currentFormulationType!,
      activityFamily: selectedFamily || activity.activityFamily
    };

    if (finalActivity.idActivityDetail && finalActivity.idActivityDetail > 0) {
      // Update existing activity
      this.activityDetailService.update(finalActivity).subscribe({
        next: () => {
          this.toastr.success('Actividad actualizada correctamente.', 'Éxito');

          // Update only the specific row instead of reloading all data
          const activityIndex = this.activityDetails.findIndex(ad =>
            ad.idActivityDetail === finalActivity.idActivityDetail
          );
          if (activityIndex !== -1) {
            this.activityDetails[activityIndex] = finalActivity;
            this.activityDetails = [...this.activityDetails]; // Force change detection
          }

          // Also update the allActivityDetails array
          const allActivityIndex = this.allActivityDetails.findIndex(ad =>
            ad.idActivityDetail === finalActivity.idActivityDetail
          );
          if (allActivityIndex !== -1) {
            this.allActivityDetails[allActivityIndex] = finalActivity;
          }
        },
        error: (err) => {
          this.toastr.error('Error al actualizar la actividad.', 'Error');
          console.error('Error al actualizar la actividad:', err);
          // Revert to original state
          const clonedActivity = this.clonedActivities[activity.idActivityDetail!];
          if (clonedActivity) {
            const activityIndex = this.activityDetails.findIndex(ad => ad.idActivityDetail === activity.idActivityDetail);
            if (activityIndex !== -1) {
              this.activityDetails[activityIndex] = { ...clonedActivity };
              this.activityDetails = [...this.activityDetails];
            }
          }
        }
      });
    } else {
      // Create new activity
      const { idActivityDetail, ...activityForCreation } = finalActivity;

      this.activityDetailService.create(activityForCreation).subscribe({
        next: (createdActivity) => {
          this.toastr.success('Actividad creada correctamente.', 'Éxito');

          // Update the current activity with the new ID and data
          const activityIndex = this.activityDetails.findIndex(ad =>
            ad.idActivityDetail === activity.idActivityDetail
          );
          if (activityIndex !== -1 && createdActivity) {
            this.activityDetails[activityIndex] = createdActivity;
            this.activityDetails = [...this.activityDetails]; // Force change detection
          }

          // Add to allActivityDetails array
          if (createdActivity) {
            this.allActivityDetails.push(createdActivity);
          }

          // Refresh grouping after creating activity
          this.groupActivitiesByFamily();
        },
        error: (err) => {
          this.toastr.error('Error al crear la actividad.', 'Error');
          console.error('Error al crear la actividad:', err);
          // Remove the failed new activity
          const activityIndex = this.activityDetails.findIndex(ad =>
            ad.idActivityDetail === activity.idActivityDetail
          );
          if (activityIndex !== -1) {
            this.activityDetails.splice(activityIndex, 1);
            this.activityDetails = [...this.activityDetails];
          }
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
          this.activityDetails[activityIndex] = { ...clonedActivity };
          this.activityDetails = [...this.activityDetails]; // Force change detection
        }
      }
    } else {
      // Remove newly added (unsaved) activities - find by ID instead of index to be safer
      const activityIndex = this.activityDetails.findIndex(ad => ad.idActivityDetail === activity.idActivityDetail);
      if (activityIndex !== -1) {
        this.activityDetails.splice(activityIndex, 1);
        this.activityDetails = [...this.activityDetails]; // Force change detection
      }
    }

    delete this.editingRowKeys[activity.idActivityDetail!];
    delete this.clonedActivities[activity.idActivityDetail!];

    // Re-group activities after canceling to ensure proper display
    this.groupActivitiesByFamily();
  }

  addNewActivity() {
    // Check if there are activity families available
    if (this.activityFamilies.length === 0) {
      this.toastr.warning('Primero debe crear al menos una Unidad Operativa antes de agregar actividades.', 'Advertencia');
      return;
    }

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
      activityFamily: {} as ActivityFamily // Initialize empty family for selection
    };

    this.activityDetails = [...this.activityDetails, newActivity];
    this.editingRowKeys[newActivity.idActivityDetail as any] = true;
  }

  addNewActivityForFamily(familyId: number | undefined) {
    if (!familyId) {
      console.error('No se puede crear actividad sin ID de familia válido');
      return;
    }

    const family = this.activityFamilies.find(f => f.idActivityFamily === familyId);
    if (!family) {
      console.error('Familia no encontrada con ID:', familyId);
      return;
    }

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
      activityFamily: { ...family } // Pre-select the family
    };

    this.activityDetails = [...this.activityDetails, newActivity];
    this.editingRowKeys[newActivity.idActivityDetail as any] = true;

    // Re-group activities to show the new activity in the correct family section
    this.groupActivitiesByFamily();

    // Navigate to the last page for this family's activities table
    setTimeout(() => {
      const familyActivities = this.getActivitiesForFamily(family.name);
      const familyIndex = this.activityFamilies.findIndex(f => f.idActivityFamily === familyId);
      
      if (this.activitiesTables && familyIndex >= 0) {
        const activitiesTablesArray = this.activitiesTables.toArray();
        const familyTable = activitiesTablesArray[familyIndex];
        
        if (familyTable) {
          const totalRecords = familyActivities.length;
          const rowsPerPage = familyTable.rows || 11;
          const lastPage = Math.ceil(totalRecords / rowsPerPage) - 1;
          
          if (familyTable.first !== lastPage * rowsPerPage) {
            familyTable.first = lastPage * rowsPerPage;
          }
        }
      }
    }, 200);
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
      activity.activityFamily?.idActivityFamily
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

  getActivitiesCountForFamily(familyId: number): number {
    return this.activityDetails.filter(activity =>
      activity.activityFamily?.idActivityFamily === familyId &&
      activity.activityFamily?.type === 'sociales'
    ).length;
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

  // Replicate methods
  openReplicateDialog() {
    this.showReplicateDialog = true;
    this.replicateYear = null;
  }

  replicateActivities() {
    if (!this.replicateYear || this.replicateYear === this.selectedYear) {
      this.toastr.error('Debe seleccionar un año destino diferente al actual.', 'Error');
      return;
    }

    if (this.activityDetails.length === 0) {
      this.toastr.error('No hay actividades para replicar en el año actual.', 'Error');
      return;
    }

    this.loading = true;

    // Check if there are already activities for the target year
    const existingActivitiesForYear = this.allActivityDetails.filter(ad => ad.year === this.replicateYear);

    if (existingActivitiesForYear.length > 0) {
      this.loading = false;
      this.toastr.warning(`Ya existen actividades para el año ${this.replicateYear}. No se puede replicar.`, 'Advertencia');
      return;
    }

    // Create activities for replication
    const activitiesToReplicate = this.activityDetails.map(activity => ({
      name: activity.name,
      description: activity.description,
      measurementUnit: activity.measurementUnit,
      active: true,
      head: false,
      year: this.replicateYear!,
      strategicAction: {
        idStrategicAction: activity.strategicAction?.idStrategicAction,
        strategicObjective: {
          idStrategicObjective: activity.strategicAction?.strategicObjective?.idStrategicObjective
        } as StrategicObjective
      } as StrategicAction,
      formulationType: this.currentFormulationType!
    }));

    // Create all activities in parallel
    const createRequests = activitiesToReplicate.map(activity =>
      this.activityDetailService.create(activity)
    );

    forkJoin(createRequests).subscribe({
      next: () => {
        this.toastr.success(`${activitiesToReplicate.length} actividades replicadas correctamente para el año ${this.replicateYear}.`, 'Éxito');
        this.showReplicateDialog = false;
        this.replicateYear = null;
        this.loadActivityDetails(); // Reload to include new activities
        this.loading = false;
      },
      error: (error) => {
        console.error('Error replicating activities:', error);
        this.toastr.error('Error al replicar las actividades.', 'Error');
        this.loading = false;
      }
    });
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
            // Remove from current view
            this.activityDetails.splice(this.activityToDeleteIndex, 1);
            this.activityDetails = [...this.activityDetails];

            // Remove from all activities array
            const allActivityIndex = this.allActivityDetails.findIndex(ad =>
              ad.idActivityDetail === this.activityToDelete!.idActivityDetail
            );
            if (allActivityIndex !== -1) {
              this.allActivityDetails.splice(allActivityIndex, 1);
            }
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

  // Family management methods
  addNewFamily() {
    const newFamily: ActivityFamily = {
      idActivityFamily: this.newFamilyCounter--,
      name: '',
      description: '', // Empty description by default
      active: true,
      type: 'sociales' // Default type set to 'sociales'
    };

    this.activityFamilies = [...this.activityFamilies, newFamily];
    this.editingFamilyRowKeys[newFamily.idActivityFamily as any] = true;

    // Navigate to the last page if the new family would be on a new page
    setTimeout(() => {
      if (this.familiesTable) {
        const totalRecords = this.activityFamilies.length;
        const rowsPerPage = this.familiesTable.rows || 5;
        const lastPage = Math.ceil(totalRecords / rowsPerPage) - 1;
        
        if (this.familiesTable.first !== lastPage * rowsPerPage) {
          this.familiesTable.first = lastPage * rowsPerPage;
        }
      }
    }, 100);
  }

  onFamilyRowEditInit(family: ActivityFamily) {
    this.clonedFamilies[family.idActivityFamily!] = { ...family };
  }

  onFamilyRowEditSave(family: ActivityFamily) {
    if (!this.isValidFamily(family)) {
      this.toastr.error('Por favor complete todos los campos requeridos', 'Error de validación');
      return;
    }

    // Ensure description is empty
    family.description = '';

    if (family.idActivityFamily && family.idActivityFamily > 0) {
      // Update existing family
      this.activityFamilyService.update(family).subscribe({
        next: () => {
          this.toastr.success('Unidad operativa actualizada correctamente.', 'Éxito');
          const familyIndex = this.activityFamilies.findIndex(af =>
            af.idActivityFamily === family.idActivityFamily
          );
          if (familyIndex !== -1) {
            this.activityFamilies[familyIndex] = family;
            // Re-sort families alphabetically after update
            this.activityFamilies.sort((a, b) => a.name.localeCompare(b.name));
            this.activityFamilies = [...this.activityFamilies];
          }
        },
        error: (err) => {
          this.toastr.error('Error al actualizar la unidad operativa.', 'Error');
          console.error('Error al actualizar la unidad operativa:', err);
        }
      });
    } else {
      // Create new family
      const { idActivityFamily, ...familyForCreation } = family;

      this.activityFamilyService.create(familyForCreation).subscribe({
        next: (createdFamily) => {
          this.toastr.success('Unidad operativa creada correctamente.', 'Éxito');
          const familyIndex = this.activityFamilies.findIndex(af =>
            af.idActivityFamily === family.idActivityFamily
          );
          if (familyIndex !== -1 && createdFamily) {
            this.activityFamilies[familyIndex] = createdFamily;
            // Re-sort families alphabetically after creation
            this.activityFamilies.sort((a, b) => a.name.localeCompare(b.name));
            this.activityFamilies = [...this.activityFamilies];
          }
        },
        error: (err) => {
          this.toastr.error('Error al crear la unidad operativa.', 'Error');
          console.error('Error al crear la unidad operativa:', err);
        }
      });
    }

    delete this.editingFamilyRowKeys[family.idActivityFamily as any];
    delete this.clonedFamilies[family.idActivityFamily!];
  }

  onFamilyRowEditCancel(family: ActivityFamily, index: number) {
    if (family.idActivityFamily && family.idActivityFamily > 0) {
      const clonedFamily = this.clonedFamilies[family.idActivityFamily];
      if (clonedFamily) {
        const familyIndex = this.activityFamilies.findIndex(af => af.idActivityFamily === family.idActivityFamily);
        if (familyIndex !== -1) {
          this.activityFamilies[familyIndex] = { ...clonedFamily };
        }
      }
    } else {
      this.activityFamilies.splice(index, 1);
      this.activityFamilies = [...this.activityFamilies];
    }

    delete this.editingFamilyRowKeys[family.idActivityFamily as any];
    delete this.clonedFamilies[family.idActivityFamily!];
  }

  eliminarFamilia(index: number, family: ActivityFamily) {
    // Check if family has associated activities
    const activitiesCount = this.getActivitiesCountForFamily(family.idActivityFamily!);
    if (activitiesCount > 0) {
      this.toastr.error(`No se puede eliminar la unidad operativa "${family.name}" porque tiene ${activitiesCount} actividades asociadas.`, 'Error');
      return;
    }

    if (family.idActivityFamily && family.idActivityFamily > 0) {
      this.familyToDelete = family;
      this.familyToDeleteIndex = index;
      this.showDeleteFamilyConfirmation = true;
    } else {
      this.activityFamilies.splice(index, 1);
      this.activityFamilies = [...this.activityFamilies];
      this.toastr.info('Unidad operativa no guardada eliminada.', 'Información');
    }
  }

  confirmDeleteFamily() {
    if (this.familyToDelete && this.familyToDelete.idActivityFamily) {
      this.activityFamilyService.delete(this.familyToDelete.idActivityFamily).subscribe({
        next: () => {
          if (this.familyToDeleteIndex !== null) {
            this.activityFamilies.splice(this.familyToDeleteIndex, 1);
            this.activityFamilies = [...this.activityFamilies];
          }
          this.toastr.success('Unidad operativa eliminada correctamente.', 'Éxito');
          this.cancelDeleteFamily();
        },
        error: (error) => {
          console.error('Error deleting family:', error);
          this.toastr.error('Error al eliminar la unidad operativa.', 'Error');
          this.cancelDeleteFamily();
        }
      });
    }
  }

  cancelDeleteFamily() {
    this.showDeleteFamilyConfirmation = false;
    this.familyToDelete = null;
    this.familyToDeleteIndex = null;
  }

  isValidFamily(family: ActivityFamily): boolean {
    return !!(family.name?.trim());
  }

  getFamilyNames(): string[] {
    return Object.keys(this.groupedActivitiesByFamily).sort((a, b) => a.localeCompare(b));
  }

  getActivitiesForFamily(familyName: string): ActivityDetail[] {
    return this.groupedActivitiesByFamily[familyName] || [];
  }

  hasNewActivities(): boolean {
    return this.activityDetails.some(activity =>
      activity.idActivityDetail && activity.idActivityDetail < 0
    );
  }

  getNewActivities(): ActivityDetail[] {
    return this.activityDetails.filter(activity =>
      activity.idActivityDetail && activity.idActivityDetail < 0
    );
  }

  getFamilyName(familyId?: number): string {
    if (!familyId) return '';
    const family = this.activityFamilies.find(af => af.idActivityFamily === familyId);
    return family?.name || '';
  }

  getFamilyIdByName(familyName: string): number | undefined {
    const family = this.activityFamilies.find(f => f.name === familyName);
    return family ? family.idActivityFamily : undefined;
  }

  // Dependency management methods
  onDependencySocialChange(dependency: Dependency, socialValue: boolean) {
    dependency.social = socialValue;
    this.updateDependency(dependency);
  }

  updateDependency(dependency: Dependency) {
    if (dependency.idDependency) {
      this.dependencyService.update(dependency).subscribe({
        next: () => {
          this.toastr.success('Dependencia actualizada correctamente.', 'Éxito');
          // Re-sort dependencies after update
          this.sortDependencies();
        },
        error: (error) => {
          console.error('Error updating dependency:', error);
          this.toastr.error('Error al actualizar la dependencia.', 'Error');
          // Revert the change on error
          dependency.social = !dependency.social;
        }
      });
    }
  }

  sortDependencies() {
    this.dependencies.sort((a, b) => {
      // Primary sort: Alphabetically descending (Z to A)
      const nameComparison = b.name.localeCompare(a.name);
      if (nameComparison !== 0) {
        return nameComparison;
      }
      // Secondary sort: social = true first (checked), then false (unchecked)
      return b.social ? 1 : -1;
    });
  }
}