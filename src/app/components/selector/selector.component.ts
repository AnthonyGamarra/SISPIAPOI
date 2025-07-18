// selector.component.ts

import { Component, EventEmitter, OnInit, Output, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastrService } from 'ngx-toastr';
import { AnimationOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { FileUpload } from 'primeng/fileupload'; // Importante para ViewChild

import { AuthService } from '../../core/services/authentication/auth.service';
import { DependencyService } from '../../core/services/logic/dependency.service';
import { FormulationService } from '../../core/services/logic/formulation.service';
import { StrategicObjectiveService } from '../../core/services/logic/strategic-objective.service';
import { FormulationStateService } from '../../core/services/logic/formulation-state.service';
import { FormulationSupportFileService } from '../../core/services/logic/formulation-support-file.service';

import { Formulation } from '../../models/logic/formulation.model';
import { Dependency } from '../../models/logic/dependency.model';
import { FormulationState } from '../../models/logic/formulationState.model';
import { MinMaxYears } from '../../models/logic/min-max-years.model';
import { FormulationSupportFile } from '../../models/logic/formulationSupportFile.model';

import { SafeUrlPipe } from '../../safe-url.pipe'; // Asegúrate de la ruta correcta


@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    ButtonModule,
    LottieComponent,
    InputTextModule,
    DialogModule,
    FileUploadModule,
    SafeUrlPipe 
  ],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss'],
})
export class SelectorComponent implements OnInit {
  @Output() buscar = new EventEmitter<{
    ano: string | null;
    dependencia: string | null;
    idFormulation: number | null;
  }>();
  @Output() cambioAno = new EventEmitter<string | null>();

  @Output() formulationSelected = new EventEmitter<Formulation>();
  @Output() formulationUpdated = new EventEmitter<Formulation>();

