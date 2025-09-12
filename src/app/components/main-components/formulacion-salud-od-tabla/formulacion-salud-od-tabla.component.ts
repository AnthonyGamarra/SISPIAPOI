import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { HealthOperationalActivityService } from '../../../core/services/logic/health-operational-activity.service';
import { HealthOperationalActivitySummaryDTO } from '../../../models/logic/health-operational-activity-summary.dto';
import { Formulation } from '../../../models/logic/formulation.model';

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
    TextareaModule,
    ButtonModule,
    RippleModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule
  ]
})
export class FormulacionSaludOdTablaComponent implements OnInit, OnChanges {

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

  // Variables para el filtro
  selectedDesCenSes: string = '';
  desCenSesOptions: { label: string; value: string }[] = [];
  filtering = false;

  constructor(
    private healthOperationalActivityService: HealthOperationalActivityService,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    console.log('FormulacionSaludOdTablaComponent - ngOnInit iniciado');
    console.log('Inputs recibidos:', {
      mostrar: this.mostrar,
      ano: this.ano,
      idFormulation: this.idFormulation,
      idDependency: this.idDependency,
      currentFormulation: this.currentFormulation
    });
    this.loadHealthData();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('FormulacionSaludOdTablaComponent - ngOnChanges:', changes);
    // Solo mostrar loader y recargar datos si el año cambia
    if (changes['ano'] && !changes['ano'].firstChange) {
      this.loading = true;
      this.loadHealthData();
    }
    // Si cambia la formulación, recargar datos pero sin mostrar loader
    else if (changes['idFormulation'] || changes['currentFormulation']) {
      this.loadHealthData();
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

    console.log('Iniciando carga de datos para formulación:', formulationId);
    this.loading = true;
    
    this.healthOperationalActivityService.getHealthOperationalActivitySummary(formulationId).subscribe({
      next: (data: HealthOperationalActivitySummaryDTO[]) => {
        // Procesamiento de datos también es parte del loading
        setTimeout(() => {
          if (data && data.length > 0) {
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
            console.warn('No se recibieron datos del endpoint summary. Intentando búsqueda por formulación...');
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
      // Calcular totales de metas y presupuesto por trimestre y total
      const metas = {
        trimestre1: detalles.reduce((sum, item) => sum + item.metas.trimestre1, 0),
        trimestre2: detalles.reduce((sum, item) => sum + item.metas.trimestre2, 0),
        trimestre3: detalles.reduce((sum, item) => sum + item.metas.trimestre3, 0),
        trimestre4: detalles.reduce((sum, item) => sum + item.metas.trimestre4, 0),
        total: detalles.reduce((sum, item) => sum + item.metas.total, 0)
      };
      const presupuesto = {
        trimestre1: detalles.reduce((sum, item) => sum + item.presupuesto.trimestre1, 0),
        trimestre2: detalles.reduce((sum, item) => sum + item.presupuesto.trimestre2, 0),
        trimestre3: detalles.reduce((sum, item) => sum + item.presupuesto.trimestre3, 0),
        trimestre4: detalles.reduce((sum, item) => sum + item.presupuesto.trimestre4, 0),
        total: detalles.reduce((sum, item) => sum + item.presupuesto.total, 0)
      };
      return {
        id: familia,
        familia,
        unidadMedida: detalles[0]?.unidadMedida || '',
        metas,
        presupuesto,
        detalles
      };
    });
  }

  // Método para aplicar el filtro por Centro Asistencial
  applyFilter() {
    this.filtering = true;
    setTimeout(() => {
      let filteredData = [...this.originalHealthData];

      // Filtrar por desCenSes si hay selección
      if (this.selectedDesCenSes) {
        filteredData = filteredData.filter(item =>
          item.desCenSes === this.selectedDesCenSes
        );
      }

      // Actualizar healthData con los datos filtrados
      this.healthData = filteredData;

      // Reagrupar por nivel
      this.groupedHealthDataNivelI = this.groupByFamily(this.healthData.filter(item => {
        const nivel = item.nivelAtencion.toLowerCase();
        return (nivel.includes('nivel i') || nivel === 'i');
      }));
      this.groupedHealthDataNivelII = this.groupByFamily(this.healthData.filter(item => {
        const nivel = item.nivelAtencion.toLowerCase();
        return (nivel.includes('nivel ii') || nivel === 'ii');
      }));
      this.groupedHealthDataNivelIII = this.groupByFamily(this.healthData.filter(item => {
        const nivel = item.nivelAtencion.toLowerCase();
        return (nivel.includes('nivel iii') || nivel === 'iii');
      }));

      // Emitir el conteo actualizado
      this.activitiesCountChanged.emit(this.healthData.length);

      this.filtering = false;
      this.cdr.detectChanges();
    }, 100); // Simular un pequeño delay para el loader
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
}
