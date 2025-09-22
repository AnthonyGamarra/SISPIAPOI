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
import { MeasurementType } from '../../../models/logic/measurementType.model';
import { Dependency } from '../../../models/logic/dependency.model';
import { Formulation } from '../../../models/logic/formulation.model';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';

import { ActivityDetailService } from '../../../core/services/logic/activity-detail.service';
import { StrategicActionService } from '../../../core/services/logic/strategic-action.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { FormulationTypeService } from '../../../core/services/logic/formulation-type.service';
import { ActivityFamilyService } from '../../../core/services/logic/activity-family.service';
import { MeasurementTypeService } from '../../../core/services/logic/measurement-type.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';
import { OperationalActivityService } from '../../../core/services/logic/operational-activity.service';

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
  getChildFamiliesForParent(parentId: number): ActivityFamily[] {
    return this.childFamilies.filter(f => f.parentActivityFamily && f.parentActivityFamily.idActivityFamily === parentId);
  }
  // Helpers para jerarquía de familias
  parentFamilies: ActivityFamily[] = [];
  childFamilies: ActivityFamily[] = [];
  showAddSubFamilyModal = false;
  parentFamilyForSub: ActivityFamily | null = null;
  newSubFamilyName = '';

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
  measurementTypes: MeasurementType[] = [];
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
  private measurementTypeService: MeasurementTypeService,
    private dependencyService: DependencyService,
  private formulationService: FormulationService,
  private operationalActivityService: OperationalActivityService,
    private toastr: ToastrService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit() {
    this.loadYearsAndData();
    this.splitFamiliesByHierarchy();
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
  this.loadMeasurementTypes(),
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
          this.activityFamilies = data.filter(af => af.active && af.type === 'sociales').sort((a, b) => a.name.localeCompare(b.name));
          this.splitFamiliesByHierarchy();
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

    loadMeasurementTypes(): Promise<void> {
      return new Promise((resolve, reject) => {
        this.measurementTypeService.getAll().subscribe({
          next: (data) => {
            this.measurementTypes = data.filter(mt => mt.active).sort((a, b) => a.name.localeCompare(b.name));
            resolve();
          },
          error: (error) => reject(error)
        });
      });
    }

    getMeasurementTypeName(id?: number): string {
      if (!id) return '';
      const mt = this.measurementTypes.find(m => m.idMeasurementType === id);
      return mt?.name || '';
    }

    onFamilyMeasurementTypeChange(family: ActivityFamily, idMeasurementType?: number) {
      if (!idMeasurementType) {
        delete family.measurementType;
        return;
      }
      const mt = this.measurementTypes.find(m => m.idMeasurementType === idMeasurementType);
      if (mt) {
        family.measurementType = mt;
      }
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
      const famId = activity.activityFamily?.idActivityFamily;
      if (famId) {
        if (!this.groupedActivitiesByFamily[famId]) {
          this.groupedActivitiesByFamily[famId] = [];
        }
        this.groupedActivitiesByFamily[famId].push(activity);
      }
    });
    // Ensure activities within each family are ordered by idActivityDetail (ascending)
    Object.keys(this.groupedActivitiesByFamily).forEach(key => {
      this.groupedActivitiesByFamily[parseInt(key, 10)] = this.groupedActivitiesByFamily[parseInt(key, 10)].sort((a, b) => {
        const idA = a.idActivityDetail ?? 0;
        const idB = b.idActivityDetail ?? 0;
        return idA - idB;
      });
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
          // Also attempt to create corresponding OperationalActivity entries
          // in formulations of type 5 that are modifications (modification > 0)
          if (createdActivity) {
            this.createRelatedOperationalActivities(createdActivity)
              .catch(() => {
                // Errors handled/logged inside helper; continue
              });
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
      // store the index optionally but we'll remove by id to be safe
      this.activityToDeleteIndex = index;
      this.showDeleteConfirmation = true;
    } else {
      // It's a new (unsaved) activity, remove directly from the arrays by id
      this.activityDetails = this.activityDetails.filter(ad => ad.idActivityDetail !== activity.idActivityDetail);
      this.allActivityDetails = this.allActivityDetails.filter(ad => ad.idActivityDetail !== activity.idActivityDetail);
      this.groupActivitiesByFamily();
      this.toastr.info('Actividad no guardada eliminada.', 'Información');
    }
  }

  confirmDelete() {
    if (this.activityToDelete && this.activityToDelete.idActivityDetail) {
      const idToDelete = this.activityToDelete.idActivityDetail;
      // show loader while deleting and processing related deletions
      this.loading = true;
      const deletedActivityCopy = this.activityToDelete;
      this.activityDetailService.delete(idToDelete).subscribe({
        next: () => {
          // Remove by id to avoid issues with grouped/paginated indexes
          this.activityDetails = this.activityDetails.filter(ad => ad.idActivityDetail !== idToDelete);
          this.allActivityDetails = this.allActivityDetails.filter(ad => ad.idActivityDetail !== idToDelete);
          this.groupActivitiesByFamily(); // refresca agrupación

          // After deleting the activity detail, also remove matching operational activities
          // from formulations of type 5 that are modifications (modification > 0)
          if (deletedActivityCopy) {
            this.deleteRelatedOperationalActivities(deletedActivityCopy)
              .catch(() => {
                // Errors are handled/logged in helper; continue to cleanup
              })
              .finally(() => {
                this.loading = false;
                this.toastr.success('Actividad eliminada correctamente.', 'Éxito');
                this.cancelDelete();
              });
          } else {
            this.loading = false;
            this.toastr.success('Actividad eliminada correctamente.', 'Éxito');
            this.cancelDelete();
          }
        },
        error: (error) => {
          console.error('Error deleting activity:', error);
          this.toastr.error('Error al eliminar la actividad.', 'Error');
          this.loading = false;
          this.cancelDelete();
        }
      });
    }
  }

  // Delete OperationalActivity entries that belong to formulations with type=5 and modification>0
  // matching by name and activityFamily of the deleted ActivityDetail
  async deleteRelatedOperationalActivities(deletedActivity: ActivityDetail): Promise<void> {
    try {
      // 1) Get all formulations and filter by formulationType.idFormulationType === 5 and modification > 0
  const formulations = await this.formulationService.getAll().toPromise() as Formulation[] | undefined;
  const formArray: Formulation[] = Array.isArray(formulations) ? formulations : [];
  // Only consider formulations of type 5 that are modifications and belong to the currently selected year
  const targetFormulations = formArray.filter(f =>
    f.formulationType &&
    f.formulationType.idFormulationType === 5 &&
    (f.modification ?? 0) > 0 &&
    f.year === this.selectedYear
  );

      // 2) For each formulation, search OperationalActivity by formulation id
      const deletePromises: Promise<void>[] = [];

      for (const form of targetFormulations) {
        if (!form.idFormulation) continue;
  const ops = await this.operationalActivityService.searchByFormulation(form.idFormulation).toPromise() as OperationalActivity[] | undefined;
  const opsArray: OperationalActivity[] = Array.isArray(ops) ? ops : [];
  // 3) Within ops, find those matching by name and activityFamily
  const toDelete = opsArray.filter(op => {
          const sameName = op.name?.trim() === deletedActivity.name?.trim();
          const sameFamily = (op.activityFamily?.idActivityFamily ?? null) === (deletedActivity.activityFamily?.idActivityFamily ?? null);
          return sameName && sameFamily;
        });

        // 4) Delete each matching operational activity
        for (const op of toDelete) {
          if (op.idOperationalActivity) {
            const p = this.operationalActivityService.deleteById(op.idOperationalActivity).toPromise();
            deletePromises.push(p.then(() => {}).catch(err => { console.error('Error deleting operational activity', err); }));
          }
        }
      }

      await Promise.all(deletePromises);
      // Optionally refresh formulations or notify user
      if (deletePromises.length > 0) {
        this.toastr.info(`${deletePromises.length} actividades operativas relacionadas eliminadas.`, 'Información');
      }
    } catch (err) {
      console.error('Error removing related operational activities:', err);
      this.toastr.error('Error al eliminar actividades operativas relacionadas.', 'Error');
    }
  }

  // Create OperationalActivity entries in formulations of type=5 and modification>0
  // matching by name and activityFamily of the created ActivityDetail
  async createRelatedOperationalActivities(createdActivity: ActivityDetail): Promise<void> {
    try {
      // 1) Get all formulations and filter by formulationType.idFormulationType === 5 and modification > 0
      const formulations = await this.formulationService.getAll().toPromise() as Formulation[] | undefined;
      const formArray: Formulation[] = Array.isArray(formulations) ? formulations : [];
      // Only consider formulations of type 5 that are modifications and belong to the currently selected year
      const targetFormulations = formArray.filter(f =>
        f.formulationType &&
        f.formulationType.idFormulationType === 5 &&
        (f.modification ?? 0) > 0 &&
        f.year === this.selectedYear
      );

      if (targetFormulations.length === 0) {
        // No target formulations found; nothing to create
        return;
      }

  const createPromises: Promise<any>[] = [];

      for (const form of targetFormulations) {
        if (!form.idFormulation) continue;

        // Search existing operational activities for that formulation to avoid duplicates
        const ops = await this.operationalActivityService.searchByFormulation(form.idFormulation).toPromise() as OperationalActivity[] | undefined;
        const opsArray: OperationalActivity[] = Array.isArray(ops) ? ops : [];

        // Check if an operational activity with same name and family already exists
        const exists = opsArray.some(op => {
          const sameName = op.name?.trim() === createdActivity.name?.trim();
          const sameFamily = (op.activityFamily?.idActivityFamily ?? null) === (createdActivity.activityFamily?.idActivityFamily ?? null);
          return sameName && sameFamily;
        });

        if (!exists) {
          // Build minimal OperationalActivity payload required by backend
          const newOp: OperationalActivity = {
            correlativeCode: '',
            name: createdActivity.name || '',
            active: createdActivity.active ?? true,
            strategicAction: createdActivity.strategicAction,
            formulation: { idFormulation: form.idFormulation } as Formulation,
            measurementUnit: createdActivity.measurementUnit || '',
            description: createdActivity.description || '',
            activityFamily: createdActivity.activityFamily,
            goods: 0,
            remuneration: 0,
            services: 0
          } as OperationalActivity;

          const pPromise = this.operationalActivityService.create(newOp).toPromise().then(res => res as OperationalActivity);
          createPromises.push(pPromise);
        }
      }

      const results = await Promise.all(createPromises.map(p => p.catch(err => ({ error: err } as any))));
      const createdCount = results.filter(r => r && !(r as any).error).length;
      if (createdCount > 0) {
        this.toastr.info(`${createdCount} actividades operativas relacionadas creadas.`, 'Información');
      }
    } catch (err) {
      console.error('Error creating related operational activities:', err);
      this.toastr.error('Error al crear actividades operativas relacionadas.', 'Error');
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
      description: '',
      active: true,
      type: 'sociales',
      parentActivityFamily: undefined
    };
    this.activityFamilies = [...this.activityFamilies, newFamily];
    this.splitFamiliesByHierarchy();
    this.editingFamilyRowKeys[newFamily.idActivityFamily as any] = true;
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

  openAddSubFamilyModal(parentFamily: ActivityFamily) {
    this.parentFamilyForSub = parentFamily;
    this.newSubFamilyName = '';
    this.showAddSubFamilyModal = true;
  }

  confirmAddSubFamily() {
    if (!this.parentFamilyForSub || !this.newSubFamilyName.trim()) return;
    const newSubFamily: ActivityFamily = {
      idActivityFamily: undefined,
      name: this.newSubFamilyName.trim(),
      description: '',
      active: true,
      type: 'sociales',
      parentActivityFamily: this.parentFamilyForSub // <-- este es el campo correcto
    };
    const { idActivityFamily, ...subFamilyForCreation } = newSubFamily;
    this.activityFamilyService.create(subFamilyForCreation as ActivityFamily).subscribe({
      next: (createdSubFamily) => {
        if (createdSubFamily) {
          this.activityFamilies = [...this.activityFamilies, createdSubFamily];
          this.splitFamiliesByHierarchy();
          this.editingFamilyRowKeys[createdSubFamily.idActivityFamily as any] = true;
        }
        this.toastr.success('Subunidad operativa creada correctamente.', 'Éxito');
        this.showAddSubFamilyModal = false;
        this.parentFamilyForSub = null;
        this.newSubFamilyName = '';
      },
      error: (err) => {
        this.toastr.error('Error al crear la subunidad operativa.', 'Error');
        console.error('Error al crear la subunidad operativa:', err);
      }
    });
  }

  splitFamiliesByHierarchy() {
  this.parentFamilies = this.activityFamilies.filter(f => f.parentActivityFamily === null);
  this.childFamilies = this.activityFamilies.filter(f => f.parentActivityFamily !== null);
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
            this.splitFamiliesByHierarchy(); // refresca la jerarquía
            this.groupActivitiesByFamily(); // refresca agrupación de actividades
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
    // Ahora por familyId
    const family = this.activityFamilies.find(f => f.name === familyName);
    if (!family) return [];
    return this.groupedActivitiesByFamily[family.idActivityFamily!] || [];
  }

  getActivitiesForFamilyId(familyId: number): ActivityDetail[] {
    return this.groupedActivitiesByFamily[familyId] || [];
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