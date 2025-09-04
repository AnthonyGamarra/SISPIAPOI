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

// Definir interface para la tabla
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

  // Nuevas propiedades
  healthData: HealthTableRow[] = [];
  originalHealthData: HealthTableRow[] = [];

  // Propiedades de la paginación
  first = 0;
  rows = 10;

  // Nuevas variables para manejar la carga
  loading = false;
  totalRecords = 0;

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
    
    // Si cambia la formulación o el ID de formulación, recargar datos
    if (changes['idFormulation'] || changes['currentFormulation']) {
      console.log('ID de formulación cambió, recargando datos...');
      this.loadHealthData();
    }
  }

  loadHealthData() {
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
      this.loading = false;
      this.activitiesCountChanged.emit(0);
      return;
    }

    console.log('Iniciando carga de datos para formulación:', formulationId);
    this.loading = true;
    
    this.healthOperationalActivityService.getHealthOperationalActivitySummary(formulationId).subscribe({
      next: (data: HealthOperationalActivitySummaryDTO[]) => {
        console.log('Datos de salud recibidos del servicio:', data);
        console.log('Cantidad de registros recibidos:', data?.length || 0);
        
        if (data && data.length > 0) {
          this.originalHealthData = this.transformHealthDataForTable(data);
          this.healthData = [...this.originalHealthData];
          this.totalRecords = this.healthData.length;
          console.log('Datos transformados para la tabla:', this.healthData);
        } else {
          console.warn('No se recibieron datos del endpoint summary. Intentando búsqueda por formulación...');
          // Intentar buscar actividades operacionales directamente
          this.searchOperationalActivities(formulationId);
          return;
        }
        
        this.loading = false;
        this.activitiesCountChanged.emit(this.healthData.length);
        this.cdr.detectChanges();
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
        this.searchOperationalActivities(formulationId);
      }
    });
  }

  // Método de respaldo para buscar actividades operacionales por formulación
  private searchOperationalActivities(formulationId: number) {
    console.log('Buscando actividades operacionales por formulación:', formulationId);
    
    this.healthOperationalActivityService.searchByFormulation(formulationId).subscribe({
      next: (activities) => {
        console.log('Actividades operacionales encontradas:', activities);
        console.log('Cantidad de actividades:', activities?.length || 0);
        
        if (activities && activities.length > 0) {
          // Convertir OperationalActivity[] a HealthOperationalActivitySummaryDTO[] 
          const summaryData = this.convertOperationalActivitiesToSummary(activities);
          this.originalHealthData = this.transformHealthDataForTable(summaryData);
          this.healthData = [...this.originalHealthData];
          this.totalRecords = this.healthData.length;
          console.log('Datos convertidos para la tabla:', this.healthData);
        } else {
          console.warn('No se encontraron actividades operacionales para esta formulación');
          this.originalHealthData = [];
          this.healthData = [];
          this.totalRecords = 0;
        }
        
        this.loading = false;
        this.activitiesCountChanged.emit(this.healthData.length);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al buscar actividades operacionales:', error);
        this.loading = false;
        this.healthData = [];
        this.originalHealthData = [];
        this.totalRecords = 0;
        this.activitiesCountChanged.emit(0);
        this.cdr.detectChanges();
      }
    });
  }

  // Convertir OperationalActivity[] a HealthOperationalActivitySummaryDTO[]
  private convertOperationalActivitiesToSummary(activities: any[]): HealthOperationalActivitySummaryDTO[] {
    return activities.map(activity => ({
      attentionLevel: activity.attentionLevel || 'No especificado',
      idStrategicObjective: activity.strategicObjective?.idStrategicObjective || 0,
      strategicObjectiveName: activity.strategicObjective?.name || 'Sin nombre',
      idStrategicAction: activity.strategicAction?.idStrategicAction || 0,
      strategicActionName: activity.strategicAction?.name || 'Sin nombre',
      activityFamilyName: activity.activityFamily?.name || 'No especificada',
      measurementUnit: activity.measurementUnit || 'No especificada',
      
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
      nivelAtencion: item.attentionLevel || 'Nivel de Atención', // Usar el valor del DTO o valor por defecto
      objetivoEstrategico: {
        codigo: item.idStrategicObjective?.toString() || 'N/A',
        nombre: item.strategicObjectiveName || 'Sin nombre'
      },
      accionEstrategica: {
        codigo: item.idStrategicAction?.toString() || 'N/A',
        nombre: item.strategicActionName || 'Sin nombre'
      },
      familia: item.activityFamilyName || 'No especificada',
      unidadMedida: item.measurementUnit || 'No especificada',
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

  // Métodos de utilidad para el formato
  formatNumber(value: number): string {
    if (value === 0 || value === null || value === undefined) {
      return '0';
    }
    return value.toLocaleString('es-PE');
  }

  formatCurrency(value: number): string {
    if (value === 0 || value === null || value === undefined) {
      return 'S/ 0.00';
    }
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Método para la paginación
  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
  }
}
