import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
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
import { Workbook } from 'exceljs';
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

import { HealthOperationalActivityService } from '../../../core/services/logic/health-operational-activity.service';
import { HealthOperationalActivitySummaryDTO } from '../../../models/logic/health-operational-activity-summary.dto';


import { exportTrimestralConsolidadoExcel, exportTrimestralDetalladoExcel } from './reportes-trimestral';
import { exportMensualConsolidadoExcel, exportMensualDetalladoExcel } from './reportes-mensuales';

interface HealthTableRow {
  nivelAtencion: string;
  objetivoEstrategico: {
    codigo: string;
    nombre: string;
  };
  accionEstrategica: {
    codigo: string;
    nombre: string;
  };
  familia: string;
  unidadMedida: string;
  codCenSes?: string;
  idDependency?: number | null;
  desCenSes: string;
  metas: {
    trimestre1: number;
    trimestre2: number;
    trimestre3: number;
    trimestre4: number;
    total: number;
  };
  presupuesto: {
    trimestre1: number;
    trimestre2: number;
    trimestre3: number;
    trimestre4: number;
    total: number;
  };

}

// Definir interface para las filas consolidadas por familia (reuso local)
interface ConsolidatedHealthRow {
  id: string;
  familia: string;
  unidadMedida: string;
  metas: {
    trimestre1: number;
    trimestre2: number;
    trimestre3: number;
    trimestre4: number;
    total: number;
  };
  presupuesto: {
    trimestre1: number;
    trimestre2: number;
    trimestre3: number;
    trimestre4: number;
    total: number;
  };
  detalles: HealthTableRow[];
}

