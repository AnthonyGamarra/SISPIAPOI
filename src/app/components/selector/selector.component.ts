import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown'; // Cambiado de SelectModule a DropdownModule
import { ButtonModule } from 'primeng/button';
import { ToastrService } from 'ngx-toastr';
import { AnimationOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';
import { InputTextModule } from 'primeng/inputtext'; // Importar para el campo de trimestre

import { DependencyService } from '../../core/services/logic/dependency.service';
import { FormulationService } from '../../core/services/logic/formulation.service';
import { Formulation } from '../../models/logic/formulation.model';
import { Dependency } from '../../models/logic/dependency.model';
import { FormulationState } from '../../models/logic/formulationState.model';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule, // Usar DropdownModule
    ButtonModule,
    LottieComponent,
    InputTextModule // Añadir InputTextModule
  ],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent implements OnInit {
  @Output() buscar = new EventEmitter<{ ano: string | null; dependencia: string | null; idFormulation: number | null }>();
  @Output() cambioAno = new EventEmitter<string | null>();

  private toastr = inject(ToastrService);
  private formulationService = inject(FormulationService);
  private dependencyService = inject(DependencyService);

  dependencyOptions: { label: string; value: string }[] = [];
  selectedDependency: string | null = null;
  selectedAno: string | null = null;
  idFormulation: number | null = null;

  isSingleDependency = false;
  formulationExists = false;
  checkingFormulation = false;
  showSuccessAnimation = false;

  foundFormulations: Formulation[] = []; // Para almacenar todas las formulaciones encontradas
  modificationOptions: { label: string; value: number }[] = []; // Opciones para el filtro de modificación
  selectedModificationOption: { label: string; value: number } | null = null; // Selección actual del filtro de modificación
  quarterLabel: string | null = null; // Etiqueta para mostrar el trimestre

  optionsAno = Array.from({ length: 14 }, (_, i) => {
    const year = (2025 + i).toString();
    return { label: year, value: year };
  });

  options: AnimationOptions = {
    path: 'resources/succes-allert.json'
  };

  ngOnInit(): void {
    const dependencyIds: number[] = JSON.parse(localStorage.getItem('dependencies') || '[]');

    if (dependencyIds.length === 0) return;

    this.dependencyService.getAll().subscribe(dependencies => {
      const filtered = dependencies.filter(dep => dependencyIds.includes(dep.idDependency!));
      this.isSingleDependency = filtered.length === 1;

      this.dependencyOptions = filtered.map(dep => ({
        label: dep.name,
        value: dep.idDependency!.toString()
      }));

      this.selectedDependency = this.isSingleDependency ? this.dependencyOptions[0]?.value : null;

      if (this.selectedAno && this.selectedDependency) {
        this.verificarFormulacion();
      }
    });
  }

  verificarFormulacion() {
    this.cambioAno.emit(this.selectedAno); // Esto sigue siendo solo para limpiar la tabla

    // Reiniciar estados relacionados con la formulación al cambiar año/dependencia
    this.formulationExists = false;
    this.idFormulation = null;
    this.foundFormulations = [];
    this.modificationOptions = [];
    this.selectedModificationOption = null;
    this.quarterLabel = null;


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
          // Ordenar por modificación de forma descendente para que la última sea la primera opción
          this.foundFormulations.sort((a, b) => (b.modification || 0) - (a.modification || 0));

          // Mapear formulaciones a opciones de dropdown de modificación
          this.modificationOptions = this.foundFormulations.map(f => ({
            label: this.getModificationLabel(f.modification),
            value: f.modification!
          }));

          // Seleccionar la primera opción (la más reciente por el sort)
          this.selectedModificationOption = this.modificationOptions[0] || null;
          this.onModificationChange(); // Actualizar idFormulation y quarterLabel con la selección predeterminada

        } else {
          this.idFormulation = null; // No hay formulación existente
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
      }
    });
  }

  onModificationChange(): void {
    if (this.selectedModificationOption) {
      const selectedFormulation = this.foundFormulations.find(
        f => f.modification === this.selectedModificationOption!.value
      );
      if (selectedFormulation) {
        this.idFormulation = selectedFormulation.idFormulation ?? null;
        this.quarterLabel = this.getQuarterLabel(selectedFormulation.quarter);
      } else {
        this.idFormulation = null;
        this.quarterLabel = null;
      }
    } else {
      this.idFormulation = null;
      this.quarterLabel = null;
    }
  }

  getModificationLabel(modification?: number): string {
    if (modification === undefined || modification === null) return '';
    if (modification === 1) return 'Formulación Inicial';
    if (modification === 2) return 'Primera Modificación';
    if (modification === 3) return 'Segunda Modificación';
    if (modification === 4) return 'Tercera Modificación';
    if (modification === 5) return 'Cuarta Modificación';
    // Puedes añadir más casos o una lógica genérica si hay muchas modificaciones
    return `Modificación ${modification}`;
  }

  getQuarterLabel(quarter?: number): string {
    if (quarter === undefined || quarter === null) return '';
    switch (quarter) {
      case 1: return 'I Trimestre';
      case 2: return 'II Trimestre';
      case 3: return 'III Trimestre';
      case 4: return 'IV Trimestre';
      default: return `Trimestre ${quarter}`;
    }
  }

  onBuscar() {
    if (!this.selectedAno || !this.selectedDependency) {
      this.toastr.warning('Por favor, seleccione año y dependencia.', 'Formulario inválido');
      return;
    }

    if (this.formulationExists) {
      // Si hay formulaciones existentes, se debe haber seleccionado una modificación,
      // y idFormulation ya estará actualizado por onModificationChange
      if (this.idFormulation) {
        this.buscar.emit({
          ano: this.selectedAno,
          dependencia: this.selectedDependency,
          idFormulation: this.idFormulation
        });
      } else {
        this.toastr.warning('Por favor, seleccione una modificación para la formulación existente.', 'Selección Requerida');
      }
      return;
    }

    // Crear nueva formulación
    const nuevaFormulacion: Formulation = {
      year: Number(this.selectedAno),
      dependency: { idDependency: Number(this.selectedDependency) } as Dependency,
      formulationState: { idFormulationState: 1 } as FormulationState,
      active: true,
      modification: 1, // La primera vez siempre es modificación 1
      quarter: 1 // Asumimos que la creación inicial es en el trimestre 1, ajustar si es diferente
    };

    this.formulationService.create(nuevaFormulacion).subscribe({
      next: (nueva) => {
        this.formulationExists = true;
        this.idFormulation = nueva.idFormulation ?? null;
        // Recargar formulaciones para incluir la recién creada y actualizar el filtro
        this.verificarFormulacion();

        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
          this.buscar.emit({
            ano: this.selectedAno,
            dependencia: this.selectedDependency,
            idFormulation: this.idFormulation
          });
        }, 2500);
      },
      error: () => {
        this.toastr.error('Error al crear la formulación.', 'Error');
      }
    });

  }

}