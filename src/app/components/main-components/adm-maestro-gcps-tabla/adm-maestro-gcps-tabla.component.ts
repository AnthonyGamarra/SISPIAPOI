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
import { FileUploadModule } from 'primeng/fileupload';
import * as ExcelJS from 'exceljs';
import { forkJoin, Observable } from 'rxjs';

import { ActivityDetail } from '../../../models/logic/activityDetail.model';
import { StrategicAction } from '../../../models/logic/strategicAction.model';
import { StrategicObjective } from '../../../models/logic/strategicObjective.model';
import { FormulationType } from '../../../models/logic/formulationType.model';
import { Formulation } from '../../../models/logic/formulation.model';
import { Dependency } from '../../../models/logic/dependency.model';

import { ActivityDetailService } from '../../../core/services/logic/activity-detail.service';
import { StrategicActionService } from '../../../core/services/logic/strategic-action.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { FormulationTypeService } from '../../../core/services/logic/formulation-type.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';
import { ImportTemplateService, ImportResult } from './middleware/import-template';

@Component({
  selector: 'app-adm-maestro-gcps-tabla',
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
    CheckboxModule,
    FileUploadModule
  ],
  templateUrl: './adm-maestro-gcps-tabla.component.html',
  styleUrl: './adm-maestro-gcps-tabla.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmMaestroGcpsTablaComponent implements OnInit {

  // ViewChild references for tables
  @ViewChildren('activitiesTable') activitiesTables!: QueryList<Table>;

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

  // Etapa (modification)
  modificationOptions: Array<{ label: string; value: number }> = [];
  selectedModification: number = 1;

  // Current formulation type (ID 3 - GESTIÓN - PRESTACIONES DE SALUD)
  currentFormulationType: FormulationType | null = null;

  // Tabla de actividades por dependency
  activitiesByDependency: Array<{ dependencyName: string; hasFormulation: boolean }> = [];
  dependencies: Dependency[] = [];

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

  // Delete all formulations confirmation
  showDeleteAllFormulationsConfirmation = false;

  // Replicate dialog
  showReplicateDialog = false;
  replicateYear: number | null = null;

  // Import progress
  importLoading = false;
  importProgress = 0;
  importTotal = 0;
  importProcessed = 0;

  // Import preview modal
  showImportPreviewModal = false;
  importFile: File | null = null;
  importPreviewData: Array<{ dependencyName: string; activityCount: number }> = [];
  isProcessingPreview = false;
  previewLoading = false;

  // New modification modal
  showNewModificationModal = false;
  newModificationFile: File | null = null;
  newModificationPreviewData: Array<{ dependencyName: string; activityCount: number }> = [];
  newModificationLoading = false;
  newModificationProgress = 0;
  newModificationTotal = 0;
  newModificationProcessed = 0;
  isProcessingNewModificationPreview = false;
  newModificationPreviewLoading = false;

  constructor(
    private activityDetailService: ActivityDetailService,
    private strategicActionService: StrategicActionService,
    private strategicObjectiveService: StrategicObjectiveService,
    private formulationTypeService: FormulationTypeService,
    private formulationService: FormulationService,
    private dependencyService: DependencyService,
    private importTemplateService: ImportTemplateService,
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
        // Siempre seleccionar el mayor año disponible
        this.selectedYear = this.years[this.years.length - 1];
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
      this.loadDependencies()
    ]).then(() => {
      this.loadActivityDetails();
      this.loadModifications();
      this.loadActivitiesByDependency();
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
          // Set current formulation type to ID 3
          this.currentFormulationType = data.find(ft => ft.idFormulationType === 3) || null;
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
          // Filter dependencies with dependencyType = 3 and ospe = false
          this.dependencies = data.filter(dep =>
            dep.active &&
            dep.dependencyType?.idDependencyType === 2 &&
            dep.ospe === false
          ).sort((a, b) => a.name.localeCompare(b.name));
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

    // Construir el objeto principal con el año seleccionado
    const finalActivity: ActivityDetail = {
      ...activity,
      year: this.selectedYear,
      strategicAction: {
        idStrategicAction: strategicActionId,
        strategicObjective: { idStrategicObjective: strategicObjectiveId } as StrategicObjective
      } as StrategicAction,
      formulationType: this.currentFormulationType!
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
      formulationType: this.currentFormulationType!
    };

    this.activityDetails = [...this.activityDetails, newActivity];
    this.editingRowKeys[newActivity.idActivityDetail as any] = true;
  }

  onYearChange() {
    this.filterStrategicObjectivesByYear();
    this.filterActivityDetailsByYear();
    this.loadModifications();
    this.loadActivitiesByDependency();
  }

  onModificationChange() {
    this.loadActivitiesByDependency();
  }

  loadModifications() {
    // Get all unique modifications from formulations for the selected year
    this.formulationService.getAll().subscribe({
      next: (formulations) => {
        const modificationsSet = new Set<number>();
        formulations.forEach(formulation => {
          if (formulation.year === this.selectedYear && 
              formulation.formulationType?.idFormulationType === 3 &&
              formulation.dependency?.dependencyType?.idDependencyType === 2 &&
              formulation.dependency?.ospe === false) {
            modificationsSet.add(formulation.modification || 1);
          }
        });
        
        const modifications = Array.from(modificationsSet).sort((a, b) => a - b);
        
        this.modificationOptions = modifications.map(mod => ({
          label: this.getModificationLabel(mod),
          value: mod
        }));

        // Seleccionar la modificación apropiada
        if (this.modificationOptions.length === 1) {
          // Si solo hay una modificación, seleccionarla
          this.selectedModification = this.modificationOptions[0].value;
        } else if (this.modificationOptions.length === 0) {
          // Si no hay modificaciones, usar la formulación inicial por defecto
          this.selectedModification = 1;
          this.modificationOptions = [{ label: 'Formulación inicial', value: 1 }];
        } else {
          // Si hay múltiples modificaciones, seleccionar la mayor (la última en el array ordenado)
          this.selectedModification = this.modificationOptions[this.modificationOptions.length - 1].value;
        }
      },
      error: (error) => {
        console.error('Error loading modifications:', error);
        this.modificationOptions = [{ label: 'Formulación inicial', value: 1 }];
        this.selectedModification = 1;
      }
    });
  }

  getModificationLabel(modification: number): string {
    switch (modification) {
      case 1:
        return 'Formulación inicial';
      case 2:
        return 'Primera modificatoria';
      case 3:
        return 'Segunda modificatoria';
      case 4:
        return 'Tercera modificatoria';
      default:
        return `${modification - 1}ª modificatoria`;
    }
  }

  loadActivitiesByDependency() {
    this.activitiesByDependency = [];
    
    if (this.dependencies.length === 0) {
      return;
    }

    const formulationRequests = this.dependencies.map(dependency =>
      this.formulationService.searchByDependencyAndYear(dependency.idDependency!, this.selectedYear)
    );

    forkJoin(formulationRequests).subscribe({
      next: (allFormulations) => {
        this.activitiesByDependency = this.dependencies.map((dependency, index) => {
          const formulations = allFormulations[index];
          const formulation = formulations.find(f => 
            f.modification === this.selectedModification &&
            f.formulationType?.idFormulationType === 3
          );

          return {
            dependencyName: dependency.name,
            hasFormulation: !!formulation
          };
        });
      },
      error: (error) => {
        console.error('Error loading formulations:', error);
        this.activitiesByDependency = this.dependencies.map(dependency => ({
          dependencyName: dependency.name,
          hasFormulation: false
        }));
      }
    });
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
      activity.strategicAction?.strategicObjective?.idStrategicObjective
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

  // Delete all formulations methods
  deleteAllFormulations() {
    this.showDeleteAllFormulationsConfirmation = true;
  }

  confirmDeleteAllFormulations() {
    this.loading = true;
    
    // Get all formulations for the current year, modification and formulationType = 3
    this.formulationService.getAll().subscribe({
      next: (allFormulations) => {
        const formulationsToDelete = allFormulations.filter(formulation =>
          formulation.year === this.selectedYear &&
          formulation.modification === this.selectedModification &&
          formulation.formulationType?.idFormulationType === 3 &&
          formulation.dependency?.dependencyType?.idDependencyType === 2 &&
          formulation.dependency?.ospe === false
        );

        if (formulationsToDelete.length === 0) {
          this.toastr.warning('No se encontraron formulaciones para eliminar con los criterios seleccionados.', 'Advertencia');
          this.loading = false;
          this.cancelDeleteAllFormulations();
          return;
        }

        // Delete all found formulations
        const deleteRequests = formulationsToDelete.map(formulation =>
          this.formulationService.deleteById(formulation.idFormulation!)
        );

        forkJoin(deleteRequests).subscribe({
          next: () => {
            this.toastr.success(`${formulationsToDelete.length} formulaciones eliminadas correctamente.`, 'Éxito');
            this.loadActivitiesByDependency(); // Refresh the table
            this.loading = false;
            this.cancelDeleteAllFormulations();
          },
          error: (error) => {
            console.error('Error deleting formulations:', error);
            this.toastr.error('Error al eliminar las formulaciones.', 'Error');
            this.loading = false;
            this.cancelDeleteAllFormulations();
          }
        });
      },
      error: (error) => {
        console.error('Error loading formulations for deletion:', error);
        this.toastr.error('Error al cargar las formulaciones para eliminar.', 'Error');
        this.loading = false;
        this.cancelDeleteAllFormulations();
      }
    });
  }

  cancelDeleteAllFormulations() {
    this.showDeleteAllFormulationsConfirmation = false;
  }

  /**
   * Elimina todas las formulaciones existentes antes de proceder con la importación
   * Este método es usado cuando el botón está en modo "Actualizar datos"
   */
  deleteAllFormulationsBeforeImport() {
    this.loading = true;
    
    // Get all formulations for the current year, modification and formulationType = 3
    this.formulationService.getAll().subscribe({
      next: (allFormulations) => {
        const formulationsToDelete = allFormulations.filter(formulation =>
          formulation.year === this.selectedYear &&
          formulation.modification === this.selectedModification &&
          formulation.formulationType?.idFormulationType === 3 &&
          formulation.dependency?.dependencyType?.idDependencyType === 2 &&
          formulation.dependency?.ospe === false
        );

        if (formulationsToDelete.length === 0) {
          this.toastr.warning('No se encontraron formulaciones para eliminar. Procediendo con la importación...', 'Advertencia');
          this.loading = false;
          // Proceder con la importación aunque no haya formulaciones que eliminar
          this.importHealthActivitiesFromTemplate(this.importFile!);
          return;
        }

        // Delete all found formulations
        const deleteRequests = formulationsToDelete.map(formulation =>
          this.formulationService.deleteById(formulation.idFormulation!)
        );

        forkJoin(deleteRequests).subscribe({
          next: () => {
            this.toastr.success(`${formulationsToDelete.length} formulaciones eliminadas. Procediendo con la importación...`, 'Éxito');
            this.loadActivitiesByDependency(); // Refresh the table
            this.loading = false;
            // Ahora proceder con la importación
            this.importHealthActivitiesFromTemplate(this.importFile!);
          },
          error: (error) => {
            console.error('Error deleting formulations before import:', error);
            this.toastr.error('Error al eliminar las formulaciones existentes. Cancelando importación.', 'Error');
            this.loading = false;
            this.cancelImport(); // Cancelar la importación si no se pudieron eliminar las formulaciones
          }
        });
      },
      error: (error) => {
        console.error('Error loading formulations for deletion before import:', error);
        this.toastr.error('Error al cargar las formulaciones para eliminar. Cancelando importación.', 'Error');
        this.loading = false;
        this.cancelImport(); // Cancelar la importación si no se pudieron cargar las formulaciones
      }
    });
  }

  hasActiveFormulations(): boolean {
    return this.activitiesByDependency && 
           this.activitiesByDependency.length > 0 && 
           this.activitiesByDependency.some(item => item.hasFormulation);
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

  // Export template method
  exportHealthActivityTemplate() {
    try {
      const fileName = this.generateFileName('Plantilla_Actividades_Salud');
      const templatePath = 'resources/Plantilla_Prestaciones_Salud.xlsx';
      
      // Crear un enlace temporal para descargar el archivo
      const link = document.createElement('a');
      link.href = templatePath;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.toastr.success('Plantilla Excel descargada exitosamente.', 'Éxito');
    } catch (error) {
      console.error('Error al descargar la plantilla:', error);
      this.toastr.error('Error al descargar la plantilla Excel.', 'Error');
    }
  }

  private generateFileName(prefix: string): string {
    const now = new Date();
    return `${prefix}_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;
  }

  // Import template methods
  onImportTemplateClick(): void {
    this.showImportPreviewModal = true;
  }

  // New modification methods
  onCreateNewModificationClick(): void {
    this.showNewModificationModal = true;
  }

  onFileSelect(event: any): void {
    // El event puede venir de dos formas: event.files (p-fileUpload) o event.target.files (input)
    const files = event.files || event.target?.files;
    if (files && files.length > 0) {
      this.importFile = files[0];
      this.generateImportPreview();
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.importFile = file;
      this.generateImportPreview();
    }
  }

  // New modification file handling methods
  onNewModificationFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.newModificationFile = file;
      this.generateNewModificationPreview();
    }
  }

  generateNewModificationPreview(): void {
    if (!this.newModificationFile) {
      return;
    }

    console.log('🚀 Iniciando vista previa para nueva modificatoria:', this.newModificationFile.name);
    
    this.newModificationPreviewLoading = true;
    this.isProcessingNewModificationPreview = true;
    this.newModificationPreviewData = [];

    // Usar el mismo procesamiento que la importación regular
    this.processFileForPreview(this.newModificationFile).then(previewData => {
      this.newModificationPreviewData = previewData;
      this.newModificationPreviewLoading = false;
      this.isProcessingNewModificationPreview = false;
      
      const message = `✅ Archivo procesado: ${this.getTotalNewModificationActivities()} actividades en ${previewData.length} dependencias`;
      console.log(message);
      this.toastr.info(message, 'Vista Previa');
    }).catch(error => {
      console.error('❌ Error procesando archivo para nueva modificatoria:', error);
      this.newModificationPreviewLoading = false;
      this.isProcessingNewModificationPreview = false;
      this.toastr.error('Error al procesar el archivo: ' + error.message, 'Error');
    });
  }

  generateImportPreview(): void {
    if (!this.importFile) {
      return;
    }

    console.log('🚀 Iniciando vista previa REAL para archivo:', this.importFile.name);
    console.log('📊 Tipo de archivo:', this.importFile.type);
    console.log('📦 Tamaño:', (this.importFile.size / 1024).toFixed(2), 'KB');
    
    this.previewLoading = true;
    this.isProcessingPreview = true;
    this.importPreviewData = [];

    // Procesar el archivo Excel real usando ExcelJS
    this.processFileForPreview(this.importFile).then(previewData => {
      console.log('✅ Vista previa completada:', previewData);
      this.importPreviewData = previewData;
      this.previewLoading = false;
      this.isProcessingPreview = false;
      
      if (previewData.length > 0) {
        const message = `✅ Archivo procesado: ${this.getTotalActivities()} actividades en ${previewData.length} dependencias`;
        this.toastr.success(message, 'Vista Previa Lista');
      } else {
        this.toastr.warning('No se encontraron actividades válidas en el archivo', 'Advertencia');
      }
    }).catch(error => {
      console.error('❌ Error en vista previa:', error);
      this.previewLoading = false;
      this.isProcessingPreview = false;
      this.toastr.error('Error al procesar el archivo para vista previa: ' + error.message, 'Error');
    });
  }

  private processFileForPreview(file: File): Promise<Array<{ dependencyName: string; activityCount: number }>> {
    return new Promise((resolve, reject) => {
      console.log('Procesando archivo real:', file.name, 'Tamaño:', file.size, 'bytes');
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          console.log('Archivo leído, procesando con ExcelJS...');
          
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.getWorksheet(1);
          if (!worksheet) {
            reject(new Error('No se encontró la hoja de trabajo en el archivo Excel'));
            return;
          }

          console.log('Hoja de trabajo encontrada, procesando filas...');
          
          // Usar la misma lógica que en import-template.ts para procesar filas
          const dependencyCount = new Map<string, number>();
          const totalRows = worksheet.rowCount;
          
          console.log('Total de filas en el Excel:', totalRows);

          // Procesar filas para contar actividades por dependencia (empezar desde fila 3 como en import-template.ts)
          for (let rowIndex = 3; rowIndex <= totalRows; rowIndex++) {
            const row = worksheet.getRow(rowIndex);
            
            // Usar la misma lógica de isEmptyRow del import-template.ts
            if (this.isRowEmptyForPreview(row)) continue;

            try {
              // Usar las mismas columnas que en import-template.ts
              const codRed = this.getCellValue(row, 3)?.toString().trim() || '';
              const activityName = this.getCellValue(row, 12)?.toString().trim() || '';
              
              // Solo contar si tiene nombre de actividad
              if (activityName) {
                let dependencyName = '';
                
                // Manejar casos donde codRed está vacío, es N/A, o es un objeto
                if (!codRed || codRed === 'N/A' || codRed === 'undefined' || codRed === '[object Object]') {
                  dependencyName = 'Sin Código Red Asignado (ID: 115)';
                } else {
                  // Buscar la dependency por código
                  const dependency = this.findDependencyByCode(codRed);
                  dependencyName = dependency ? dependency.name : `Código Red: ${codRed}`;
                }
                
                dependencyCount.set(dependencyName, (dependencyCount.get(dependencyName) || 0) + 1);
              }
            } catch (error) {
              console.warn(`Error procesando fila ${rowIndex}:`, error);
              // Continuar con la siguiente fila si hay error
              continue;
            }
          }

          console.log('Conteo de dependencias:', Array.from(dependencyCount.entries()));

          const previewData = Array.from(dependencyCount.entries()).map(([name, count]) => ({
            dependencyName: name,
            activityCount: count
          }));

          console.log('Vista previa real generada con', previewData.length, 'dependencias');
          resolve(previewData);
          
        } catch (error) {
          console.error('Error procesando Excel:', error);
          reject(new Error('Error al procesar el archivo Excel: ' + (error as Error).message));
        }
      };

      reader.onerror = () => {
        console.error('Error leyendo archivo');
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private isRowEmptyForPreview(row: any): boolean {
    // Usar la misma lógica que en import-template.ts
    const name = this.getCellValue(row, 12)?.toString().trim();
    const agrupFonafe = this.getCellValue(row, 1)?.toString().trim();
    return !name && !agrupFonafe;
  }

  private isRowEmpty(row: any): boolean {
    // Mantener este método para compatibilidad, pero usar isRowEmptyForPreview para vista previa
    const name = this.getCellValue(row, 12)?.toString().trim();
    const agrupFonafe = this.getCellValue(row, 1)?.toString().trim();
    return !name && !agrupFonafe;
  }

  private getCellValue(row: any, col: number): any {
    try {
      const cell = row.getCell(col);
      
      if (!cell || cell.value === null || cell.value === undefined) {
        return '';
      }
      
      if (cell.value && typeof cell.value === 'object') {
        // Si es una celda con fórmula, devolver el resultado calculado
        if ('formula' in cell.value) {
          return (cell.value as any).result || '';
        }
        // Si es un objeto pero no una fórmula, convertir a string
        return cell.value.toString();
      }
      
      return cell.value;
    } catch (error) {
      console.warn(`Error obteniendo valor de celda [${col}]:`, error);
      return '';
    }
  }

  private findDependencyByCode(codRed: string): Dependency | undefined {
    return this.dependencies.find(dep => 
      dep.description?.trim().toLowerCase() === codRed.trim().toLowerCase()
    );
  }

  confirmImport(): void {
    if (!this.importFile) {
      this.toastr.error('No hay archivo seleccionado', 'Error');
      return;
    }

    if (this.importPreviewData.length === 0) {
      this.toastr.error('No hay datos válidos para importar', 'Error');
      return;
    }

    console.log('Confirmando importación de', this.getTotalActivities(), 'actividades');
    
    // Verificar si hay formulaciones activas para decidir si es importación o actualización
    const isUpdate = this.hasActiveFormulations();
    
    if (isUpdate) {
      console.log('Modo Actualización: eliminando formulaciones existentes antes de importar');
      this.toastr.info('Eliminando formulaciones existentes antes de importar...', 'Actualización');
      this.deleteAllFormulationsBeforeImport();
    } else {
      console.log('Modo Importación: importando directamente');
      this.importHealthActivitiesFromTemplate(this.importFile);
    }
  }

  cancelImport(): void {
    if (this.importLoading) {
      // Si está importando, mostrar mensaje de confirmación
      if (confirm('¿Estás seguro de que quieres cancelar la importación en progreso?')) {
        this.resetImportProgress();
        this.resetImportModal();
      }
      // Si no confirma, no hacer nada (mantener el modal abierto)
    } else {
      console.log('Cancelando importación');
      this.resetImportModal();
    }
  }

  private resetImportModal(): void {
    this.showImportPreviewModal = false;
    this.importFile = null;
    this.importPreviewData = [];
    this.isProcessingPreview = false;
    this.previewLoading = false;
    // Limpiar variables de progreso
    this.importLoading = false;
    this.importProgress = 0;
    this.importTotal = 0;
    this.importProcessed = 0;
  }

  private resetImportProgress(): void {
    // Método separado para limpiar solo el progreso sin cerrar el modal
    this.importLoading = false;
    this.importProgress = 0;
    this.importTotal = 0;
    this.importProcessed = 0;
  }

  resetFileSelection(): void {
    console.log('Reseteando selección de archivo');
    this.importFile = null;
    this.importPreviewData = [];
    this.isProcessingPreview = false;
    this.previewLoading = false;
  }

  // New modification methods
  confirmNewModification(): void {
    if (!this.newModificationFile) {
      this.toastr.error('No hay archivo seleccionado', 'Error');
      return;
    }

    if (this.newModificationPreviewData.length === 0) {
      this.toastr.error('No hay datos válidos para crear la nueva modificatoria', 'Error');
      return;
    }

    console.log('Confirmando creación de nueva modificatoria con', this.getTotalNewModificationActivities(), 'actividades');
    
    // Crear nueva modificatoria con modification + 1
    this.createNewModificationFromTemplate(this.newModificationFile);
  }

  cancelNewModification(): void {
    if (this.newModificationLoading) {
      // Si está procesando, mostrar mensaje de confirmación
      if (confirm('¿Estás seguro de que quieres cancelar la creación de la nueva modificatoria?')) {
        this.resetNewModificationModal();
      }
    } else {
      console.log('Cancelando creación de nueva modificatoria');
      this.resetNewModificationModal();
    }
  }

  private resetNewModificationModal(): void {
    this.showNewModificationModal = false;
    this.newModificationFile = null;
    this.newModificationPreviewData = [];
    this.isProcessingNewModificationPreview = false;
    this.newModificationPreviewLoading = false;
    // Limpiar variables de progreso
    this.newModificationLoading = false;
    this.newModificationProgress = 0;
    this.newModificationTotal = 0;
    this.newModificationProcessed = 0;
  }

  getTotalActivities(): number {
    return this.importPreviewData.reduce((total, item) => total + item.activityCount, 0);
  }

  getTotalNewModificationActivities(): number {
    return this.newModificationPreviewData.reduce((total, item) => total + item.activityCount, 0);
  }

  createNewModificationFromTemplate(file: File): void {
    if (!this.currentFormulationType) {
      this.toastr.error('Debe cargar un tipo de formulación antes de crear la nueva modificatoria', 'Error');
      return;
    }

    console.log('🚀 Iniciando creación de nueva modificatoria desde archivo:', file.name);
    this.toastr.info('Procesando archivo Excel para nueva modificatoria...', 'Creando Modificatoria');
    this.newModificationLoading = true;
    this.newModificationProgress = 0;
    this.newModificationTotal = 0;
    this.newModificationProcessed = 0;
    
    // Calcular la nueva modificatoria (actual + 1)
    const nextModification = this.selectedModification + 1;
    
    // Definir callback de progreso
    const onProgress = (progress: { processed: number; total: number; loading: boolean }) => {
      this.newModificationProcessed = progress.processed;
      this.newModificationTotal = progress.total;
      this.newModificationProgress = progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
      this.newModificationLoading = progress.loading;
      
      console.log(`📊 Progreso nueva modificatoria: ${this.newModificationProgress}% (${progress.processed}/${progress.total})`);
    };
    
    this.importTemplateService.processExcelFileWithModification(file, this.selectedYear, nextModification, onProgress).subscribe({
      next: (result: ImportResult) => {
        console.log('✅ Nueva modificatoria creada:', result);
        this.newModificationLoading = false;
        this.newModificationProgress = 100;
        this.newModificationProcessed = result.processedRows;
        this.newModificationTotal = result.totalRows;
        this.handleNewModificationResult(result, nextModification);
        
        // Refrescar datos después de crear la nueva modificatoria
        if (result.success) {
          this.loadModifications();
          this.loadActivitiesByDependency();
        }
      },
      error: (error) => {
        console.error('❌ Error durante la creación de nueva modificatoria:', error);
        this.newModificationLoading = false;
        this.showNewModificationModal = false;
        this.toastr.error('Error al crear nueva modificatoria: ' + error.message, 'Error');
      }
    });
  }

  importHealthActivitiesFromTemplate(file: File): void {
    if (!this.currentFormulationType) {
      this.toastr.error('Debe cargar un tipo de formulación antes de importar', 'Error');
      return;
    }

    console.log('🚀 Iniciando importación real del archivo:', file.name);
    this.toastr.info('Procesando archivo Excel...', 'Importación');
    this.importLoading = true;
    this.importProgress = 0;
    this.importTotal = 0;
    this.importProcessed = 0;
    
    // Definir callback de progreso
    const onProgress = (progress: { processed: number; total: number; loading: boolean }) => {
      this.importProcessed = progress.processed;
      this.importTotal = progress.total;
      this.importProgress = progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
      this.importLoading = progress.loading; // Solo el modal mostrará loading
      
      console.log(`📊 Progreso: ${this.importProgress}% (${progress.processed}/${progress.total})`);
    };
    
    this.importTemplateService.processExcelFile(file, this.selectedYear, onProgress).subscribe({
      next: (result: ImportResult) => {
        console.log('✅ Importación completada:', result);
        this.importLoading = false;
        this.importProgress = 100;
        this.importProcessed = result.processedRows;
        this.importTotal = result.totalRows;
        this.handleImportResult(result);
        
        // Refrescar datos después de la importación exitosa
        if (result.success) {
          this.loadActivitiesByDependency();
        }
      },
      error: (error) => {
        console.error('❌ Error durante la importación:', error);
        this.importLoading = false;
        this.showImportPreviewModal = false; // Cerrar modal en caso de error
        this.toastr.error('Error al importar actividades: ' + error.message, 'Error');
      }
    });
  }

  private handleImportResult(result: ImportResult): void {
    // Cerrar el modal al finalizar la importación
    this.showImportPreviewModal = false;
    
    if (result.success) {
      this.toastr.success(
        `Importación exitosa: ${result.processedRows} de ${result.totalRows} actividades procesadas`,
        'Éxito'
      );
      
      console.log('Actividades importadas:', result.activities);
      
    } else {
      let errorMessage = `Errores encontrados durante la importación:\n`;
      result.errors.forEach((error, index) => {
        errorMessage += `${index + 1}. ${error}\n`;
      });
      
      this.toastr.error(
        `Importación completada con errores: ${result.processedRows} de ${result.totalRows} actividades procesadas`,
        'Advertencia'
      );
      
      console.error('Errores de importación:', result.errors);
    }
  }

  private handleNewModificationResult(result: ImportResult, modification: number): void {
    // Cerrar el modal al finalizar la creación de la nueva modificatoria
    this.showNewModificationModal = false;
    
    if (result.success) {
      this.toastr.success(
        `Nueva modificatoria ${modification} creada exitosamente: ${result.processedRows} de ${result.totalRows} actividades procesadas`,
        'Éxito'
      );
      
      console.log('Actividades de nueva modificatoria creadas:', result.activities);
      
      // Actualizar la modificación seleccionada a la nueva modificatoria
      this.selectedModification = modification;
      
    } else {
      let errorMessage = `Errores encontrados durante la creación de la nueva modificatoria:\n`;
      result.errors.forEach((error, index) => {
        errorMessage += `${index + 1}. ${error}\n`;
      });
      
      this.toastr.error(
        `Creación de modificatoria completada con errores: ${result.processedRows} de ${result.totalRows} actividades procesadas`,
        'Advertencia'
      );
      
      console.error('Errores de creación de nueva modificatoria:', result.errors);
    }
  }
}