@Component({
  selector: 'app-adm-maestro-gcps-tabla-gcop',
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
  templateUrl: './adm-maestro-gcps-tabla-gcop.component.html',
  styleUrl: './adm-maestro-gcps-tabla-gcop.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmMaestroGcpsTablaComponent implements OnInit, OnChanges {
  private _viewMode: string = 'trimestral';

  // Template-friendly getters to avoid strict template literal comparison errors
  get isTrimestral(): boolean {
    return this._viewMode === 'trimestral';
  }

  get isMensual(): boolean {
    return this._viewMode === 'mensual';
  }

  // Expose a method to set view mode (used by template click handlers)
  setViewMode(mode: 'trimestral' | 'mensual') {
    this._viewMode = mode;
  }

  // Monthly grouped data (similar shape as consolidated rows but with months)
  groupedHealthDataNivelIMensual: any[] = [];
  groupedHealthDataNivelIIMensual: any[] = [];
  groupedHealthDataNivelIIIMensual: any[] = [];

  // Calcula el total de presupuesto para un grupo de datos
  // Totales por nivel y general
  totalPresupuestoNivelI = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  totalPresupuestoNivelII = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  totalPresupuestoNivelIII = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  totalPresupuestoGeneral = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };

  @Output() activitiesCountChanged = new EventEmitter<number>();
  @Input() mostrar = false;
  @Input() ano: string | null = null;
  @Input() idFormulation: number | null = null;
  @Input() idDependency: string | null = null;


  // Datos originales y agrupados
  healthData: HealthTableRow[] = [];
  originalHealthData: HealthTableRow[] = [];
  groupedHealthDataNivelI: ConsolidatedHealthRow[] = [];
  groupedHealthDataNivelII: ConsolidatedHealthRow[] = [];
  groupedHealthDataNivelIII: ConsolidatedHealthRow[] = [];

  // Control de filas expandidas para PrimeNG
  expandedRowsNivelI: { [key: string]: boolean } = {};
  expandedRowsNivelII: { [key: string]: boolean } = {};
  expandedRowsNivelIII: { [key: string]: boolean } = {};

  // Propiedades de la paginación
  first = 0;
  rows = 10;

  // Variables para manejar la carga
  loading = false;
  totalRecords = 0;

  // Variables para el filtro
  selectedDesCenSes: string = '';
  desCenSesOptions: { label: string; value: string }[] = [];
  filtering = false;


  ngOnInit() {
    // Al iniciar, el loader debe estar en false
    this.loadYearsAndData();
    this.loading = false;
    // Ya no se carga datos aquí, solo en ngOnChanges
    console.log('FormulacionSaludOdTablaComponent - ngOnInit iniciado');
    console.log('Inputs recibidos:', {
      mostrar: this.mostrar,
      ano: this.ano,
      idFormulation: this.idFormulation,
      idDependency: this.idDependency
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('FormulacionSaludOdTablaComponent - ngOnChanges:', changes);
    console.log('Inputs actuales:', {
      mostrar: this.mostrar,
      ano: this.ano,
      idFormulation: this.idFormulation,
      idDependency: this.idDependency
    });
    // Solo cargar datos si hay una formulación válida
    const formulationId = this.idFormulation; // do not rely on external currentFormulation
    if (formulationId) {
      console.log('Disparando loadHealthData con idFormulation:', formulationId);
      this.loadHealthData();
    } else if (this.ano && this.idDependency) {
      // Si hay año y dependencia seleccionados, cargar datos desde las formulaciones de las dependencias
      console.log('No se proporcionó idFormulation: cargando datos desde formulaciones de dependencias');
      this.loadHealthDataFromDependencies();
    } else {
      // Estado inicial, no mostrar loader
      console.log('No hay idFormulation ni selección completa, limpiando datos y ocultando loader');
      this.loading = false;
      this.healthData = [];
      this.originalHealthData = [];
      this.groupedHealthDataNivelI = [];
      this.groupedHealthDataNivelII = [];
      this.groupedHealthDataNivelIII = [];
      this.totalRecords = 0;
      this.activitiesCountChanged.emit(0);
    }
  }

  loadHealthData() {
    // Mostrar loader antes de limpiar datos
    this.loading = true;
    // Obtener el ID de formulación desde idFormulation
    const formulationId = this.idFormulation;

    console.log('loadHealthData iniciado con idFormulation:', this.idFormulation);

    if (!formulationId) {
      console.warn('No se proporcionó idFormulation — se intentará cargar desde las formulaciones de dependencias');
      this.loadHealthDataFromDependencies();
      return;
    }

    console.log('Llamando getHealthOperationalActivitySummary con idFormulation:', formulationId);
    this.healthOperationalActivityService.getHealthOperationalActivitySummary(formulationId).subscribe({
      next: (data: HealthOperationalActivitySummaryDTO[]) => {
        // Procesamiento de datos también es parte del loading
        setTimeout(async () => {
          if (data && data.length > 0) {
            console.log('Datos recibidos de getHealthOperationalActivitySummary:', data);
            this.originalHealthData = this.transformHealthDataForTable(data);
            this.healthData = [...this.originalHealthData];
            this.totalRecords = this.healthData.length;

            // Actualizar opciones del select
            this.updateOptions();

            // Filtrar por nivel y agrupar por familia
            await this.applyFilter();
            console.log('Datos agrupados Nivel I:', this.groupedHealthDataNivelI);
            console.log('Datos agrupados Nivel II:', this.groupedHealthDataNivelII);
            console.log('Datos agrupados Nivel III:', this.groupedHealthDataNivelIII);
          } else {
            console.warn('No se recibieron datos de getHealthOperationalActivitySummary');
            // Intentar buscar actividades operacionales directamente
            await this.searchOperationalActivities(formulationId);
            return;
          }
          this.loading = false;
          this.activitiesCountChanged.emit(this.healthData.length);
          this.cdr.detectChanges();
        }, 0); // Forzar que el loader se mantenga hasta que termine el procesamiento
      },
      error: (error: any) => {
        console.error('Error al cargar datos de salud desde summary:', error);
        console.error('Detalles del error:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
        // Intentar búsqueda alternativa por formulación
        console.log('Intentando búsqueda alternativa por formulación...');
        this.loading = false;
        this.searchOperationalActivities(formulationId);
      }
    });
  }

  // Load health summaries for all applicable formulations from dependencies
  private loadHealthDataFromDependencies() {
    this.loading = true;

    const deps = (this.dependencies || []).filter(dep => dep.active && dep.dependencyType?.idDependencyType === 2 && dep.ospe === false);
    if (deps.length === 0) {
      console.warn('No hay dependencias válidas para buscar formulaciones');
      this.originalHealthData = [];
      this.healthData = [];
      this.groupedHealthDataNivelI = [];
      this.groupedHealthDataNivelII = [];
      this.groupedHealthDataNivelIII = [];
      this.totalRecords = 0;
      this.activitiesCountChanged.emit(0);
      this.loading = false;
      return;
    }

    const formulationRequests = deps.map(d => this.formulationService.searchByDependencyAndYear(d.idDependency!, this.selectedYear));

    forkJoin(formulationRequests).subscribe({
      next: (allFormulations) => {
        // Debug: show dependencies and their returned formulations
        console.log('[GCOP TABLE] Dependencies considered for summaries:', deps.map(d => ({ id: d.idDependency, name: d.name })));
        console.log('[GCOP TABLE] Raw formulations per dependency (index aligned with deps):', allFormulations.map((fArr: Formulation[], idx: number) => ({ dependencyId: deps[idx]?.idDependency, formulations: (fArr || []).map(f => f.idFormulation) })));

        // For each dependency, pick the formulation matching selectedModification and type 3
        const summaryRequests: Observable<HealthOperationalActivitySummaryDTO[]>[] = [];
        const chosenFormulationPerDependency: Array<{ dependencyId?: string | number | undefined, chosenFormulationId?: number | null }> = [];
        allFormulations.forEach((formulations: Formulation[], idx: number) => {
          const found = (formulations || []).find(f => f.modification === this.selectedModification && f.formulationType?.idFormulationType === 3);
          const depId = deps[idx]?.idDependency;
          if (found && found.idFormulation) {
            chosenFormulationPerDependency.push({ dependencyId: depId, chosenFormulationId: found.idFormulation });
            summaryRequests.push(this.healthOperationalActivityService.getHealthOperationalActivitySummary(found.idFormulation));
          } else {
            chosenFormulationPerDependency.push({ dependencyId: depId, chosenFormulationId: null });
          }
        });

        console.log('[GCOP TABLE] Chosen formulation IDs per dependency (selectedModification=' + this.selectedModification + '):', chosenFormulationPerDependency);

        if (summaryRequests.length === 0) {
          console.warn('No se encontraron formulaciones aplicables en las dependencias');
          this.originalHealthData = [];
          this.healthData = [];
          this.groupedHealthDataNivelI = [];
          this.groupedHealthDataNivelII = [];
          this.groupedHealthDataNivelIII = [];
          this.totalRecords = 0;
          this.activitiesCountChanged.emit(0);
          this.loading = false;
          return;
        }
        forkJoin(summaryRequests).subscribe({
          next: async (allSummaries) => {
            try {
              // allSummaries is an array of arrays of DTOs; merge them
              const merged: HealthOperationalActivitySummaryDTO[] = ([] as HealthOperationalActivitySummaryDTO[]).concat(...allSummaries.map(s => s || []));
              this.originalHealthData = this.transformHealthDataForTable(merged);
              this.healthData = [...this.originalHealthData];
              this.totalRecords = this.healthData.length;
              this.updateOptions();
              await this.applyFilter();
              this.loading = false;
              this.activitiesCountChanged.emit(this.healthData.length);
              this.cdr.detectChanges();
            } catch (err) {
              console.error('Error procesando resúmenes:', err);
              this.loading = false;
            }
          },
          error: (err) => {
            console.error('Error cargando resúmenes desde formulaciones de dependencias:', err);
            this.loading = false;
            this.originalHealthData = [];
            this.healthData = [];
            this.groupedHealthDataNivelI = [];
            this.groupedHealthDataNivelII = [];
            this.groupedHealthDataNivelIII = [];
            this.totalRecords = 0;
            this.activitiesCountChanged.emit(0);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error buscando formulaciones por dependencia:', err);
        this.loading = false;
        this.originalHealthData = [];
        this.healthData = [];
        this.groupedHealthDataNivelI = [];
        this.groupedHealthDataNivelII = [];
        this.groupedHealthDataNivelIII = [];
        this.totalRecords = 0;
        this.activitiesCountChanged.emit(0);
        this.cdr.detectChanges();
      }
    });
  }

  // Método de respaldo para buscar actividades operacionales por formulación
  private searchOperationalActivities(formulationId: number): Promise<void> {
    this.loading = true;
    console.log('Buscando actividades operacionales por formulación:', formulationId);

    return new Promise((resolve, reject) => {
      this.healthOperationalActivityService.searchByFormulation(formulationId).subscribe({
        next: async (activities) => {
          setTimeout(async () => {
            try {
              if (activities && activities.length > 0) {
                // Convertir OperationalActivity[] a HealthOperationalActivitySummaryDTO[] 
                const summaryData = this.convertOperationalActivitiesToSummary(activities);
                this.originalHealthData = this.transformHealthDataForTable(summaryData);
                this.healthData = [...this.originalHealthData];
                this.totalRecords = this.healthData.length;

                // Actualizar opciones del select
                this.updateOptions();

                // Filtrar por nivel y agrupar por familia
                await this.applyFilter();
                console.log('Datos agrupados Nivel I:', this.groupedHealthDataNivelI);
                console.log('Datos agrupados Nivel II:', this.groupedHealthDataNivelII);
                console.log('Datos agrupados Nivel III:', this.groupedHealthDataNivelIII);
              } else {
                console.warn('No se encontraron actividades operacionales para esta formulación');
                this.originalHealthData = [];
                this.healthData = [];
                this.groupedHealthDataNivelI = [];
                this.groupedHealthDataNivelII = [];
                this.groupedHealthDataNivelIII = [];
                this.totalRecords = 0;
              }
              this.activitiesCountChanged.emit(this.healthData.length);
              this.cdr.detectChanges();
              this.loading = false;
              resolve();
            } catch (err) {
              this.loading = false;
              reject(err);
            }
          }, 0); // Forzar que el loader se mantenga hasta que termine el procesamiento
        },
        error: (error) => {
          console.error('Error al buscar actividades operacionales:', error);
          this.loading = false;
          this.healthData = [];
          this.originalHealthData = [];
          this.groupedHealthDataNivelI = [];
          this.groupedHealthDataNivelII = [];
          this.groupedHealthDataNivelIII = [];
          this.totalRecords = 0;
          this.activitiesCountChanged.emit(0);
          this.cdr.detectChanges();
          reject(error);
        }
      });
    });
  }

  // Convertir OperationalActivity[] a HealthOperationalActivitySummaryDTO[]
  private convertOperationalActivitiesToSummary(activities: any[]): HealthOperationalActivitySummaryDTO[] {
    return activities.map(activity => ({
      attentionLevel: activity.attentionLevel || '',
      idStrategicObjective: activity.strategicObjective?.idStrategicObjective || 0,
      strategicObjectiveName: activity.strategicObjective?.name || '',
      idStrategicAction: activity.strategicAction?.idStrategicAction || 0,
      strategicActionName: activity.strategicAction?.name || '',
      activityFamilyName: activity.activityFamily?.name || '',
      measurementUnit: activity.measurementUnit || '',
      codCenSes: activity.codCenSes || '',
      desCenSes: activity.desCenSes || '',

      // Goals by quarter - sumar valores de todas las actividades si es necesario
      goalQ1: activity.goalQ1 || 0,
      goalQ2: activity.goalQ2 || 0,
      goalQ3: activity.goalQ3 || 0,
      goalQ4: activity.goalQ4 || 0,
      goalTotal: (activity.goalQ1 || 0) + (activity.goalQ2 || 0) + (activity.goalQ3 || 0) + (activity.goalQ4 || 0),

      // Budget by quarter
      budgetQ1: activity.budgetQ1 || 0,
      budgetQ2: activity.budgetQ2 || 0,
      budgetQ3: activity.budgetQ3 || 0,
      budgetQ4: activity.budgetQ4 || 0,
      budgetTotal: (activity.budgetQ1 || 0) + (activity.budgetQ2 || 0) + (activity.budgetQ3 || 0) + (activity.budgetQ4 || 0)
    }));
  }

  private transformHealthDataForTable(data: HealthOperationalActivitySummaryDTO[]): HealthTableRow[] {
    return data.map(item => ({
      nivelAtencion: item.attentionLevel || '', // Usar el valor del DTO o valor por defecto
      objetivoEstrategico: {
        codigo: item.idStrategicObjective?.toString() || '',
        nombre: item.strategicObjectiveName || ''
      },
      accionEstrategica: {
        codigo: item.idStrategicAction?.toString() || '',
        nombre: item.strategicActionName || ''
      },
      familia: item.activityFamilyName || '',
      unidadMedida: item.measurementUnit || '',
      desCenSes: item.desCenSes || '',
  codCenSes: item.codCenSes || '',
  idDependency: item.idDependency ?? null,
      metas: {
        trimestre1: item.goalQ1 || 0,
        trimestre2: item.goalQ2 || 0,
        trimestre3: item.goalQ3 || 0,
        trimestre4: item.goalQ4 || 0,
        total: item.goalTotal || 0
      },
      presupuesto: {
        trimestre1: item.budgetQ1 || 0,
        trimestre2: item.budgetQ2 || 0,
        trimestre3: item.budgetQ3 || 0,
        trimestre4: item.budgetQ4 || 0,
        total: item.budgetTotal || 0
      }
    }));
  }

  // Convert consolidated quarterly row to monthly breakdown by evenly splitting each trimestre across 3 months
  private toMonthlyConsolidatedRows(consolidated: ConsolidatedHealthRow[]): any[] {
    return consolidated.map(row => {
      // Start with zeroed months
      const meses = Array.from({ length: 12 }, () => ({ metas: 0, presupuesto: 0 }));

      // Map trimestre to months: T1 -> M1,M2,M3 ; T2 -> M4-6 ; T3 -> M7-9 ; T4 -> M10-12
      const metas = [row.metas.trimestre1, row.metas.trimestre2, row.metas.trimestre3, row.metas.trimestre4];
      const presup = [row.presupuesto.trimestre1, row.presupuesto.trimestre2, row.presupuesto.trimestre3, row.presupuesto.trimestre4];

      metas.forEach((mVal, tIdx) => {
        const perMonth = mVal / 3;
        for (let i = 0; i < 3; i++) {
          const monthIndex = tIdx * 3 + i;
          meses[monthIndex].metas += perMonth;
        }
      });

      presup.forEach((pVal, tIdx) => {
        const perMonth = pVal / 3;
        for (let i = 0; i < 3; i++) {
          const monthIndex = tIdx * 3 + i;
          meses[monthIndex].presupuesto += perMonth;
        }
      });

      // monthly totals
      const metasMensual = meses.map(m => m.metas);
      const presupuestoMensual = meses.map(m => m.presupuesto);

      return {
        id: row.id,
        familia: row.familia,
        unidadMedida: row.unidadMedida,
        meses: meses, // each entry has metas and presupuesto
        metasMensual,
        presupuestoMensual,
        detalles: row.detalles
      };
    });
  }

  // Procesar datos por nivel y consolidar por familia
  private processDataByLevel() {
    // Ya no se usa, agrupación por familia ahora se hace en groupByFamily
  }

  // Métodos para calcular totales por familia (para el footer de grupos)

  // Agrupa los datos por familia y calcula los totales
  private groupByFamily(data: HealthTableRow[]): ConsolidatedHealthRow[] {
    const familias = Array.from(new Set(data.map(item => item.familia)));
    return familias.map(familia => {
      const detalles = data.filter(item => item.familia === familia);

      // Merge detalles by trimmed activity name (accionEstrategica.nombre)
      const mergedMap: { [trimmedName: string]: HealthTableRow } = {};

      detalles.forEach(item => {
        const rawName = item.accionEstrategica?.nombre || '';
        const nameKey = rawName.trim();
        if (!nameKey) {
          // If no name, push as-is with a unique key
          const uniqueKey = `__empty_${Math.random().toString(36).slice(2, 9)}`;
          mergedMap[uniqueKey] = { ...item };
          return;
        }

        if (!mergedMap[nameKey]) {
          // Initialize entry (clone to avoid mutating original)
          mergedMap[nameKey] = { ...item, metas: { ...item.metas }, presupuesto: { ...item.presupuesto } };
        } else {
          // Sum metas and presupuesto
          mergedMap[nameKey].metas.trimestre1 += item.metas.trimestre1;
          mergedMap[nameKey].metas.trimestre2 += item.metas.trimestre2;
          mergedMap[nameKey].metas.trimestre3 += item.metas.trimestre3;
          mergedMap[nameKey].metas.trimestre4 += item.metas.trimestre4;
          mergedMap[nameKey].metas.total += item.metas.total;

          mergedMap[nameKey].presupuesto.trimestre1 += item.presupuesto.trimestre1;
          mergedMap[nameKey].presupuesto.trimestre2 += item.presupuesto.trimestre2;
          mergedMap[nameKey].presupuesto.trimestre3 += item.presupuesto.trimestre3;
          mergedMap[nameKey].presupuesto.trimestre4 += item.presupuesto.trimestre4;
          mergedMap[nameKey].presupuesto.total += item.presupuesto.total;
        }
      });

      const mergedDetalles = Object.values(mergedMap);

      // Calcular totales de metas y presupuesto por trimestre y total a partir de mergedDetalles
      const metas = {
        trimestre1: mergedDetalles.reduce((sum, item) => sum + item.metas.trimestre1, 0),
        trimestre2: mergedDetalles.reduce((sum, item) => sum + item.metas.trimestre2, 0),
        trimestre3: mergedDetalles.reduce((sum, item) => sum + item.metas.trimestre3, 0),
        trimestre4: mergedDetalles.reduce((sum, item) => sum + item.metas.trimestre4, 0),
        total: mergedDetalles.reduce((sum, item) => sum + item.metas.total, 0)
      };

      const presupuesto = {
        trimestre1: mergedDetalles.reduce((sum, item) => sum + item.presupuesto.trimestre1, 0),
        trimestre2: mergedDetalles.reduce((sum, item) => sum + item.presupuesto.trimestre2, 0),
        trimestre3: mergedDetalles.reduce((sum, item) => sum + item.presupuesto.trimestre3, 0),
        trimestre4: mergedDetalles.reduce((sum, item) => sum + item.presupuesto.trimestre4, 0),
        total: mergedDetalles.reduce((sum, item) => sum + item.presupuesto.total, 0)
      };

      return {
        id: familia,
        familia,
        unidadMedida: mergedDetalles[0]?.unidadMedida || '',
        metas,
        presupuesto,
        detalles: mergedDetalles
      };
    });
  }

  // Método para aplicar el filtro por Centro Asistencial
  applyFilter() {
    // Return a promise resolved after filtering/grouping completes so callers can await
    this.filtering = true;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Start from original data
        let filteredData = [...this.originalHealthData];

        // First apply dependencia filter so Centro Asistencial options reflect that dependency
        if (this.idDependency) {
          const parsed = Number(this.idDependency);
          if (!isNaN(parsed)) {
            filteredData = filteredData.filter(item => item.idDependency === parsed);
          } else {
            const idDepStr = this.idDependency!.toString().trim();
            filteredData = filteredData.filter(item => {
              if (item.codCenSes && item.codCenSes.toString().trim() === idDepStr) return true;
              if (item.desCenSes && item.desCenSes.toString().toLowerCase().includes(idDepStr.toLowerCase())) return true;
              const dep = this.dependencies.find(d => d.idDependency?.toString() === idDepStr || d.name?.toLowerCase() === idDepStr.toLowerCase());
              if (dep && item.desCenSes && dep.name && item.desCenSes.toLowerCase().includes(dep.name.toLowerCase())) return true;
              return false;
            });
          }
        }

        // Update Centro Asistencial options based on the data remaining after dependency filter
        this.desCenSesOptions = Array.from(new Set(filteredData.map(item => item.desCenSes))).sort().map(option => ({ label: option, value: option }));

        // Then apply Centro Asistencial filter (should filter the already dependency-filtered data)
        if (this.selectedDesCenSes) {
          filteredData = filteredData.filter(item => item.desCenSes === this.selectedDesCenSes);
        }

        // Actualizar healthData con los datos filtrados
        this.healthData = filteredData;

        // Reagrupar por nivel
        const nivelIData = this.healthData.filter(item => {
          const nivel = item.nivelAtencion.toLowerCase();
          return (nivel.includes('nivel i') || nivel === 'i');
        });
        const nivelIIData = this.healthData.filter(item => {
          const nivel = item.nivelAtencion.toLowerCase();
          return (nivel.includes('nivel ii') || nivel === 'ii');
        });
        const nivelIIIData = this.healthData.filter(item => {
          const nivel = item.nivelAtencion.toLowerCase();
          return (nivel.includes('nivel iii') || nivel === 'iii');
        });
        this.groupedHealthDataNivelI = this.groupByFamily(nivelIData);
        this.groupedHealthDataNivelII = this.groupByFamily(nivelIIData);
        this.groupedHealthDataNivelIII = this.groupByFamily(nivelIIIData);

        // Also prepare monthly grouped data
        this.groupedHealthDataNivelIMensual = this.toMonthlyConsolidatedRows(this.groupedHealthDataNivelI);
        this.groupedHealthDataNivelIIMensual = this.toMonthlyConsolidatedRows(this.groupedHealthDataNivelII);
        this.groupedHealthDataNivelIIIMensual = this.toMonthlyConsolidatedRows(this.groupedHealthDataNivelIII);

        // Compute mensual aggregates for footers
        this.totalMetasNivelI = this.computeTotalMetas(this.groupedHealthDataNivelIMensual);
        this.totalMetasNivelII = this.computeTotalMetas(this.groupedHealthDataNivelIIMensual);
        this.totalMetasNivelIII = this.computeTotalMetas(this.groupedHealthDataNivelIIIMensual);

        this.totalPresupuestoMensualNivelI = this.computeMonthlyPresupuestoTotals(this.groupedHealthDataNivelIMensual);
        this.totalPresupuestoMensualNivelII = this.computeMonthlyPresupuestoTotals(this.groupedHealthDataNivelIIMensual);
        this.totalPresupuestoMensualNivelIII = this.computeMonthlyPresupuestoTotals(this.groupedHealthDataNivelIIIMensual);

        // Calcular totales por nivel
        this.totalPresupuestoNivelI = this.calcularTotalPresupuesto(this.groupedHealthDataNivelI);
        this.totalPresupuestoNivelII = this.calcularTotalPresupuesto(this.groupedHealthDataNivelII);
        this.totalPresupuestoNivelIII = this.calcularTotalPresupuesto(this.groupedHealthDataNivelIII);
        // Calcular total general
        this.totalPresupuestoGeneral = {
          t1: this.totalPresupuestoNivelI.t1 + this.totalPresupuestoNivelII.t1 + this.totalPresupuestoNivelIII.t1,
          t2: this.totalPresupuestoNivelI.t2 + this.totalPresupuestoNivelII.t2 + this.totalPresupuestoNivelIII.t2,
          t3: this.totalPresupuestoNivelI.t3 + this.totalPresupuestoNivelII.t3 + this.totalPresupuestoNivelIII.t3,
          t4: this.totalPresupuestoNivelI.t4 + this.totalPresupuestoNivelII.t4 + this.totalPresupuestoNivelIII.t4,
          total: this.totalPresupuestoNivelI.total + this.totalPresupuestoNivelII.total + this.totalPresupuestoNivelIII.total
        };

        // Emitir el conteo actualizado
        this.activitiesCountChanged.emit(this.healthData.length);

        this.filtering = false;
        this.cdr.detectChanges();
        resolve();
      }, 100); // Simular un pequeño delay para el loader
    });
  }

  // Calcula el total de presupuesto para un grupo de datos
  private calcularTotalPresupuesto(grupo: ConsolidatedHealthRow[]): { t1: number, t2: number, t3: number, t4: number, total: number } {
    return {
      t1: grupo.reduce((sum, row) => sum + row.presupuesto.trimestre1, 0),
      t2: grupo.reduce((sum, row) => sum + row.presupuesto.trimestre2, 0),
      t3: grupo.reduce((sum, row) => sum + row.presupuesto.trimestre3, 0),
      t4: grupo.reduce((sum, row) => sum + row.presupuesto.trimestre4, 0),
      total: grupo.reduce((sum, row) => sum + row.presupuesto.total, 0)
    };
  }

  // Método para limpiar el filtro
  clearFilter() {
    this.selectedDesCenSes = '';
    this.applyFilter();
  }

  // Método para actualizar las opciones del select
  private updateOptions() {
    this.desCenSesOptions = Array.from(new Set(this.originalHealthData.map(item => item.desCenSes))).sort().map(option => ({ label: option, value: option }));
  }

  // Método para obtener detalles por familia
  // Ya no se necesita, los detalles están en groupedHealthData

  // Métodos para expandir/cerrar filas agrupadas
  toggleRowExpansion(rowId: string, nivel: 'I' | 'II' | 'III') {
    if (nivel === 'I') {
      this.expandedRowsNivelI[rowId] = !this.expandedRowsNivelI[rowId];
    } else if (nivel === 'II') {
      this.expandedRowsNivelII[rowId] = !this.expandedRowsNivelII[rowId];
    } else if (nivel === 'III') {
      this.expandedRowsNivelIII[rowId] = !this.expandedRowsNivelIII[rowId];
    }
  }

  isRowExpanded(rowId: string, nivel: 'I' | 'II' | 'III'): boolean {
    if (nivel === 'I') {
      return !!this.expandedRowsNivelI[rowId];
    } else if (nivel === 'II') {
      return !!this.expandedRowsNivelII[rowId];
    } else if (nivel === 'III') {
      return !!this.expandedRowsNivelIII[rowId];
    }
    return false;
  }

  // Métodos de utilidad para el formato
  formatNumber(value: number): string {
    if (value === 0 || value === null || value === undefined) {
      return '0';
    }
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    if (value === 0 || value === null || value === undefined) {
      return '0.00';
    }
    return `${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Método para la paginación
  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
  }

  // Helpers for mensual view
  sumMesMetas(row: any): number {
    if (!row || !row.meses) return 0;
    return row.meses.reduce((sum: number, m: any) => sum + (m.metas || 0), 0);
  }

  sumMesPresupuesto(row: any): number {
    if (!row || !row.meses) return 0;
    return row.meses.reduce((sum: number, m: any) => sum + (m.presupuesto || 0), 0);
  }

  // Compute monthly metas value for a detail row given month index 0..11
  monthlyMetaForDetail(detail: any, monthIndex: number): number {
    if (!detail || !detail.metas) return 0;
    const t1 = detail.metas.trimestre1 || 0;
    const t2 = detail.metas.trimestre2 || 0;
    const t3 = detail.metas.trimestre3 || 0;
    const t4 = detail.metas.trimestre4 || 0;
    if (monthIndex >= 0 && monthIndex < 3) return t1 / 3;
    if (monthIndex >= 3 && monthIndex < 6) return t2 / 3;
    if (monthIndex >= 6 && monthIndex < 9) return t3 / 3;
    if (monthIndex >= 9 && monthIndex < 12) return t4 / 3;
    return 0;
  }

  monthlyBudgetForDetail(detail: any, monthIndex: number): number {
    if (!detail || !detail.presupuesto) return 0;
    const p1 = detail.presupuesto.trimestre1 || 0;
    const p2 = detail.presupuesto.trimestre2 || 0;
    const p3 = detail.presupuesto.trimestre3 || 0;
    const p4 = detail.presupuesto.trimestre4 || 0;
    if (monthIndex >= 0 && monthIndex < 3) return p1 / 3;
    if (monthIndex >= 3 && monthIndex < 6) return p2 / 3;
    if (monthIndex >= 6 && monthIndex < 9) return p3 / 3;
    if (monthIndex >= 9 && monthIndex < 12) return p4 / 3;
    return 0;
  }

  // Total presupuesto for a specific month across all levels
  monthlyTotalForMonth(monthIndex: number): number {
    const all = ([] as any[]).concat(this.groupedHealthDataNivelIMensual || [], this.groupedHealthDataNivelIIMensual || [], this.groupedHealthDataNivelIIIMensual || []);
    return all.reduce((sum, row) => {
      const val = row && row.meses && row.meses[monthIndex] ? (row.meses[monthIndex].presupuesto || 0) : 0;
      return sum + val;
    }, 0);
  }

  // Total presupuesto across all months and levels (grand total mensual)
  monthlyTotalAll(): number {
    const all = ([] as any[]).concat(this.groupedHealthDataNivelIMensual || [], this.groupedHealthDataNivelIIMensual || [], this.groupedHealthDataNivelIIIMensual || []);
    return all.reduce((sum, row) => {
      const rowSum = (row.meses || []).reduce((s: number, m: any) => s + (m.presupuesto || 0), 0);
      return sum + rowSum;
    }, 0);
  }

  // Utility to sum a numeric array (used by templates)
  sumArray(arr: number[] | undefined): number {
    if (!arr || !Array.isArray(arr)) return 0;
    return arr.reduce((s: number, n: number) => s + (n || 0), 0);
  }

  // Precomputed aggregates for mensual footers
  totalMetasNivelI: number = 0;
  totalMetasNivelII: number = 0;
  totalMetasNivelIII: number = 0;

  totalPresupuestoMensualNivelI: number[] = Array(12).fill(0);
  totalPresupuestoMensualNivelII: number[] = Array(12).fill(0);
  totalPresupuestoMensualNivelIII: number[] = Array(12).fill(0);

  // Helpers to compute aggregates for mensual view
  private computeMonthlyPresupuestoTotals(groupedMensual: any[]): number[] {
    const totals = Array(12).fill(0);
    (groupedMensual || []).forEach(row => {
      (row.meses || []).forEach((m: any, idx: number) => {
        totals[idx] = (totals[idx] || 0) + (m.presupuesto || 0);
      });
    });
    return totals;
  }

  private computeTotalMetas(groupedMensual: any[]): number {
    return (groupedMensual || []).reduce((sum: number, row: any) => sum + this.sumMesMetas(row), 0);
  }

  // Helpers to build dependency and formulation metadata used in exports
  // NOTE: assumption: `idDependency` may contain the dependency name; if not, replace with a proper dependency object.
  private buildDependencyMeta(): { name?: string } {
    // Prefer the dependency name from dependencies array (match by idDependency) or fall back to idDependency string
    let depName = '';
    if (this.idDependency) {
      const found = this.dependencies.find(d => d.idDependency?.toString() === this.idDependency?.toString());
      depName = found ? found.name : (this.idDependency as any) || '';
    }
    return { name: depName };
  }

  private buildFormulationMeta(): { year?: string | number | undefined, modification?: number | undefined } {
    const year = this.ano ?? this.selectedYear ?? undefined;
    const modification = this.selectedModification ?? 1;
    return { year, modification };
  }

  // Export helpers per level and for all levels
  exportTrimestralConsolidadoNivel(nivel: 'I' | 'II' | 'III' | 'ALL' = 'ALL') {
    let rows: any[] = [];
    if (nivel === 'I') rows = this.groupedHealthDataNivelI;
    else if (nivel === 'II') rows = this.groupedHealthDataNivelII;
    else if (nivel === 'III') rows = this.groupedHealthDataNivelIII;
    else rows = [...this.groupedHealthDataNivelI, ...this.groupedHealthDataNivelII, ...this.groupedHealthDataNivelIII];

    exportTrimestralConsolidadoExcel(rows, this.buildDependencyMeta(), this.buildFormulationMeta(), `trimestral_consolidado_${nivel}.xlsx`);
  }

  exportTrimestralDetalladoNivel(nivel: 'I' | 'II' | 'III' | 'ALL' = 'ALL') {
    let rows: any[] = [];
    if (nivel === 'I') rows = this.groupedHealthDataNivelI;
    else if (nivel === 'II') rows = this.groupedHealthDataNivelII;
    else if (nivel === 'III') rows = this.groupedHealthDataNivelIII;
    else rows = [...this.groupedHealthDataNivelI, ...this.groupedHealthDataNivelII, ...this.groupedHealthDataNivelIII];

    const details = rows.flatMap(r => r.detalles || []);
    exportTrimestralDetalladoExcel(details, this.buildDependencyMeta(), this.buildFormulationMeta(), `trimestral_detallado_${nivel}.xlsx`);
  }

  exportMensualConsolidadoNivel(nivel: 'I' | 'II' | 'III' | 'ALL' = 'ALL') {
    let rows: any[] = [];
    if (nivel === 'I') rows = this.groupedHealthDataNivelI;
    else if (nivel === 'II') rows = this.groupedHealthDataNivelII;
    else if (nivel === 'III') rows = this.groupedHealthDataNivelIII;
    else rows = [...this.groupedHealthDataNivelI, ...this.groupedHealthDataNivelII, ...this.groupedHealthDataNivelIII];

    exportMensualConsolidadoExcel(rows, this.buildDependencyMeta(), this.buildFormulationMeta(), `mensual_consolidado_${nivel}.xlsx`);
  }

  exportMensualDetalladoNivel(nivel: 'I' | 'II' | 'III' | 'ALL' = 'ALL') {
    let rows: any[] = [];
    if (nivel === 'I') rows = this.groupedHealthDataNivelI;
    else if (nivel === 'II') rows = this.groupedHealthDataNivelII;
    else if (nivel === 'III') rows = this.groupedHealthDataNivelIII;
    else rows = [...this.groupedHealthDataNivelI, ...this.groupedHealthDataNivelII, ...this.groupedHealthDataNivelIII];

    const details = rows.flatMap(r => r.detalles || []);
    exportMensualDetalladoExcel(details, this.buildDependencyMeta(), this.buildFormulationMeta(), `mensual_detallado_${nivel}.xlsx`);
  }

  // Expose a modal flag and simple open/close API so parent components can open this as a modal
  displayModal: boolean = false;

  openModal(): void {
    this.displayModal = true;
    // Ensure data reflects current selection/year and then load health summaries from dependency formulations
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
        this.selectedYear = this.years[this.years.length - 1];
        // Load auxiliary data and then load health summaries from dependency formulations
        this.loadData().then(() => {
          // loadData finished loading dependencies and related data
          this.loadHealthDataFromDependencies();
        }).catch((err: any) => {
          console.error('Error loading initial data for modal:', err);
          this.loading = false;
        });
      },
      error: (err) => {
        this.toastr.error('Error al cargar rango de años.', 'Error');
        this.loading = false;
      }
    });
  }

  closeModal(): void {
    this.displayModal = false;
  }

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
  dependencyOptions: Array<{ label: string; value: any }> = [];

  // Table editing
  clonedActivities: { [s: string]: ActivityDetail } = {};
  editingRowKeys: { [s: string]: boolean } = {};
  //loading = false;

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
    private confirmationService: ConfirmationService,
    private healthOperationalActivityService: HealthOperationalActivityService,
    private cdr: ChangeDetectorRef
  ) { }


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

  loadData(): Promise<void> {
    this.loading = true;
    // Load all required data
    return Promise.all([
      this.loadStrategicObjectives(),
      this.loadStrategicActions(),
      this.loadFormulationTypes(),
      this.loadDependencies()
    ]).then(async () => {
      try {
        await this.loadActivityDetails();
        this.loadModifications();
        await this.loadActivitiesByDependency();
      } finally {
        this.loading = false;
      }
    }).catch(error => {
      console.error('Error loading data:', error);
      this.toastr.error('Error al cargar los datos', 'Error');
      this.loading = false;
      throw error;
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
          // Populate select options for dependency filter
          this.dependencyOptions = this.dependencies.map(d => ({ label: d.name || '', value: d.idDependency }));
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  clearDependencyFilter() {
    this.idDependency = null;
    this.applyFilter();
  }

  loadActivityDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.activityDetailService.getAll().subscribe({
        next: (data) => {
          // Guardar todas las actividades y filtrar por año y tipo
          this.allActivityDetails = data.filter(ad => ad.formulationType && ad.formulationType.idFormulationType === 5);
          this.filterActivityDetailsByYear();
          resolve();
        },
        error: (error) => {
          console.error('Error loading activity details:', error);
          this.toastr.error('Error al cargar las actividades de gestión', 'Error');
          reject(error);
        }
      });
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

  loadActivitiesByDependency(): Promise<void> {
    this.activitiesByDependency = [];

    if (this.dependencies.length === 0) {
      return Promise.resolve();
    }

    const formulationRequests = this.dependencies.map(dependency =>
      this.formulationService.searchByDependencyAndYear(dependency.idDependency!, this.selectedYear)
    );

    return new Promise((resolve, reject) => {
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
          resolve();
        },
        error: (error) => {
          console.error('Error loading formulations:', error);
          this.activitiesByDependency = this.dependencies.map(dependency => ({
            dependencyName: dependency.name,
            hasFormulation: false
          }));
          resolve();
        }
      });
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
          const workbook = new Workbook();
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
      this.importLoading = progress.loading;
      console.log(`📊 Progreso importación: ${this.importProgress}% (${progress.processed}/${progress.total})`);
    };

    this.importTemplateService.processExcelFile(file, this.selectedYear, onProgress).subscribe({
      next: (result: ImportResult) => {
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