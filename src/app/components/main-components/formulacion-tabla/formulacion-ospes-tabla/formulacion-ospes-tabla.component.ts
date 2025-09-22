import { Component, Input, Output, EventEmitter, inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FileUploadModule } from 'primeng/fileupload';
import { FileUpload } from 'primeng/fileupload';
import { ToastrService } from 'ngx-toastr';
import { SafeUrlPipe } from '../../../../safe-url.pipe';

import { FormulationService } from '../../../../core/services/logic/formulation.service';
import { DependencyService } from '../../../../core/services/logic/dependency.service';
import { OperationalActivityService } from '../../../../core/services/logic/operational-activity.service';
import { FormulationSupportFileService } from '../../../../core/services/logic/formulation-support-file.service';
import { ExcelExportService } from '../middlewares/excel-export.service';
import { ExcelImportService, ImportResult } from '../middlewares/excel-import.service';
import { AuthService } from '../../../../core/services/authentication/auth.service';

import { Formulation } from '../../../../models/logic/formulation.model';
import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { FormulationSupportFile } from '../../../../models/logic/formulationSupportFile.model';
import { StrategicObjective } from '../../../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../../../models/logic/strategicAction.model';
import { FinancialFund } from '../../../../models/logic/financialFund.model';
import { ManagementCenter } from '../../../../models/logic/managementCenter.model';
import { CostCenter } from '../../../../models/logic/costCenter.model';
import { MeasurementType } from '../../../../models/logic/measurementType.model';
import { Priority } from '../../../../models/logic/priority.model';
import { MonthlyGoal } from '../../../../models/logic/monthlyGoal.model';
import { MonthlyBudget } from '../../../../models/logic/monthlyBudget.model';
import { FormulationState } from '../../../../models/logic/formulationState.model';

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
    SelectModule,
    RadioButtonModule,
    FileUploadModule,
    SafeUrlPipe
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
  // Sustento vinculado a la formulación de la dependencia con menor id
  @ViewChild('supportFileUpload') supportFileUploadRef!: FileUpload;
  hasSupportFile: boolean = false;
  supportFileMetadata: FormulationSupportFile | null = null;
  fileUploadingSupport: boolean = false;
  selectedSupportFormulationId: number | null = null;
  showDocumentViewer: boolean = false;
  documentUrl: any = '';
  
  // Propiedades para vista consolidada
  showConsolidatedView: boolean = false;
  consolidatedActivities: any[] = [];
  // Filter control for dependencies under the 'Vista' controls
  selectedDependencyFilter: string | null = null;

  // Nueva propiedad para alternar entre vista mensual y trimestral
  showQuarterlyView: boolean = false;

  get dependencyOptions(): { label: string; value: string }[] {
    return (this.dependencyNamesList || []).map(name => ({ label: name, value: name }));
  }

  // Return dependency names filtered by the selectedDependencyFilter (case-insensitive)
  getFilteredDependencyNames(): string[] {
    if (!this.selectedDependencyFilter) return this.dependencyNamesList || [];
    const q = this.selectedDependencyFilter.toLowerCase();
    return (this.dependencyNamesList || []).filter(n => n.toLowerCase().includes(q));
  }
  
  // Propiedades para importación de Excel
  showImportModal: boolean = false;
  isImporting: boolean = false;
  fileUploading: boolean = false;
  selectedFile: File | null = null;
  importPreviewData: any[] = [];
  importErrors: string[] = [];
  importWarnings: string[] = [];
  
  // Propiedades para progreso de importación
  importProgress: number = 0;
  importProgressMessage: string = '';
  
  // Propiedades para cambio de estado de formulación
  showChangeStateModal: boolean = false;
  selectedFormulationState: number | null = null;
  formulationStateOptions: FormulationState[] = [];
  
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
  private supportFileService = inject(FormulationSupportFileService);
  private excelExportService = inject(ExcelExportService);
  private excelImportService = inject(ExcelImportService);
  private authService = inject(AuthService);

  ngOnDestroy(): void {
    this.stopAutoObservation();
  }

  openModal(): void {
    if (!this.currentFormulation?.year || !this.currentFormulation?.modification) {
      this.toastr.error('No se ha seleccionado una formulación válida.', 'Error');
      return;
    }

    this.displayModal = true;
    this.loadFormulationStates(); // Cargar estados disponibles
    this.loadPrestacionesEconomicasData();
    this.startAutoObservation(); // Iniciar observación automática
  }

  // Método para cargar los estados de formulación disponibles
  private loadFormulationStates(): void {
    // Aquí deberías llamar a tu servicio para obtener los estados
    // Por ahora uso datos hardcodeados basados en tu descripción
    this.formulationStateOptions = [
      { idFormulationState: 1, active: true, name: 'Abierto para formulación' },
      { idFormulationState: 2, active: true, name: 'Aceptado y bloqueado' },
      { idFormulationState: 3, active: true, name: 'Pendiente de corrección' },
      { idFormulationState: 4, active: true, name: 'Cerrado' }
    ];
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

            // Cargar metadatos del sustento asociado a la formulación de la dependencia con menor id
            this.loadSupportForMinDependencyFormulation();

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
    // Ordenar y consolidar actividades por subsidio en el orden correcto
    this.dependencyNamesList = Object.keys(this.groupedActivitiesByDependency);
    const customOrder = ['incapacidad temporal', 'maternidad', 'lactancia', 'sepelio'];
    this.dependencyNamesList.forEach(depName => {
      let arr = this.groupedActivitiesByDependency[depName];
      if (Array.isArray(arr)) {
        // Agrupar por subsidio (name)
        const groupedBySubsidio: { [subsidio: string]: OperationalActivity[] } = {};
        arr.forEach(act => {
          const subsidio = (act.name || '').toString().toLowerCase().trim();
          if (!groupedBySubsidio[subsidio]) groupedBySubsidio[subsidio] = [];
          groupedBySubsidio[subsidio].push(act);
        });
        // Consolidar metas por subsidio y mantener el orden
        const consolidatedArr: OperationalActivity[] = [];
        customOrder.forEach(subsidio => {
          if (groupedBySubsidio[subsidio]) {
            // Sumar metas mensuales
            const base = groupedBySubsidio[subsidio][0];
            const metas = Array(12).fill(0);
            groupedBySubsidio[subsidio].forEach(act => {
              act.monthlyGoals?.forEach((goal, idx) => {
                metas[idx] += goal.value || 0;
              });
            });
            // Crear actividad consolidada
            consolidatedArr.push({
              ...base,
              monthlyGoals: metas.map((v, i) => ({
                idMonthlyGoal: undefined,
                goalOrder: i + 1,
                value: v
              }))
            });
          }
        });
        // Agregar el resto de subsidios fuera del orden custom
        Object.keys(groupedBySubsidio)
          .filter(subsidio => !customOrder.includes(subsidio))
          .forEach(subsidio => {
            const base = groupedBySubsidio[subsidio][0];
            const metas = Array(12).fill(0);
            groupedBySubsidio[subsidio].forEach(act => {
              act.monthlyGoals?.forEach((goal, idx) => {
                metas[idx] += goal.value || 0;
              });
            });
            consolidatedArr.push({
              ...base,
              monthlyGoals: metas.map((v, i) => ({
                idMonthlyGoal: undefined,
                goalOrder: i + 1,
                value: v
              }))
            });
          });
        // Reemplazar el array agrupado por el consolidado y ordenado
        this.groupedActivitiesByDependency[depName] = consolidatedArr;
      }
    });
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
    
    // Resetear estado de importación
    this.resetImportState();
    this.showImportModal = false;
    
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

  // Buscar la formulación asociada a la dependencia de menor id y cargar su archivo de sustento (si existe)
  private loadSupportForMinDependencyFormulation(): void {
    if (!this.prestacionesEconomicasFormulations?.length) {
      this.hasSupportFile = false;
      this.supportFileMetadata = null;
      this.selectedSupportFormulationId = null;
      return;
    }

  // Encontrar la formulación cuya dependencia tenga el menor idDependency (numérico)
  let minFormulation: any = null;
    this.prestacionesEconomicasFormulations.forEach(f => {
      if (f.dependency && f.dependency.idDependency !== undefined && f.dependency.idDependency !== null) {
        if (!minFormulation || (f.dependency!.idDependency! < (minFormulation.dependency?.idDependency || Infinity))) {
          minFormulation = f;
        }
      }
    });

    if (!minFormulation || !minFormulation.idFormulation) {
      this.hasSupportFile = false;
      this.supportFileMetadata = null;
      this.selectedSupportFormulationId = null;
      return;
    }

    this.selectedSupportFormulationId = minFormulation.idFormulation;

    // Si la formulación ya trae metadatos en el objeto, usarlos; si no, intentar obtener por servicio
    if (minFormulation.formulationSupportFile && minFormulation.formulationSupportFile.idFormulationSupportFile) {
      this.hasSupportFile = true;
      this.supportFileMetadata = minFormulation.formulationSupportFile as FormulationSupportFile;
      return;
    }

    // Intentar cargar metadatos por idFormulation (si existe un endpoint o buscar por full formulation)
    // Aquí asumimos que el backend devuelve metadatos junto a la formulación; si no, dejamos vacío
    this.hasSupportFile = false;
    this.supportFileMetadata = null;
  }

  // Manejo de selección de archivo de sustento (subida inicial)
  onSupportFileSelect(event: any): void {
    const file = event.files?.[0] || event.currentFiles?.[0];
    if (!file || !this.selectedSupportFormulationId) {
      this.toastr.warning('No se encontró formulación destino para subir el sustento.', 'Advertencia');
      if (event.clear) event.clear();
      return;
    }

    // Validaciones: tipo PDF y tamaño <= 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.toastr.error('El archivo supera el límite de 5MB.', 'Error de tamaño');
      if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
      return;
    }
    if (file.type !== 'application/pdf') {
      this.toastr.error('Solo se permite subir archivos PDF.', 'Tipo de archivo incorrecto');
      if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
      return;
    }

    this.fileUploadingSupport = true;

    // Si ya existe metadato, llamar a updateFile; si no, a uploadFile
    if (this.supportFileMetadata && this.supportFileMetadata.idFormulationSupportFile) {
      this.supportFileService.updateFile(this.selectedSupportFormulationId, file).subscribe({
        next: () => {
          this.toastr.success('Archivo de sustento actualizado correctamente.', 'Éxito');
          this.fileUploadingSupport = false;
          this.loadPrestacionesEconomicasData();
          if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
        },
        error: (err) => {
          console.error('Error updating support file:', err);
          this.toastr.error('Error al actualizar el archivo de sustento.', 'Error');
          this.fileUploadingSupport = false;
          if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
        }
      });
    } else {
      this.supportFileService.uploadFile(file, this.selectedSupportFormulationId).subscribe({
        next: (id) => {
          this.toastr.success('Archivo de sustento subido correctamente.', 'Éxito');
          this.fileUploadingSupport = false;
          this.loadPrestacionesEconomicasData();
          if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
        },
        error: (err) => {
          console.error('Error uploading support file:', err);
          this.toastr.error('Error al subir el archivo de sustento.', 'Error');
          this.fileUploadingSupport = false;
          if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
        }
      });
    }
  }

  // Manejo de actualización del archivo de sustento
  onSupportFileUpdate(event: any): void {
    const file = event.files?.[0] || event.currentFiles?.[0];
    if (!file || !this.selectedSupportFormulationId) {
      this.toastr.warning('No se encontró formulación destino para actualizar el sustento.', 'Advertencia');
      if (event.clear) event.clear();
      return;
    }

    // Validaciones típicas: tamaño y tipo PDF
    const maxSize = 5.1 * 1024 * 1024; // 5.1MB
    if (file.size > maxSize) {
      this.toastr.error('El archivo supera el límite de 5MB.', 'Error de tamaño');
      if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
      return;
    }
    if (file.type !== 'application/pdf') {
      this.toastr.error('Solo se permite subir archivos PDF.', 'Tipo de archivo incorrecto');
      if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
      return;
    }

    this.fileUploadingSupport = true;
    this.supportFileService.updateFile(this.selectedSupportFormulationId, file).subscribe({
      next: () => {
        this.toastr.success('Archivo de sustento actualizado correctamente.', 'Éxito');
        this.fileUploadingSupport = false;
        this.loadPrestacionesEconomicasData();
        if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
      },
      error: (err) => {
        console.error('Error updating support file:', err);
        this.toastr.error('Error al actualizar el archivo de sustento.', 'Error');
        this.fileUploadingSupport = false;
        if (this.supportFileUploadRef) this.supportFileUploadRef.clear();
      }
    });
  }

  // Ver el archivo de sustento en un visor (si es PDF) o forzar descarga
  viewSupportFile(): void {
    if (!this.supportFileMetadata || !this.supportFileMetadata.idFormulationSupportFile) {
      this.toastr.warning('No hay archivo de sustento disponible.', 'Advertencia');
      return;
    }

    const fileId = this.supportFileMetadata.idFormulationSupportFile;
    this.supportFileService.getById(fileId).subscribe({
      next: (fileDto) => {
        if (fileDto && fileDto.file && fileDto.fileExtension) {
          try {
            const binaryString = window.atob(fileDto.file);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            const blob = new Blob([bytes.buffer], { type: fileDto.fileExtension });

            const isPdf = fileDto.fileExtension === 'application/pdf' || fileDto.fileExtension === 'application/pdf; charset=utf-8';
            if (isPdf) {
              this.documentUrl = window.URL.createObjectURL(blob);
              this.showDocumentViewer = true;
              this.toastr.info('Cargando documento...', 'Información');
            } else {
              const fileName = fileDto.name || 'archivo';
              const link = document.createElement('a');
              link.href = window.URL.createObjectURL(blob);
              link.download = fileName;
              link.click();
              window.URL.revokeObjectURL(link.href);
              this.toastr.success('Archivo descargado correctamente.', 'Éxito');
            }
          } catch (e) {
            console.error('Error decoding or creating blob:', e);
            this.toastr.error('Error al procesar el archivo de sustento.', 'Error');
          }
        } else {
          this.toastr.warning('Los datos del archivo están incompletos.', 'Advertencia');
        }
      },
      error: (err) => {
        console.error('Error fetching support file DTO:', err);
        this.toastr.error('Error al cargar el archivo de sustento.', 'Error');
      }
    });
  }

  // Borrar metadatos/archivo (si se requiere)
  deleteSupportFile(): void {
    if (!this.supportFileMetadata || !this.supportFileMetadata.idFormulationSupportFile) {
      this.toastr.warning('No hay archivo para eliminar.', 'Advertencia');
      return;
    }

    if (!confirm('¿Está seguro de eliminar el archivo de sustento?')) return;

    const id = this.supportFileMetadata.idFormulationSupportFile;
    this.supportFileService.deleteById(id).subscribe({
      next: () => {
        this.toastr.success('Archivo de sustento eliminado.', 'Éxito');
        // Forzar recarga
        this.loadPrestacionesEconomicasData();
      },
      error: (err) => {
        console.error('Error deleting support file:', err);
        this.toastr.error('Error al eliminar el archivo de sustento.', 'Error');
      }
    });
  }

  // Limpiar URL al cerrar visor
  onDocumentViewerHide(): void {
    if (this.documentUrl) {
      window.URL.revokeObjectURL(this.documentUrl);
      this.documentUrl = '';
    }
    this.showDocumentViewer = false;
  }

  getActivitiesForDependency(dependencyName: string): OperationalActivity[] {
    return this.groupedActivitiesByDependency?.[dependencyName] || [];
  }

  editActivity(activity: OperationalActivity): void {
    // Verificar si la formulación permite edición
    if (!this.isFormulationEditable()) {
      this.toastr.warning('No se puede editar actividades porque la formulación está inactiva.', 'Formulación inactiva');
      return;
    }

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
      
      measurementType: {
        idMeasurementType: activity.measurementType?.idMeasurementType
      } as MeasurementType,
      
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

    // Validar metas y presupuestos
    const hasValidGoals = this.editingActivity.monthlyGoals?.some(goal => (goal.value || 0) >= 0);
    if (!hasValidGoals) {
      validationErrors.push('Al menos una meta mensual debe ser mayor o igual a 0');
    }

    const hasValidBudgets = this.editingActivity.monthlyBudgets?.some(budget => (budget.value || 0) >= 0);
    if (!hasValidBudgets) {
      validationErrors.push('Al menos un presupuesto mensual debe ser mayor o igual a 0');
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
    
    // Asegurar que los objetos relacionados tengan solo los IDs o sean undefined
    if (activityToUpdate.managementCenter?.idManagementCenter) {
      activityToUpdate.managementCenter = { idManagementCenter: activityToUpdate.managementCenter.idManagementCenter } as ManagementCenter;
    } else {
      activityToUpdate.managementCenter = undefined;
    }
    
    if (activityToUpdate.costCenter?.idCostCenter) {
      activityToUpdate.costCenter = { idCostCenter: activityToUpdate.costCenter.idCostCenter } as CostCenter;
    } else {
      activityToUpdate.costCenter = undefined;
    }
    
    if (activityToUpdate.financialFund?.idFinancialFund) {
      activityToUpdate.financialFund = { idFinancialFund: activityToUpdate.financialFund.idFinancialFund } as FinancialFund;
    } else {
      activityToUpdate.financialFund = undefined;
    }
    
    if (activityToUpdate.priority?.idPriority) {
      activityToUpdate.priority = { idPriority: activityToUpdate.priority.idPriority } as Priority;
    } else {
      activityToUpdate.priority = undefined;
    }

    // Manejar measurementType si existe
    if (activityToUpdate.measurementType?.idMeasurementType) {
      activityToUpdate.measurementType = { idMeasurementType: activityToUpdate.measurementType.idMeasurementType } as MeasurementType;
    } else {
      activityToUpdate.measurementType = undefined;
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
          const fullMeasurementType = this.measurementTypes.find(mt => 
            mt.idMeasurementType === activityToUpdate.measurementType?.idMeasurementType
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
            measurementType: fullMeasurementType || activityToUpdate.measurementType,
            monthlyGoals: activityToUpdate.monthlyGoals,
            monthlyBudgets: activityToUpdate.monthlyBudgets
          };
          
          this.groupActivitiesByDependency();
        }
        
        this.editingActivity = null;
        this.toastr.success('Actividad actualizada correctamente.', 'Éxito');
        
        // Regenerar consolidado después de guardar
        // Ordenar actividades por correlativeCode antes de consolidar
        this.prestacionesEconomicasActivities.sort((a, b) => {
          if (a.correlativeCode && b.correlativeCode) {
            return a.correlativeCode.toString().localeCompare(b.correlativeCode.toString());
          }
          return 0;
        });
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
    // Verificar si la formulación permite edición
    if (!this.isFormulationEditable()) {
      this.toastr.warning('No se puede eliminar actividades porque la formulación está inactiva.', 'Formulación inactiva');
      return;
    }

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
          // Ordenar actividades por correlativeCode antes de consolidar
          this.prestacionesEconomicasActivities.sort((a, b) => {
            if (a.correlativeCode && b.correlativeCode) {
              return a.correlativeCode.toString().localeCompare(b.correlativeCode.toString());
            }
            return 0;
          });
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

  // Métodos para validación de trimestres
  isMonthEditable(monthIndex: number): boolean {
    if (!this.currentFormulation?.modification || this.currentFormulation.modification <= 1) {
      return true; // Si no hay modificación o es la primera versión, todos los meses son editables
    }

    const quarter = this.currentFormulation.quarter || 1;
    const startMonth = (quarter - 1) * 3; // Mes inicial del trimestre actual

    // Desde el trimestre actual en adelante son editables
    return monthIndex >= startMonth;
  }

  getMonthEditableClass(monthIndex: number): string {
    if (!this.isMonthEditable(monthIndex)) {
      return 'month-locked';
    }
    return 'month-editable';
  }

  isQuarterEditable(quarter: number): boolean {
    if (!this.currentFormulation?.modification || this.currentFormulation.modification <= 1) {
      return true;
    }
    return this.currentFormulation.quarter === quarter;
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

  // Métodos para formatear información de formulación
  getFormulationStageDisplay(): string {
    if (!this.currentFormulation?.modification) {
      return 'Formulación inicial';
    }
    
    const modification = this.currentFormulation.modification;
    if (modification <= 1) {
      return 'Formulación inicial';
    }
    
    const ordinals = ['', 'Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima'];
    const ordinal = ordinals[modification - 1] || `${modification - 1}ª`;
    return `${ordinal} modificatoria`;
  }

  getQuarterDisplay(): string {
    if (!this.currentFormulation?.quarter) {
      return 'I Trimestre';
    }
    
    const quarter = this.currentFormulation.quarter;
    const romanNumerals = ['', 'I', 'II', 'III', 'IV'];
    const roman = romanNumerals[quarter] || `${quarter}`;
    return `${roman} Trimestre`;
  }

  // Método para verificar si la formulación permite edición
  isFormulationEditable(): boolean {
    if (!this.currentFormulation?.active) {
      return false; // Si no está activa, no se puede editar
    }
    
    // Estados que permiten edición: 1=Abierto para formulación, 3=Pendiente de corrección
    const editableStates = [1, 3];
    const stateId = this.currentFormulation?.formulationState?.idFormulationState;
    
    return editableStates.includes(stateId || 0);
  }

  // Método para verificar si el usuario es administrador
  isAdmin(): boolean {
    return this.authService.hasRole(['ADMIN', 'UPLANEAMIENTO', 'GPLANEAMIENTO']);
  }

  // Métodos para el estado de formulación
  getFormulationStateLabel(): string {
    if (!this.currentFormulation?.formulationState) {
      return 'Sin estado';
    }
    return this.currentFormulation.formulationState.name || 'Estado desconocido';
  }

  getFormulationStateIcon(): string {
    const stateId = this.currentFormulation?.formulationState?.idFormulationState;
    switch (stateId) {
      case 1: return 'pi pi-unlock'; // Abierto para formulación
      case 2: return 'pi pi-lock'; // Aceptado y bloqueado
      case 3: return 'pi pi-exclamation-triangle'; // Pendiente de corrección
      case 4: return 'pi pi-times-circle'; // Cerrado
      default: return 'pi pi-question-circle';
    }
  }

  getFormulationStateColor(): string {
    const stateId = this.currentFormulation?.formulationState?.idFormulationState;
    switch (stateId) {
      case 1: return '#28a745'; // Verde - Abierto
      case 2: return '#17a2b8'; // Azul - Aceptado y bloqueado
      case 3: return '#ffc107'; // Amarillo - Pendiente de corrección
      case 4: return '#dc3545'; // Rojo - Cerrado
      default: return '#6c757d'; // Gris - Desconocido
    }
  }

  getEditabilityMessage(): string {
    if (!this.currentFormulation?.active) {
      return 'Esta formulación no está activa. No se permite editar actividades ni importar datos. (SOLO VISUALIZACIÓN)';
    }
    
    const stateId = this.currentFormulation?.formulationState?.idFormulationState;
    switch (stateId) {
      case 2:
        return 'Esta formulación está aceptada y bloqueada. No se permite realizar modificaciones.';
      case 4:
        return 'Esta formulación está cerrada. No se permite realizar modificaciones.';
      default:
        return 'Esta formulación no permite edición en su estado actual.';
    }
  }

  // Método para cambiar el estado de la formulación
  changeFormulationState(): void {
    if (!this.selectedFormulationState || !this.currentFormulation?.idFormulation) {
      return;
    }

    // Crear una copia de la formulación actual con el nuevo estado
    const updateData: Formulation = {
      ...this.currentFormulation,
      formulationState: {
        idFormulationState: this.selectedFormulationState
      } as FormulationState
    };

    this.formulationService.update(updateData).subscribe({
      next: (updatedFormulation) => {
        // Actualizar la formulación actual
        if (this.currentFormulation && updatedFormulation.formulationState) {
          this.currentFormulation.formulationState = updatedFormulation.formulationState;
        }
        
        this.toastr.success('Estado de formulación actualizado correctamente.', 'Éxito');
        this.showChangeStateModal = false;
        this.selectedFormulationState = null;
        
        // Recargar datos si es necesario
        this.reloadData();
      },
      error: (err) => {
        console.error('Error updating formulation state:', err);
        this.toastr.error('Error al actualizar el estado de la formulación.', 'Error');
      }
    });
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

  getQuarterlyBudget(activity: OperationalActivity, quarter: number): number {
    if (!activity?.monthlyBudgets || activity.monthlyBudgets.length === 0) {
      return 0;
    }
    
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    
    let total = 0;
    for (let month = startMonth; month <= endMonth; month++) {
      const budget = activity.monthlyBudgets.find(b => b.budgetOrder === month);
      total += budget?.value || 0;
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

  updateMeasurementType(idMeasurementType: number): void {
    if (this.editingActivity) {
      this.editingActivity.measurementType = { idMeasurementType } as MeasurementType;
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

  // Método para generar nombres descriptivos para actividades consolidadas
  private generateConsolidatedName(originalName: string): string {
    if (!originalName) {
      return 'Actividad Consolidada';
    }

    const name = originalName.toLowerCase().trim();
    
    if (name.includes('sepelio')) {
      return 'Gestión de solicitudes para el pago de subsidios de Sepelio.';
    } else if (name.includes('maternidad')) {
      return 'Gestión de solicitudes para el otorgamiento del pago de subsidios de Maternidad.';
    } else if (name.includes('incapacidad temporal')) {
      return 'Gestión de solicitudes para el otorgamiento del pago de subsidios por Incapacidad Temporal.';
    } else if (name.includes('lactancia')) {
      return 'Gestión de solicitudes para el pago de subsidios de Lactancia.';
    } else {
      // Para otros casos, mantener el nombre original con prefijo descriptivo
      return `Nombre de actividad para ${originalName.toLowerCase()}`;
    }
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
          name: this.generateConsolidatedName(activity.name),
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

    // Ordenar consolidado por 'name' ascendente
    const customOrder = ['incapacidad temporal', 'maternidad', 'lactancia', 'sepelio'];
    this.consolidatedActivities.sort((a: any, b: any) => {
      const na = (a.name || '').toString().toLowerCase().trim();
      const nb = (b.name || '').toString().toLowerCase().trim();
      const ia = customOrder.findIndex(sub => na.includes(sub));
      const ib = customOrder.findIndex(sub => nb.includes(sub));
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return nb.localeCompare(na); // resto descendente
    });

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

  getConsolidatedQuarterlyGoals(consolidatedItem: any, quarter: number): number {
    if (!consolidatedItem?.consolidatedGoals) {
      return 0;
    }
    
    const startMonth = (quarter - 1) * 3;
    const endMonth = quarter * 3;
    
    let total = 0;
    for (let month = startMonth; month < endMonth; month++) {
      total += consolidatedItem.consolidatedGoals[month] || 0;
    }
    
    return total;
  }

  getConsolidatedQuarterlyBudgets(consolidatedItem: any, quarter: number): number {
    if (!consolidatedItem?.consolidatedBudgets) {
      return 0;
    }
    
    const startMonth = (quarter - 1) * 3;
    const endMonth = quarter * 3;
    
    let total = 0;
    for (let month = startMonth; month < endMonth; month++) {
      total += consolidatedItem.consolidatedBudgets[month] || 0;
    }
    
    return total;
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
      
      // Asignar correlativeCode según subsidio
      let correlativeCode = '';
      const nameLower = (consolidatedItem.name || '').toLowerCase();
      if (nameLower.includes('incapacidad temporal')) correlativeCode = '001';
      else if (nameLower.includes('maternidad')) correlativeCode = '002';
      else if (nameLower.includes('lactancia')) correlativeCode = '003';
      else if (nameLower.includes('sepelio')) correlativeCode = '004';

      const newActivity: OperationalActivity = {
        idOperationalActivity: undefined, // Será asignado por el backend al crear físicamente
        sapCode: '',
        correlativeCode,
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

        measurementType: { idMeasurementType: 1 } as MeasurementType,

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
        
        // Asignar correlativeCode según subsidio
        let correlativeCode = '';
        const nameLower = (consolidatedItem.name || '').toLowerCase();
        if (nameLower.includes('incapacidad temporal')) correlativeCode = '001';
        else if (nameLower.includes('maternidad')) correlativeCode = '002';
        else if (nameLower.includes('lactancia')) correlativeCode = '003';
        else if (nameLower.includes('sepelio')) correlativeCode = '004';

        const updatedActivity: OperationalActivity = {
          ...activityToUpdate,
          correlativeCode,
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
          measurementType: { idMeasurementType: 1 } as MeasurementType,
          priority: activityToUpdate.priority || undefined,

          // Todo el presupuesto consolidado va a servicios
          goods: 0,
          remuneration: 0,
          services: totalMonthlyBudget,

          // Actualizar metas trimestrales basadas en las metas mensuales consolidadas
          goals: this.convertMonthlyToQuarterlyGoals(consolidatedItem.consolidatedGoals || []),

          monthlyGoals: this.createMonthlyGoalsFromConsolidated(consolidatedItem.consolidatedGoals || []),
          monthlyBudgets: this.createMonthlyBudgetsFromConsolidated(consolidatedItem.consolidatedBudgets || [])
        };

        updatedActivities.push(updatedActivity);
      } else {
        // Si hay más items consolidados que actividades existentes, crear nuevas
        console.log(`Creando nueva actividad para item consolidado ${index + 1}`);
        
        const totalMonthlyBudget = consolidatedItem.consolidatedBudgets?.reduce((sum: number, budget: number) => sum + (budget || 0), 0) || 0;
        
        // Asignar correlativeCode según subsidio
        let correlativeCode = '';
        const nameLower = (consolidatedItem.name || '').toLowerCase();
        if (nameLower.includes('incapacidad temporal')) correlativeCode = '001';
        else if (nameLower.includes('maternidad')) correlativeCode = '002';
        else if (nameLower.includes('lactancia')) correlativeCode = '003';
        else if (nameLower.includes('sepelio')) correlativeCode = '004';

        const newActivity: OperationalActivity = {
          idOperationalActivity: undefined,
          sapCode: '',
          correlativeCode,
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
          // financialFund: undefined,
          // managementCenter: undefined,
          // costCenter: undefined,
          // measurementType: undefined,
          // priority: undefined,
          
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
      // Ordenar por correlativeCode antes de emitir
      updatedActivities.sort((a, b) => {
        if (a.correlativeCode && b.correlativeCode) {
          return a.correlativeCode.toString().localeCompare(b.correlativeCode.toString());
        }
        return 0;
      });
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
        // financialFund: undefined,
        // managementCenter: undefined,
        // costCenter: undefined,
        // measurementType: undefined,
        // priority: undefined,
        
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

  // Método para exportar a Excel la vista detallada
  exportToExcel(): void {
    if (this.showConsolidatedView) {
      // Exportar vista consolidada
      this.excelExportService.exportConsolidatedActivitiesToExcel(
        this.consolidatedActivities,
        undefined,
        this.currentFormulation
      );
    } else {
      // Exportar vista detallada
      this.excelExportService.exportOperationalActivitiesToExcel(
        this.prestacionesEconomicasActivities,
        this.groupedActivitiesByDependency,
        this.dependencyNamesList,
        undefined,
        this.currentFormulation
      );
    }
  }

  // Métodos para importación de Excel
  openImportModal(): void {
    // Verificar si la formulación permite edición
    if (!this.isFormulationEditable()) {
      this.toastr.warning('No se puede importar datos porque la formulación está inactiva.', 'Formulación inactiva');
      return;
    }

    this.showImportModal = true;
    this.resetImportState();
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.resetImportState();
  }

  private resetImportState(): void {
    this.selectedFile = null;
    this.importPreviewData = [];
    this.importErrors = [];
    this.importWarnings = [];
    this.isImporting = false;
    this.fileUploading = false;
    this.importProgress = 0;
    this.importProgressMessage = '';
  }

  onFileSelected(event: any): void {
    // Para p-fileUpload, el archivo viene en event.files[0]
    const file = event.files?.[0] || event.currentFiles?.[0];
    
    if (file) {
      this.fileUploading = true;
      
      // Validar que sea un archivo Excel
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        this.toastr.error('Por favor seleccione un archivo Excel válido (.xlsx o .xls)', 'Error');
        this.fileUploading = false;
        // Limpiar el archivo seleccionado del p-fileUpload
        if (event.clear) {
          event.clear();
        }
        return;
      }

      this.selectedFile = file;
      this.previewImportData();
    } else {
      this.fileUploading = false;
    }
  }

  private previewImportData(): void {
    if (!this.selectedFile) return;

    this.isImporting = true;
    
    const importMethod = this.showConsolidatedView 
      ? this.excelImportService.importConsolidatedActivitiesFromExcel(this.selectedFile)
      : this.excelImportService.importActivitiesFromExcel(this.selectedFile);

    importMethod.subscribe({
      next: (result: ImportResult) => {
        this.isImporting = false;
        this.importPreviewData = result.activities;
        this.importErrors = result.errors;
        this.importWarnings = result.warnings;

        if (result.success && result.activities.length > 0) {
          this.toastr.info(`Se encontraron ${result.activities.length} actividades para importar.`, 'Vista previa');
        }
      },
      error: (error) => {
        this.isImporting = false;
        console.error('Error al procesar archivo:', error);
        this.toastr.error('Error al procesar el archivo Excel.', 'Error');
      }
    });
  }

  confirmImport(): void {
    if (!this.importPreviewData.length || !this.currentFormulation) {
      this.toastr.warning('No hay datos para importar o no hay formulación seleccionada.', 'Advertencia');
      return;
    }

    if (this.importErrors.length > 0) {
      this.toastr.error('Corrija los errores antes de proceder con la importación.', 'Error');
      return;
    }

    this.isImporting = true;
    this.importProgress = 0;
    this.importProgressMessage = 'Iniciando importación...';

    // Actualizar solo los datos del modal, NO crear actividades físicas
    this.updateModalDataFromImport();
  }

  private updateModalDataFromImport(): void {
    if (!this.importPreviewData.length) {
      this.isImporting = false;
      this.closeImportModal();
      return;
    }

    this.importProgressMessage = 'Preparando datos para actualización...';

    try {
      const activitiesToUpdate: OperationalActivity[] = [];
      const processedActivityIds = new Set<number>(); // Para evitar duplicados
      let matchedCount = 0;

      // Mapear datos importados a las actividades existentes del modal
      this.importPreviewData.forEach((importedActivity) => {
        // Buscar actividades existentes que coincidan
          const matchingActivities = this.prestacionesEconomicasActivities.filter(activity => {
            // Comparar por subsidio (nombre), unidad de medida y dependencia/OSPE
            return activity.name?.toLowerCase().trim() === importedActivity.subsidio?.toLowerCase().trim() &&
                   activity.measurementUnit?.toLowerCase().trim() === importedActivity.measurementUnit?.toLowerCase().trim() &&
                   activity.formulation?.dependency?.name?.toLowerCase().trim() === importedActivity.dependencyName?.toLowerCase().trim();
          });

        // Si se encuentran actividades coincidentes, actualizar sus datos
        if (matchingActivities.length > 0) {
          matchingActivities.forEach(activity => {
            // Evitar procesar la misma actividad múltiples veces
            if (activity.idOperationalActivity && processedActivityIds.has(activity.idOperationalActivity)) {
              return; // Ya procesada, saltar
            }

            // Actualizar metas mensuales
            if (activity.monthlyGoals) {
              activity.monthlyGoals.forEach((goal, index) => {
                if (index < importedActivity.monthlyGoals.length) {
                  goal.value = importedActivity.monthlyGoals[index];
                }
              });
            }

            // Actualizar presupuestos mensuales
            if (activity.monthlyBudgets) {
              activity.monthlyBudgets.forEach((budget, index) => {
                if (index < importedActivity.monthlyBudgets.length) {
                  budget.value = importedActivity.monthlyBudgets[index];
                }
              });
            }

            // Agregar a la lista de actividades para actualizar en BD (solo si no está ya)
            if (activity.idOperationalActivity && !processedActivityIds.has(activity.idOperationalActivity)) {
              activitiesToUpdate.push(activity);
              processedActivityIds.add(activity.idOperationalActivity);
              matchedCount++;
            }
          });
        } else {
          // Si no hay coincidencias, crear nueva actividad con la dependencia/OSPE correcta
          const newActivity: OperationalActivity = {
            idOperationalActivity: undefined,
            name: importedActivity.subsidio,
            measurementUnit: importedActivity.measurementUnit,
            monthlyGoals: importedActivity.monthlyGoals.map((value: number, idx: number) => ({
              idMonthlyGoal: undefined,
              goalOrder: idx + 1,
              value,
              operationalActivity: {} as OperationalActivity
            })),
            monthlyBudgets: importedActivity.monthlyBudgets.map((value: number, idx: number) => ({
              idMonthlyBudget: undefined,
              budgetOrder: idx + 1,
              value,
              operationalActivity: {} as OperationalActivity
            })),
            formulation: {
              ...this.currentFormulation,
              dependency: { name: importedActivity.dependencyName }
            } as Formulation,
            // ...otros campos necesarios del modelo
          } as OperationalActivity;
          activitiesToUpdate.push(newActivity);
        }
      }); // <-- Correctly closes forEach callback
    // Actualizar actividades en la base de datos
    if (activitiesToUpdate.length > 0) {
      this.importProgressMessage = `Encontradas ${activitiesToUpdate.length} actividades únicas para actualizar en base de datos...`;
      this.updateActivitiesInDatabase(activitiesToUpdate, matchedCount);
    } else {
      this.isImporting = false;
      this.toastr.warning('No se encontraron actividades coincidentes para actualizar.', 'Advertencia');
      this.closeImportModal();
    }
  } catch (error) {
    console.error('Error al actualizar datos del modal:', error);
    this.isImporting = false;
    this.toastr.error('Error al actualizar los datos del modal.', 'Error');
  }
}

  private updateActivitiesInDatabase(activities: OperationalActivity[], expectedCount: number): void {
    const totalActivities = activities.length;
    const batchSize = 20; // Procesar 20 actividades por lote
    const delayBetweenBatches = 10; // 10ms de delay entre lotes

    this.importProgressMessage = `Procesando ${totalActivities} actividades en lotes de ${batchSize}...`;
    
    // Procesar actividades en lotes para mejor rendimiento
    this.processActivityUpdatesInBatches(activities, 0, 0, 0, totalActivities, expectedCount, batchSize, delayBetweenBatches);
  }

  private processActivityUpdatesInBatches(
    activities: OperationalActivity[], 
    batchStartIndex: number,
    successCount: number, 
    errorCount: number, 
    totalActivities: number, 
    expectedCount: number,
    batchSize: number,
    delayBetweenBatches: number
  ): void {
    // Si hemos procesado todas las actividades, finalizar
    if (batchStartIndex >= activities.length) {
      this.finishImportAndUpdateProcess(successCount, errorCount, expectedCount);
      return;
    }

    // Calcular el rango del lote actual
    const batchEndIndex = Math.min(batchStartIndex + batchSize, activities.length);
    const currentBatch = activities.slice(batchStartIndex, batchEndIndex);
    const batchNumber = Math.floor(batchStartIndex / batchSize) + 1;
    const totalBatches = Math.ceil(activities.length / batchSize);

    console.log(`Procesando lote ${batchNumber}/${totalBatches} (${currentBatch.length} actividades)`);
    
    // Actualizar progreso del lote
    this.importProgress = Math.round((batchStartIndex / totalActivities) * 100);
    this.importProgressMessage = `Lote ${batchNumber}/${totalBatches}: procesando ${currentBatch.length} actividades...`;

    // Contadores para este lote
    let batchSuccessCount = 0;
    let batchErrorCount = 0;
    const batchTotal = currentBatch.length;

    // Procesar todas las actividades del lote simultáneamente
    currentBatch.forEach((activity, indexInBatch) => {
      const globalIndex = batchStartIndex + indexInBatch;
      
      // Preparar actividad para actualizar
      const activityToUpdate = this.prepareActivityForUpdate(activity);

      // Actualizar en la base de datos
      this.operationalActivityService.update(activityToUpdate).subscribe({
        next: () => {
          batchSuccessCount++;
          console.log(`✓ Actividad ${globalIndex + 1}/${totalActivities} actualizada exitosamente`);
          
          // Si es la última del lote, procesar siguiente lote
          if (batchSuccessCount + batchErrorCount === batchTotal) {
            const newSuccessCount = successCount + batchSuccessCount;
            const newErrorCount = errorCount + batchErrorCount;
            
            console.log(`Lote ${batchNumber} completado: ${batchSuccessCount} éxitos, ${batchErrorCount} errores`);
            
            // Delay antes del siguiente lote
            setTimeout(() => {
              this.processActivityUpdatesInBatches(
                activities, 
                batchEndIndex, 
                newSuccessCount, 
                newErrorCount, 
                totalActivities, 
                expectedCount, 
                batchSize, 
                delayBetweenBatches
              );
            }, delayBetweenBatches);
          }
        },
        error: (error) => {
          batchErrorCount++;
          console.error(`✗ Error al actualizar actividad ${globalIndex + 1}/${totalActivities}:`, error);
          
          // Si es la última del lote, procesar siguiente lote
          if (batchSuccessCount + batchErrorCount === batchTotal) {
            const newSuccessCount = successCount + batchSuccessCount;
            const newErrorCount = errorCount + batchErrorCount;
            
            console.log(`Lote ${batchNumber} completado: ${batchSuccessCount} éxitos, ${batchErrorCount} errores`);
            
            // Delay antes del siguiente lote
            setTimeout(() => {
              this.processActivityUpdatesInBatches(
                activities, 
                batchEndIndex, 
                newSuccessCount, 
                newErrorCount, 
                totalActivities, 
                expectedCount, 
                batchSize, 
                delayBetweenBatches
              );
            }, delayBetweenBatches);
          }
        }
      });
    });
  }

  private prepareActivityForUpdate(activity: OperationalActivity): OperationalActivity {
    // Preparar actividad para actualizar (similar al método saveActivity)
    const activityToUpdate = { ...activity };
    
    // Asegurar que la formulación esté incluida
    if (activity?.formulation?.idFormulation) {
      activityToUpdate.formulation = { idFormulation: activity.formulation.idFormulation } as Formulation;
    } else if (this.currentFormulation?.idFormulation) {
      activityToUpdate.formulation = { idFormulation: this.currentFormulation.idFormulation } as Formulation;
    }
    
    // Limpiar objetos relacionados para evitar problemas de serialización
    if (activityToUpdate.managementCenter?.idManagementCenter) {
      activityToUpdate.managementCenter = { idManagementCenter: activityToUpdate.managementCenter.idManagementCenter } as ManagementCenter;
    } else {
      activityToUpdate.managementCenter = undefined;
    }
    
    if (activityToUpdate.costCenter?.idCostCenter) {
      activityToUpdate.costCenter = { idCostCenter: activityToUpdate.costCenter.idCostCenter } as CostCenter;
    } else {
      activityToUpdate.costCenter = undefined;
    }
    
    if (activityToUpdate.financialFund?.idFinancialFund) {
      activityToUpdate.financialFund = { idFinancialFund: activityToUpdate.financialFund.idFinancialFund } as FinancialFund;
    } else {
      activityToUpdate.financialFund = undefined;
    }
    
    if (activityToUpdate.priority?.idPriority) {
      activityToUpdate.priority = { idPriority: activityToUpdate.priority.idPriority } as Priority;
    } else {
      activityToUpdate.priority = undefined;
    }

    if (activityToUpdate.measurementType?.idMeasurementType) {
      activityToUpdate.measurementType = { idMeasurementType: activityToUpdate.measurementType.idMeasurementType } as MeasurementType;
    } else {
      activityToUpdate.measurementType = undefined;
    }

    return activityToUpdate;
  }

  private finishImportAndUpdateProcess(successCount: number, errorCount: number, totalMatched: number): void {
    this.isImporting = false;
    this.importProgress = 100;
    this.importProgressMessage = 'Finalizando importación...';
    
    // Reagrupar actividades por dependencia después de la actualización
    this.groupActivitiesByDependency();
    
    // Regenerar vista consolidada si está activa
    if (this.showConsolidatedView) {
      this.generateConsolidatedActivities();
    }

    // Mostrar resultados
    if (successCount > 0) {
      this.toastr.success(
        `Se actualizaron ${successCount} actividades en el modal y en la base de datos.`, 
        'Importación exitosa'
      );
    }
    
    if (errorCount > 0) {
      this.toastr.warning(
        `${errorCount} actividades no se pudieron actualizar en la base de datos.`, 
        'Advertencia'
      );
    }

    if (totalMatched > successCount + errorCount) {
      this.toastr.info(
        `Se encontraron ${totalMatched} coincidencias, se procesaron ${successCount + errorCount}.`, 
        'Información'
      );
    }
    
    // Pequeño delay antes de cerrar para mostrar el 100%
    setTimeout(() => {
      this.closeImportModal();
    }, 1000);
  }

  removeImportPreviewItem(index: number): void {
    this.importPreviewData.splice(index, 1);
    
    if (this.importPreviewData.length === 0) {
      this.resetImportState();
    }
  }
}