  private toastr = inject(ToastrService);
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
    this.isAdmin = this.authService.hasRole(['ADMIN', 'UPLANEAMIENTO', 'GPLANEAMIENTO']);
    this.loadYearsAndDependencies();
    this.loadFormulationStates();
  }

  loadYearsAndDependencies(): void {
    this.strategicObjectiveService.getMinMaxYears().subscribe({
      next: (yearsRange: MinMaxYears) => {
        if (yearsRange.minYear !== null && yearsRange.maxYear !== null) {
          this.optionsAno = [];
          for (let i = yearsRange.minYear; i <= yearsRange.maxYear; i++) {
            this.optionsAno.push({ label: i.toString(), value: i.toString() });
          }
          const currentYear = new Date().getFullYear().toString();
          if (this.optionsAno.some((opt) => opt.value === currentYear)) {
            this.selectedAno = currentYear;
          } else if (this.optionsAno.length > 0) {
            this.selectedAno = yearsRange.maxYear.toString();
          }
        } else {
          this.toastr.info(
            'No se encontraron años de formulación. Se mostrará un rango predeterminado.',
            'Información'
          );
          this.optionsAno = Array.from({ length: 5 }, (_, i) => {
            const year = (new Date().getFullYear() + i).toString();
            return { label: year, value: year };
          });
          this.selectedAno = new Date().getFullYear().toString();
        }
        this.loadDependencies();
      },
      error: (err) => {
        this.toastr.error(
          'Error al cargar el rango de años de formulación.',
          'Error de Carga'
        );
        console.error('Error fetching min/max years:', err);
        this.optionsAno = Array.from({ length: 5 }, (_, i) => {
          const year = (new Date().getFullYear() + i).toString();
          return { label: year, value: year };
        });
        this.selectedAno = new Date().getFullYear().toString();
        this.loadDependencies();
      },
    });
  }

  loadDependencies(): void {
    this.dependencyService.getAll().subscribe((dependencies) => {
      let filteredDependencies: Dependency[];

      if (this.isAdmin) {
        filteredDependencies = dependencies;
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
        filteredDependencies = dependencies.filter((dep) =>
          dependencyIds.includes(dep.idDependency!)
        );
      }

      this.isSingleDependency = filteredDependencies.length === 1;

      this.dependencyOptions = filteredDependencies.map((dep) => ({
        label: dep.name,
        value: dep.idDependency!.toString(),
      }));

      if (this.isSingleDependency) {
        this.selectedDependency = this.dependencyOptions[0]?.value;
      } else if (this.isAdmin && this.dependencyOptions.length > 0) {
        this.selectedDependency = null;
      }

      if (this.selectedAno && this.selectedDependency) {
        this.verificarFormulacion();
      }
    });
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
    this.cambioAno.emit(this.selectedAno);

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

    if (!this.selectedAno || !this.selectedDependency) {
      return;
    }

    this.checkingFormulation = true;

    const year = Number(this.selectedAno);
    const depId = Number(this.selectedDependency);

    this.formulationService.searchByDependencyAndYear(depId, year).subscribe({
      next: (formulations) => {
        this.foundFormulations = formulations;
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
        } else {
          this.idFormulation = null;
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
        this.currentFormulationStateLabel = null;
        this.activeFormulation = null;
        this.hasSupportFile = false;
        this.supportFileMetadata = null;
      },
    });
  }

  onModificationChange(): void {
    if (this.selectedModificationOption) {
      const selectedFormulation = this.foundFormulations.find(
        (f) => f.modification === this.selectedModificationOption!.value
      );
      if (selectedFormulation) {
        this.idFormulation = selectedFormulation.idFormulation ?? null;
        this.quarterLabel = this.getQuarterLabel(selectedFormulation.quarter);
        this.currentFormulationStateLabel =
          selectedFormulation.formulationState?.name ?? null;
        this.selectedFormulationState =
          selectedFormulation.formulationState?.idFormulationState ?? null;
        this.activeFormulation = selectedFormulation;

        this.checkSupportFile(this.idFormulation);

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

  checkSupportFile(idFormulation: number | null): void {
    if (idFormulation === null) {
      this.hasSupportFile = false;
      this.supportFileMetadata = null;
      return;
    }
    this.fileService.getById(idFormulation).subscribe({
      next: (file) => {
        if (file && file.idFormulationSupportFile) {
          this.hasSupportFile = true;
          this.supportFileMetadata = file;
        } else {
          this.hasSupportFile = false;
          this.supportFileMetadata = null;
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.hasSupportFile = false;
          this.supportFileMetadata = null;
        } else {
          this.toastr.error('Error al verificar el archivo de soporte.', 'Error');
          this.hasSupportFile = false;
          this.supportFileMetadata = null;
          console.error('Error fetching support file:', err);
        }
      }
    });
  }

  onFileSelect(event: any) {
    const file = event.files[0];
    if (file && this.idFormulation !== null) {
      this.fileUploading = true;
      this.fileService.updateFile(this.idFormulation, file).subscribe({
        next: () => {
          this.toastr.success('Archivo subido correctamente.', 'Éxito');
          this.fileUploading = false;
          this.checkSupportFile(this.idFormulation);
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
    if (file && this.idFormulation !== null) {
      this.fileUploading = true;
      this.fileService.updateFile(this.idFormulation, file).subscribe({
        next: () => {
          this.toastr.success('Archivo actualizado correctamente.', 'Éxito');
          this.fileUploading = false;
          this.checkSupportFile(this.idFormulation);
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
          
          const isViewable = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'].includes(fileDto.fileExtension);

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

    const formulationToUpdate: Formulation = {
      ...this.activeFormulation,
      formulationState: selectedState,
    };

    this.formulationService.update(formulationToUpdate).subscribe({
      next: (updatedEntity) => {
        this.toastr.success('Estado de formulación actualizado correctamente.', 'Éxito');
        this.showChangeStateModal = false;

        // === CORRECCIÓN AQUÍ: ACTUALIZAR DIRECTAMENTE LAS PROPIEDADES ===
        this.activeFormulation = updatedEntity;
        this.currentFormulationStateLabel = updatedEntity.formulationState?.name ?? null;

        // También actualiza la formulación en la lista `foundFormulations`
        const index = this.foundFormulations.findIndex(f => f.idFormulation === updatedEntity.idFormulation);
        if (index !== -1) {
          this.foundFormulations[index] = updatedEntity;
        }
        
        // Emite el evento con la formulación actualizada
        this.formulationUpdated.emit(this.activeFormulation);

        // NO SE NECESITA llamar a verificarFormulacion() aquí
        // ya que los datos de la UI se han actualizado manualmente
      },
      error: (err) => {
        this.toastr.error('Error al cambiar el estado de formulación.', 'Error');
        console.error('Error updating formulation state:', err);
      },
    });
  }
}