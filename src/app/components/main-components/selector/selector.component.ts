// selector.component.ts

import { Component, EventEmitter, OnInit, Output, inject, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastrService } from 'ngx-toastr';
import { AnimationOptions } from 'ngx-lottie';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { FileUpload } from 'primeng/fileupload'; // Importante para ViewChild

import { AuthService } from '../../../core/services/authentication/auth.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { FormulationStateService } from '../../../core/services/logic/formulation-state.service';
import { FormulationSupportFileService } from '../../../core/services/logic/formulation-support-file.service';

import { Formulation } from '../../../models/logic/formulation.model';
import { Dependency } from '../../../models/logic/dependency.model';
import { FormulationState } from '../../../models/logic/formulationState.model';
import { FormulationSupportFile } from '../../../models/logic/formulationSupportFile.model';

import { SafeUrlPipe } from '../../../safe-url.pipe';
import { OcReportService } from '../../../core/services/logic/oc-report.service';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    FileUploadModule,
    TooltipModule,
    SafeUrlPipe
  ],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss'],
})
export class SelectorComponent implements OnInit {
  
  @Input() hasActivities: boolean = false;
  @Input() formulationType: number = 1; // Tipo de formulación a filtrar (1 por defecto para compatibilidad)

  @Output() buscar = new EventEmitter<{
    ano: string | null;
    dependencia: string | null;
    idFormulation: number | null;
  }>();
  @Output() cambioAno = new EventEmitter<string | null>();
  @Output() cambioDependencia = new EventEmitter<string | null>();

  @Output() formulationSelected = new EventEmitter<Formulation>();
  @Output() formulationUpdated = new EventEmitter<Formulation>(); private toastr = inject(ToastrService);

  @Output() activitiesCountChanged = new EventEmitter<number>();

  updateActivitiesCount(count: number): void {
    this.hasActivities = count > 0;
  }

  private formulationService = inject(FormulationService);
  private dependencyService = inject(DependencyService);
  private strategicObjectiveService = inject(StrategicObjectiveService);
  private authService = inject(AuthService);
  private formulationStateService = inject(FormulationStateService);
  private fileService = inject(FormulationSupportFileService);

  @ViewChild('fileUpload') fileUploadRef!: FileUpload;

  dependencyOptions: { label: string; value: string }[] = [];
  selectedDependency: string | null = null;
  selectedAno: string | null = null;
  idFormulation: number | null = null;
  public activeFormulation: Formulation | null = null;
  public isLoadingFileMetadata: boolean = false;

  // Opciones de formato para descarga de reportes
  downloadFormatOptions = [
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' },
    { label: 'Word', value: 'word' }
  ];
  selectedDownloadFormat: string = 'excel';
  isDownloadingR1 = false;
  isDownloadingR2 = false;

  // Inyección del servicio de reportes OC
  private ocReportService = inject(OcReportService);

  // Descargar OC R1
  downloadOcR1(): void {
    if (!this.selectedDependency || !this.selectedAno || !this.selectedModificationOption) {
      this.toastr.warning('Seleccione dependencia, año y etapa.', 'Descarga inválida');
      return;
    }
    this.isDownloadingR1 = true;
    const depId = Number(this.selectedDependency);
    const year = Number(this.selectedAno);
    const modification = this.selectedModificationOption.value;
    this.ocReportService.downloadOcR1Report(depId, year, modification, this.selectedDownloadFormat)
      .subscribe({
        next: (response: import('@angular/common/http').HttpResponse<Blob>) => {
          const filename = this.ocReportService.extractFilename(response, 'oc-r1-report');
          this.ocReportService.downloadFile(response.body!, filename);
          this.isDownloadingR1 = false;
        },
        error: (err: any) => {
          this.toastr.error('Error al descargar el reporte.', 'Error');
          this.isDownloadingR1 = false;
        }
      });
  }

  // Descargar OC R2
  downloadOcR2(): void {
    if (!this.selectedDependency || !this.selectedAno || !this.selectedModificationOption) {
      this.toastr.warning('Seleccione dependencia, año y etapa.', 'Descarga inválida');
      return;
    }
    this.isDownloadingR2 = true;
    const depId = Number(this.selectedDependency);
    const year = Number(this.selectedAno);
    const modification = this.selectedModificationOption.value;
    this.ocReportService.downloadOcR2Report(depId, year, modification, this.selectedDownloadFormat)
      .subscribe({
        next: (response: import('@angular/common/http').HttpResponse<Blob>) => {
          const filename = this.ocReportService.extractFilename(response, 'oc-r2-report');
          this.ocReportService.downloadFile(response.body!, filename);
          this.isDownloadingR2 = false;
        },
        error: (err: any) => {
          this.toastr.error('Error al descargar el reporte.', 'Error');
          this.isDownloadingR2 = false;
        }
      });
  }

