// src/app/selector/selector.component.ts
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastrService } from 'ngx-toastr';
import { AnimationOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';
import { InputTextModule } from 'primeng/inputtext';

import { AuthService } from '../../../core/services/authentication/auth.service'; // Import AuthService
import { DependencyService } from '../../../core/services/logic/dependency.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';
import { StrategicObjectiveService } from '../../../core/services/logic/strategic-objective.service';
import { Formulation } from '../../../models/logic/formulation.model';
import { Dependency } from '../../../models/logic/dependency.model';
import { FormulationState } from '../../../models/logic/formulationState.model';
import { MinMaxYears } from '../../../models/logic/min-max-years.model';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    ButtonModule,
    LottieComponent,
    InputTextModule
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
  private strategicObjectiveService = inject(StrategicObjectiveService);
  private authService = inject(AuthService); // Inject AuthService

  dependencyOptions: { label: string; value: string }[] = [];
  selectedDependency: string | null = null;
  selectedAno: string | null = null;
  idFormulation: number | null = null;

  isSingleDependency = false;
  formulationExists = false;
  checkingFormulation = false;
  showSuccessAnimation = false;

  foundFormulations: Formulation[] = [];
  modificationOptions: { label: string; value: number }[] = [];
  selectedModificationOption: { label: string; value: number } | null = null;
  quarterLabel: string | null = null;

  optionsAno: { label: string; value: string }[] = [];

  options: AnimationOptions = {
    path: 'resources/succes-allert.json'
  };

  isAdmin: boolean = false; // Initialize as false, will be set in ngOnInit

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN']); // Set isAdmin based on user role
    this.loadYearsAndDependencies();
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
          if (this.optionsAno.some(opt => opt.value === currentYear)) {
            this.selectedAno = currentYear;
          } else if (this.optionsAno.length > 0) {
            this.selectedAno = yearsRange.maxYear.toString();
          }
        } else {
          this.toastr.info('No se encontraron años de formulación. Se mostrará un rango predeterminado.', 'Información');
          this.optionsAno = Array.from({ length: 5 }, (_, i) => {
            const year = (new Date().getFullYear() + i).toString();
            return { label: year, value: year };
          });
          this.selectedAno = new Date().getFullYear().toString();
        }
        this.loadDependencies();
      },
      error: (err) => {
        this.toastr.error('Error al cargar el rango de años de formulación.', 'Error de Carga');
        console.error('Error fetching min/max years:', err);
        this.optionsAno = Array.from({ length: 5 }, (_, i) => {
          const year = (new Date().getFullYear() + i).toString();
          return { label: year, value: year };
        });
        this.selectedAno = new Date().getFullYear().toString();
        this.loadDependencies();
      }
    });
  }

  loadDependencies(): void {
    this.dependencyService.getAll().subscribe(dependencies => {
      let filteredDependencies: Dependency[];

      if (this.isAdmin) {
        // If admin, show all dependencies
        filteredDependencies = dependencies;
      } else {
        // If not admin, filter by user's assigned dependencies from local storage
        const dependencyIds: number[] = JSON.parse(localStorage.getItem('dependencies') || '[]');
        if (dependencyIds.length === 0) {
          this.toastr.warning('No se encontraron dependencias para el usuario.', 'Acceso Restringido');
          return;
        }
        filteredDependencies = dependencies.filter(dep => dependencyIds.includes(dep.idDependency!));
      }

      this.isSingleDependency = filteredDependencies.length === 1;

      this.dependencyOptions = filteredDependencies.map(dep => ({
        label: dep.name,
        value: dep.idDependency!.toString()
      }));

      // Automatically select the dependency if there's only one.
      // Admins will select manually from the full list.
      if (this.isSingleDependency) {
        this.selectedDependency = this.dependencyOptions[0]?.value;
      } else if (this.isAdmin && this.dependencyOptions.length > 0) {
        // Optional: If admin and you want to auto-select the first, you can keep this.
        // For now, I'll remove it to allow admin to always make a selection.
        this.selectedDependency = null;
      }


      if (this.selectedAno && this.selectedDependency) {
        this.verificarFormulacion();
      }
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
          this.foundFormulations.sort((a, b) => (b.modification || 0) - (a.modification || 0));

          this.modificationOptions = this.foundFormulations.map(f => ({
            label: this.getModificationLabel(f.modification),
            value: f.modification!
          }));

          this.selectedModificationOption = this.modificationOptions[0] || null;
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

    const nuevaFormulacion: Formulation = {
      year: Number(this.selectedAno),
      dependency: { idDependency: Number(this.selectedDependency) } as Dependency,
      formulationState: { idFormulationState: 1 } as FormulationState,
      active: true,
      modification: 1,
      quarter: 1
    };

    this.formulationService.create(nuevaFormulacion).subscribe({
      next: (nueva) => {
        this.formulationExists = true;
        this.idFormulation = nueva.idFormulation ?? null;
        this.verificarFormulacion();

        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showSuccessAnimation = false;
          this.buscar.emit({
            ano: this.selectedAno,
            dependencia: this.selectedDependency,
            idFormulation: this.idFormulation
          });
        }, 1000);
      },
      error: () => {
        this.toastr.error('Error al crear la formulación.', 'Error');
      }
    });
  }
}