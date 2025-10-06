import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { HealthOperationalActivityService } from '../../../core/services/logic/health-operational-activity.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';
import { AuthService } from '../../../core/services/authentication/auth.service';
import { HealthOperationalActivitySummaryDTO } from '../../../models/logic/health-operational-activity-summary.dto';
import { Formulation } from '../../../models/logic/formulation.model';
import { exportTrimestralConsolidadoExcel, exportTrimestralDetalladoExcel } from './reportes-trimestral';
import { exportMensualConsolidadoExcel, exportMensualDetalladoExcel } from './reportes-mensuales';
import { ToastrService } from 'ngx-toastr';

// Definir interface para la tabla original
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

// Definir interface para las filas consolidadas por familia
interface ConsolidatedHealthRow {
  id: string; // Agregar un ID único para dataKey
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
  detalles: HealthTableRow[]; // Los datos originales agrupados
}

@Component({
  selector: 'app-formulacion-salud-od-tabla',
  templateUrl: './formulacion-salud-od-tabla.component.html',
  styleUrls: ['./formulacion-salud-od-tabla.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    ButtonModule,
    RippleModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule
  ]
})
export class FormulacionSaludOdTablaComponent implements OnInit, OnChanges {
  // View mode: internal string but expose boolean getters for template-safe checks
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
  // Totales por nivel y general (filtrados)
  totalPresupuestoNivelI = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  totalPresupuestoNivelII = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  totalPresupuestoNivelIII = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  totalPresupuestoGeneral = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  
  // Total general de toda la dependencia (sin filtros) para validación de presupuesto
  totalPresupuestoGeneralDependencia = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };

  @Output() activitiesCountChanged = new EventEmitter<number>();
  @Input() mostrar = false;
  @Input() ano: string | null = null;
  @Input() idFormulation: number | null = null;
  @Input() idDependency: string | null = null;
  @Input() currentFormulation: Formulation | null = null;

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

  // Budget editing properties
  budgetEditingRowKeys: { [key: string]: boolean } = {};
  clonedBudget: Formulation | null = null;

  // Role-based permissions for budget editing
  get canEditBudget(): boolean {
    return this.authService.hasRole(['ADMIN', 'GPLANEAMIENTO', 'UPLANEAMIENTO']);
  }

  // Variables para el filtro
  selectedDesCenSes: string = '';
  desCenSesOptions: { label: string; value: string }[] = [];
  filtering = false;

  constructor(
    private healthOperationalActivityService: HealthOperationalActivityService,
    private formulationService: FormulationService,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    // Al iniciar, el loader debe estar en false
    this.loading = false;
    // Ya no se carga datos aquí, solo en ngOnChanges
    console.log('FormulacionSaludOdTablaComponent - ngOnInit iniciado');
    console.log('Inputs recibidos:', {
      mostrar: this.mostrar,
      ano: this.ano,
      idFormulation: this.idFormulation,
      idDependency: this.idDependency,
      currentFormulation: this.currentFormulation
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('FormulacionSaludOdTablaComponent - ngOnChanges:', changes);
    console.log('Inputs actuales:', {
      mostrar: this.mostrar,
      ano: this.ano,
      idFormulation: this.idFormulation,
      idDependency: this.idDependency,
      currentFormulation: this.currentFormulation
    });
    // Solo cargar datos si hay una formulación válida
    const formulationId = this.idFormulation || this.currentFormulation?.idFormulation;
    if (formulationId) {
      console.log('Disparando loadHealthData con idFormulation:', formulationId);
      this.loadHealthData();
    } else if (this.ano && this.idDependency) {
      // Si hay año y dependencia seleccionados, pero no hay formulación, mostrar loader esperando búsqueda
      console.log('Esperando formulación para año y dependencia, mostrando loader');
      this.loading = true;
      this.healthData = [];
      this.originalHealthData = [];
      this.groupedHealthDataNivelI = [];
      this.groupedHealthDataNivelII = [];
      this.groupedHealthDataNivelIII = [];
      this.totalRecords = 0;
      this.activitiesCountChanged.emit(0);
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
    // Obtener el ID de formulación desde idFormulation o desde currentFormulation
    const formulationId = this.idFormulation || this.currentFormulation?.idFormulation;

    console.log('loadHealthData iniciado con idFormulation:', this.idFormulation);
    console.log('currentFormulation:', this.currentFormulation);
    console.log('formulationId final:', formulationId);

    if (!formulationId) {
      console.warn('No se puede cargar datos sin ID de formulación');
      this.healthData = [];
      this.originalHealthData = [];
      this.totalRecords = 0;
      this.activitiesCountChanged.emit(0);
      this.loading = false;
      return;
    }

    console.log('Llamando getHealthOperationalActivitySummary con idFormulation:', formulationId);
    this.healthOperationalActivityService.getHealthOperationalActivitySummary(formulationId).subscribe({
      next: (data: HealthOperationalActivitySummaryDTO[]) => {
        // Procesamiento de datos también es parte del loading
        setTimeout(() => {
          if (data && data.length > 0) {
            console.log('Datos recibidos de getHealthOperationalActivitySummary:', data);
            this.originalHealthData = this.transformHealthDataForTable(data);
            this.healthData = [...this.originalHealthData];
            this.totalRecords = this.healthData.length;

            // Actualizar opciones del select
            this.updateOptions();

            // Filtrar por nivel y agrupar por familia
            this.applyFilter();
            console.log('Datos agrupados Nivel I:', this.groupedHealthDataNivelI);
            console.log('Datos agrupados Nivel II:', this.groupedHealthDataNivelII);
            console.log('Datos agrupados Nivel III:', this.groupedHealthDataNivelIII);
          } else {
            console.warn('No se recibieron datos de getHealthOperationalActivitySummary');
            // Intentar buscar actividades operacionales directamente
            this.searchOperationalActivities(formulationId);
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

  // Método de respaldo para buscar actividades operacionales por formulación
  private searchOperationalActivities(formulationId: number) {
    this.loading = true;
    console.log('Buscando actividades operacionales por formulación:', formulationId);

    this.healthOperationalActivityService.searchByFormulation(formulationId).subscribe({
      next: (activities) => {
        setTimeout(() => {
          if (activities && activities.length > 0) {
            // Convertir OperationalActivity[] a HealthOperationalActivitySummaryDTO[] 
            const summaryData = this.convertOperationalActivitiesToSummary(activities);
            this.originalHealthData = this.transformHealthDataForTable(summaryData);
            this.healthData = [...this.originalHealthData];
            this.totalRecords = this.healthData.length;

            // Actualizar opciones del select
            this.updateOptions();

            // Filtrar por nivel y agrupar por familia
            this.applyFilter();
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
          this.loading = false;
          this.activitiesCountChanged.emit(this.healthData.length);
          this.cdr.detectChanges();
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
      }
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
    this.filtering = true;
    setTimeout(() => {
      let filteredData = [...this.originalHealthData];

      // Calcular total general de toda la dependencia ANTES del filtro (para validación)
      this.calculateTotalGeneralDependencia();

      // Filtrar por desCenSes si hay selección
      if (this.selectedDesCenSes) {
        filteredData = filteredData.filter(item =>
          item.desCenSes === this.selectedDesCenSes
        );
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
    }, 100); // Simular un pequeño delay para el loader
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

  // Calcula el total general de toda la dependencia (sin filtros) para validación
  private calculateTotalGeneralDependencia() {
    // Procesar todos los datos originales sin filtros
    const todosNivelIData = this.originalHealthData.filter(item => {
      const nivel = item.nivelAtencion.toLowerCase();
      return (nivel.includes('nivel i') || nivel === 'i');
    });
    const todosNivelIIData = this.originalHealthData.filter(item => {
      const nivel = item.nivelAtencion.toLowerCase();
      return (nivel.includes('nivel ii') || nivel === 'ii');
    });
    const todosNivelIIIData = this.originalHealthData.filter(item => {
      const nivel = item.nivelAtencion.toLowerCase();
      return (nivel.includes('nivel iii') || nivel === 'iii');
    });

    // Agrupar por familia sin filtros
    const todosGroupedNivelI = this.groupByFamily(todosNivelIData);
    const todosGroupedNivelII = this.groupByFamily(todosNivelIIData);
    const todosGroupedNivelIII = this.groupByFamily(todosNivelIIIData);

    // Calcular totales por nivel
    const totalNivelI = this.calcularTotalPresupuesto(todosGroupedNivelI);
    const totalNivelII = this.calcularTotalPresupuesto(todosGroupedNivelII);
    const totalNivelIII = this.calcularTotalPresupuesto(todosGroupedNivelIII);

    // Calcular total general de toda la dependencia
    this.totalPresupuestoGeneralDependencia = {
      t1: totalNivelI.t1 + totalNivelII.t1 + totalNivelIII.t1,
      t2: totalNivelI.t2 + totalNivelII.t2 + totalNivelIII.t2,
      t3: totalNivelI.t3 + totalNivelII.t3 + totalNivelIII.t3,
      t4: totalNivelI.t4 + totalNivelII.t4 + totalNivelIII.t4,
      total: totalNivelI.total + totalNivelII.total + totalNivelIII.total
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
  // Prefer the dependency name available in currentFormulation.dependency, fall back to idDependency string
  const depName = (this.currentFormulation && (this.currentFormulation.dependency as any)?.name) || (this.idDependency as any) || '';
  return { name: depName };
  }

  private buildFormulationMeta(): { year?: string | number | undefined, modification?: number | undefined } {
    const year = this.currentFormulation?.year ?? this.ano ?? undefined;
    const modification = (this.currentFormulation && (this.currentFormulation as any).modification) ?? 1;
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

  // Budget editing methods
  onBudgetRowEditInit(formulation: Formulation) {
    this.clonedBudget = { ...formulation };
    this.budgetEditingRowKeys[formulation.idFormulation as any] = true;
  }

  onBudgetRowEditSave(formulation: Formulation, event?: Event) {
    // Prevenir el comportamiento por defecto si hay evento
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.canEditBudget) {
      this.toastr.warning('No tienes permisos para editar el presupuesto.', 'Advertencia');
      return;
    }

    if (!formulation.idFormulation) {
      this.toastr.error('ID de formulación no válido.', 'Error');
      return;
    }

    // Validar que los valores sean números válidos
    if (typeof formulation.remuneration !== 'number' || isNaN(formulation.remuneration)) {
      formulation.remuneration = 0;
    }
    if (typeof formulation.goods !== 'number' || isNaN(formulation.goods)) {
      formulation.goods = 0;
    }
    if (typeof formulation.services !== 'number' || isNaN(formulation.services)) {
      formulation.services = 0;
    }

    // Calcular el presupuesto total
    const calculatedTotal = this.calculateBudgetTotal(formulation);
    formulation.budget = calculatedTotal;

    // Validar que el total del presupuesto detallado no exceda el total de la formulación
    if (!this.validateBudgetLimit(calculatedTotal)) {
      // No hacer nada más - mantener en modo edición
      return;
    }

    // Usar el nuevo endpoint específico para actualizar componentes del presupuesto
    this.formulationService.updateBudgetComponents(
      formulation.idFormulation,
      formulation.goods || 0,
      formulation.remuneration || 0,
      formulation.services || 0
    ).subscribe({
      next: (updatedFormulation) => {
        // Actualizar la formulación actual
        this.currentFormulation = updatedFormulation;
        this.toastr.success('Presupuesto actualizado exitosamente.', 'Éxito');
        // Solo salir del modo edición si la actualización fue exitosa
        delete this.budgetEditingRowKeys[formulation.idFormulation as any];
        this.clonedBudget = null;
      },
      error: (err) => {
        console.error('Error updating formulation budget:', err);
        this.toastr.error('Error al actualizar el presupuesto.', 'Error');
        // NO salir del modo edición si hay error - mantener budgetEditingRowKeys y clonedBudget
      }
    });
  }

  onBudgetRowEditCancel(formulation: Formulation) {
    if (this.clonedBudget) {
      // Restaurar los valores originales
      formulation.remuneration = this.clonedBudget.remuneration;
      formulation.goods = this.clonedBudget.goods;
      formulation.services = this.clonedBudget.services;
      formulation.budget = this.clonedBudget.budget;
    }
    delete this.budgetEditingRowKeys[formulation.idFormulation as any];
    this.clonedBudget = null;
    this.toastr.info('Edición de presupuesto cancelada.', 'Información');
  }

  // Helper method to calculate budget total
  calculateBudgetTotal(formulation: Formulation): number {
    const remuneration = formulation.remuneration || 0;
    const goods = formulation.goods || 0;
    const services = formulation.services || 0;
    return remuneration + goods + services;
  }

  // Validation method to ensure budget components don't exceed health activities total
  validateBudgetLimit(calculatedTotal: number): boolean {
    const healthActivitiesTotalBudget = this.totalPresupuestoGeneralDependencia.total || 0;
    
    // Si no hay presupuesto de actividades de salud calculado, permitir cualquier valor
    if (healthActivitiesTotalBudget === 0) {
      return true;
    }
    
    // Validar que el total de componentes no exceda el total de actividades de salud de toda la dependencia
    if (calculatedTotal > healthActivitiesTotalBudget) {
      this.toastr.error(
        `El total del presupuesto detallado (S/. ${this.formatNumber(calculatedTotal)}) no puede exceder el total del presupuesto de actividades de salud de toda la dependencia (S/. ${this.formatNumber(healthActivitiesTotalBudget)}).`,
        'Error de Validación'
      );
      return false;
    }
    
    return true;
  }
}