  isSingleDependency = false;
  formulationExists = false;
  checkingFormulation = false;
  showSuccessAnimation = false;

  foundFormulations: Formulation[] = [];
  modificationOptions: { label: string; value: number }[] = [];
  selectedModificationOption: { label: string; value: number } | null = null;
  quarterLabel: string | null = null;
  currentFormulationStateLabel: string | null = null;

  optionsAno: { label: string; value: string }[] = [];

  options: AnimationOptions = {
    path: 'resources/succes-allert.json',
  };

  isAdmin: boolean = false;
  canChangeState: boolean = false;

  showChangeStateModal: boolean = false;
  formulationStateOptions: FormulationState[] = [];
  selectedFormulationState: number | null = null;
  allowedRolesForEvaluacion: string[] = ["ADMIN", "UPLANEAMIENTO", "GPLANEAMIENTO"];

  hasSupportFile = false;
  supportFileMetadata: FormulationSupportFile | null = null;
  fileUploading = false;

  // NUEVO: Variables para la visualización del documento
  showDocumentViewer = false;
  documentUrl: any = '';

  canSeeEvaluacionComponent(): boolean {
    return this.authService.hasRole(this.allowedRolesForEvaluacion);
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN', 'GPLANEAMIENTO']);
    this.canChangeState = this.authService.hasRole(['ADMIN', 'GPLANEAMIENTO', 'UPLANEAMIENTO']);
    this.loadDependencies();
    this.loadFormulationStates();
  }

  // Ahora primero carga dependencias, y luego años según la dependencia seleccionada

  loadDependencies(): void {
    this.dependencyService.getAll().subscribe((dependencies) => {
      let filteredDependencies: Dependency[];

      // Filtrar por tipo de dependencia
      const type1Dependencies = dependencies.filter(dep => dep.dependencyType?.idDependencyType === 1);

      if (this.isAdmin) {
        filteredDependencies = type1Dependencies;
      } else {
        const dependencyIds: number[] = JSON.parse(
          localStorage.getItem('dependencies') || '[]'
        );
        if (dependencyIds.length === 0) {
          this.toastr.warning(
            'No se encontraron dependencias para el usuario.',
            'Acceso Restringido'
          );
          return;
        }
        filteredDependencies = type1Dependencies.filter((dep) =>
          dependencyIds.includes(dep.idDependency!)
        );
      }

      this.isSingleDependency = filteredDependencies.length === 1;

      this.dependencyOptions = filteredDependencies.map((dep) => ({
        label: dep.name,
        value: dep.idDependency!.toString(),
      }));

      // Si solo hay una dependencia, la selecciona automáticamente y carga años
      if (this.isSingleDependency) {
        this.selectedDependency = this.dependencyOptions[0]?.value;
        this.onDependencyChange();
      } else if (this.isAdmin && this.dependencyOptions.length > 0) {
        this.selectedDependency = null;
      }
      // Si hay más de una, espera a que el usuario seleccione
    });
  }

  // Nuevo método: cuando cambia la dependencia, carga los años válidos
onDependencyChange(): void {
  // Limpiar todo inmediatamente al cambiar órgano
  this.optionsAno = [];
  this.selectedAno = null;
  this.formulationExists = false;
  this.idFormulation = null;
  this.foundFormulations = [];
  this.modificationOptions = [];
  this.selectedModificationOption = null;
  this.quarterLabel = null;
  this.currentFormulationStateLabel = null;
  this.activeFormulation = null;
  this.hasSupportFile = false;
  this.supportFileMetadata = null;
  this.selectedFormulationState = null;
  this.checkingFormulation = false;
  
  // Emitir null para limpiar la tabla inmediatamente
  this.formulationSelected.emit(undefined);
  this.cambioDependencia.emit(this.selectedDependency);

  if (!this.selectedDependency) return;
  
  const depId = Number(this.selectedDependency);
  this.strategicObjectiveService.getMinMaxYears().subscribe({
    next: (range) => {
      if (range && range.minYear && range.maxYear) {
        this.optionsAno = [];
        for (let year = range.maxYear; year >= range.minYear; year--) {
          this.optionsAno.push({ label: year.toString(), value: year.toString() });
        }
      }
    },
    error: (err) => {
      console.error('Error al cargar rango de años:', err);
      this.toastr.error('Error al cargar los años disponibles.', 'Error');
    },
  });
}
  // Cuando cambia el año, busca formulaciones
  onAnoChange(): void {
    // Emitir el cambio de año inmediatamente
    this.cambioAno.emit(this.selectedAno);

    if (this.selectedAno && this.selectedDependency) {
      this.verificarFormulacion();
    }
  }

  loadFormulationStates(): void {
    this.formulationStateService.getAll().subscribe({
      next: (states) => {
        this.formulationStateOptions = states;
      },
      error: (err) => {
        this.toastr.error(
          'Error al cargar los estados de formulación.',
          'Error de Carga'
        );
        console.error('Error fetching formulation states:', err);
      },
    });
  }

  verificarFormulacion() {
    this.formulationExists = false;
    this.idFormulation = null;
    this.foundFormulations = [];
    this.modificationOptions = [];
    this.selectedModificationOption = null;
    this.quarterLabel = null;
    this.currentFormulationStateLabel = null;
    this.activeFormulation = null;
    this.hasSupportFile = false;
    this.supportFileMetadata = null;
    this.selectedFormulationState = null; // Reiniciar

    if (!this.selectedAno || !this.selectedDependency) {
      return;
    } this.checkingFormulation = true;

    const year = Number(this.selectedAno);
    const depId = Number(this.selectedDependency);

    this.formulationService.searchByDependencyAndYear(depId, year).subscribe({
      next: (formulations) => {
        // Filtrar por tipo de formulación usando el input
        const filteredFormulations = formulations.filter(f => f.formulationType?.idFormulationType === this.formulationType);
        this.foundFormulations = filteredFormulations;
        this.formulationExists = this.foundFormulations.length > 0;

        if (this.formulationExists) {
          this.foundFormulations.sort(
            (a, b) => (b.modification || 0) - (a.modification || 0)
          );

          this.modificationOptions = this.foundFormulations.map((f) => ({
            label: this.getModificationLabel(f.modification),
            value: f.modification!,
          }));

          this.selectedModificationOption =
            this.modificationOptions[0] || null;
          this.onModificationChange();
          // Sincronizar el estado seleccionado con el de la formulación activa
          if (this.foundFormulations[0]?.formulationState?.idFormulationState) {
            this.selectedFormulationState = this.foundFormulations[0].formulationState.idFormulationState;
          }
        } else {
          this.idFormulation = null;
          this.selectedFormulationState = null;
          // Emitir undefined para indicar que no se encontró formulación
          this.formulationSelected.emit(undefined);
        }

        this.checkingFormulation = false;
      },
      error: () => {
        this.toastr.error('Error al verificar formulación.');
        this.checkingFormulation = false;
        this.formulationExists = false;
        this.idFormulation = null;
        this.foundFormulations = [];
        this.modificationOptions = [];
        this.selectedModificationOption = null;
        this.quarterLabel = null;
        this.selectedFormulationState = null;
        this.activeFormulation = null;
        this.hasSupportFile = false;
        // Emitir undefined para indicar que hubo un error en la búsqueda
        this.formulationSelected.emit(undefined);
        this.supportFileMetadata = null;
      },
    });
  }

  onModificationChange(): void {
    // Inicializa las variables para evitar parpadeos
    this.isLoadingFileMetadata = false;
    this.hasSupportFile = false;
    this.supportFileMetadata = null;

    if (this.selectedModificationOption) {
      const selectedFormulation = this.foundFormulations.find(
        (f) => f.modification === this.selectedModificationOption!.value
      );
      if (selectedFormulation) {
        this.idFormulation = selectedFormulation.idFormulation ?? null;
        this.quarterLabel = this.getQuarterLabel(selectedFormulation.quarter);
        this.currentFormulationStateLabel =
          selectedFormulation.formulationState?.name ?? null;
        this.activeFormulation = selectedFormulation;
        // Sincronizar el estado seleccionado con el de la formulación activa
        this.selectedFormulationState = selectedFormulation.formulationState?.idFormulationState ?? null;
        if (selectedFormulation.formulationSupportFile) {
          this.hasSupportFile = true;
          this.supportFileMetadata = selectedFormulation.formulationSupportFile;
        } else {
          this.hasSupportFile = false;
          this.supportFileMetadata = null;
        }
        this.formulationSelected.emit(this.activeFormulation);
      } else {
        this.idFormulation = null;
        this.quarterLabel = null;
        this.currentFormulationStateLabel = null;
        this.selectedFormulationState = null;
        this.activeFormulation = null;
        this.hasSupportFile = false;
        this.supportFileMetadata = null;
      }
    } else {
      this.idFormulation = null;
      this.quarterLabel = null;
      this.currentFormulationStateLabel = null;
      this.selectedFormulationState = null;
      this.activeFormulation = null;
      this.hasSupportFile = false;
      this.supportFileMetadata = null;
    }
  }

  onFileSelect(event: any) {
    const file = event.files[0];
    if (file && this.idFormulation !== null) {
      this.fileUploading = true;
      this.fileService.uploadFile(file, this.idFormulation).subscribe({
        next: () => {
          this.toastr.success('Archivo subido correctamente.', 'Éxito');
          this.fileUploading = false;
          // === CAMBIO AQUÍ ===
          // En lugar de checkSupportFile, volvemos a cargar la formulación.
          this.verificarFormulacion();
          if (this.fileUploadRef) {
            this.fileUploadRef.clear();
          }
        },
        error: (err) => {
          this.toastr.error('Error al subir el archivo.', 'Error');
          this.fileUploading = false;
          console.error('Error uploading file:', err);
          if (this.fileUploadRef) {
            this.fileUploadRef.clear();
          }
        },
      });
    } else {
      this.toastr.warning('No se seleccionó ningún archivo o no hay formulación activa.', 'Advertencia');
    }
  }

  onFileUpdate(event: any) {
    const file = event.files[0];
    // Limitar tamaño a 5MB
    const maxSize = 5.1 * 1024 * 1024; // 5.1MB en bytes
    if (file) {
      if (file.size > maxSize) {
        this.toastr.error('El archivo supera el límite de 5MB.', 'Error de tamaño');
        if (this.fileUploadRef) {
          this.fileUploadRef.clear();
        }
        return;
      }
      if (file.type !== 'application/pdf') {
        this.toastr.error('Solo se permite subir archivos PDF.', 'Tipo de archivo incorrecto');
        if (this.fileUploadRef) {
          this.fileUploadRef.clear();
        }
        return;
      }
    }
    if (file && this.idFormulation !== null) {
      this.fileUploading = true;
      this.fileService.updateFile(this.idFormulation, file).subscribe({
        next: () => {
          this.toastr.success('Archivo actualizado correctamente.', 'Éxito');
          this.fileUploading = false;
          this.verificarFormulacion();
          if (this.fileUploadRef) {
            this.fileUploadRef.clear();
          }
        },
        error: (err) => {
          this.toastr.error('Error al actualizar el archivo.', 'Error');
          this.fileUploading = false;
          console.error('Error updating file:', err);
          if (this.fileUploadRef) {
            this.fileUploadRef.clear();
          }
        },
      });
    } else {
      this.toastr.warning('No se seleccionó ningún archivo o no hay formulación activa.', 'Advertencia');
    }
  }

  // NUEVO: Método para ver el archivo en un modal
  viewFile(): void {
    if (!this.supportFileMetadata || !this.supportFileMetadata.idFormulationSupportFile) {
      this.toastr.warning('No hay un archivo para ver.', 'Advertencia');
      return;
    }

    const fileId = this.supportFileMetadata.idFormulationSupportFile;

    this.fileService.getById(fileId).subscribe({
      next: (fileDto) => {
        if (fileDto && fileDto.file && fileDto.fileExtension) {
          try {
            // Paso 1: Decodificar la cadena Base64 a una cadena binaria
            const binaryString = window.atob(fileDto.file);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);

            // Paso 2: Convertir la cadena binaria en un Uint8Array
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Paso 3: Crear el Blob a partir del Uint8Array y el tipo de archivo
            const blob = new Blob([bytes.buffer], { type: fileDto.fileExtension });

            const isViewable = ['application/pdf'].includes(fileDto.fileExtension);

            if (isViewable) {
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
            console.error("Error al decodificar Base64 o crear Blob:", e);
            this.toastr.error('Error al procesar el archivo. El formato es incorrecto.', 'Error de Archivo');
          }
        } else {
          this.toastr.warning('Los datos del archivo están incompletos.', 'Advertencia');
        }
      },
      error: (err) => {
        this.toastr.error('Error al cargar el documento.', 'Error');
        console.error('Error fetching file DTO:', err);
      },
    });
  }

  // NUEVO: Limpiar la URL de objeto cuando el modal se cierra
  onDocumentViewerHide(): void {
    if (this.documentUrl) {
      window.URL.revokeObjectURL(this.documentUrl);
      this.documentUrl = '';
    }
  }

  getModificationLabel(modification?: number): string {
    if (modification === undefined || modification === null) return '';
    if (modification === 1) return 'Formulación Inicial';
    if (modification === 2) return 'Primera Modificación';
    if (modification === 3) return 'Segunda Modificación';
    if (modification === 4) return 'Tercera Modificación';
    if (modification === 5) return 'Cuarta Modificación';
    return `Modificación ${modification}`;
  }

  getQuarterLabel(quarter?: number): string {
    if (quarter === undefined || quarter === null) return '';
    switch (quarter) {
      case 1:
        return 'I Trimestre';
      case 2:
        return 'II Trimestre';
      case 3:
        return 'III Trimestre';
      case 4:
        return 'IV Trimestre';
      default:
        return `Trimestre ${quarter}`;
    }
  }

  onBuscar() {
    if (!this.selectedAno || !this.selectedDependency) {
      this.toastr.warning('Por favor, seleccione año y dependencia.', 'Formulario inválido');
      return;
    }

    if (this.formulationExists) {
      if (this.idFormulation && this.activeFormulation) {
        this.formulationSelected.emit(this.activeFormulation);
      } else {
        this.toastr.warning(
          'Por favor, seleccione una modificación para la formulación existente.',
          'Selección Requerida'
        );
      }
      return;
    }

    const nuevaFormulacion: Formulation = {
      year: Number(this.selectedAno),
      dependency: { idDependency: Number(this.selectedDependency) } as Dependency,
      formulationState: { idFormulationState: 1 } as FormulationState,
      active: true,
      modification: 1,
      quarter: 1,
    };

    this.formulationService.create(nuevaFormulacion).subscribe({
      next: (nueva) => {
        this.formulationExists = true;
        this.idFormulation = nueva.idFormulation ?? null;
        this.activeFormulation = nueva;
        this.verificarFormulacion();

        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
          this.toastr.success('Formulación iniciada correctamente.', 'Éxito');
          if (this.activeFormulation)
            this.formulationSelected.emit(this.activeFormulation);
        }, 2500);
      },
      error: (err) => {
        this.toastr.error('Error al crear la formulación.', 'Error');
        console.error('Error creating formulation:', err);
      },
    });
  }

  // selector.component.ts

  changeFormulationState(): void {
    if (!this.idFormulation || !this.selectedFormulationState || !this.activeFormulation) {
      this.toastr.warning('Seleccione un estado válido.', 'Advertencia');
      return;
    }

    const selectedState = this.formulationStateOptions.find(
      (state) => state.idFormulationState === this.selectedFormulationState
    );

    if (!selectedState) {
      this.toastr.error('Estado de formulación no válido.', 'Error');
      return;
    }

    // Usar el nuevo endpoint específico para cambiar estado
    this.formulationService.changeFormulationState(this.idFormulation, this.selectedFormulationState).subscribe({
      next: (updatedEntity) => {
        console.log('Formulación actualizada recibida:', updatedEntity);
        console.log('FormulationState objeto:', updatedEntity.formulationState);
        this.toastr.success('Estado de formulación actualizado correctamente.', 'Éxito');
        this.showChangeStateModal = false;
        this.activeFormulation = updatedEntity;
        
        // En lugar de usar name directamente, buscar en el array de estados disponibles
        const currentState = this.formulationStateOptions.find(
          state => state.idFormulationState === updatedEntity.formulationState?.idFormulationState
        );
        this.currentFormulationStateLabel = currentState?.name ?? null;
        console.log('Estado encontrado en array:', currentState);
        console.log('Nuevo estado label:', this.currentFormulationStateLabel);
        // Sincronizar el estado seleccionado con el de la formulación activa
        this.selectedFormulationState = updatedEntity.formulationState?.idFormulationState ?? null;
        // También actualiza la formulación en la lista `foundFormulations`
        const index = this.foundFormulations.findIndex(f => f.idFormulation === updatedEntity.idFormulation);
        if (index !== -1) {
          this.foundFormulations[index] = updatedEntity;
        }
        this.formulationUpdated.emit(this.activeFormulation);
      },
      error: (err) => {
        this.toastr.error('Error al cambiar el estado de formulación.', 'Error');
        console.error('Error updating formulation state:', err);
      },
    });
  }
}