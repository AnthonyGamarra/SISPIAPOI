import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastrService } from 'ngx-toastr';
import { AnimationOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';

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
    SelectModule,
    ButtonModule,
    LottieComponent
  ],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent implements OnInit {
  @Output() buscar = new EventEmitter<{ ano: string | null; dependencia: string | null }>();
  @Output() cambioAno = new EventEmitter<string | null>();

  private toastr = inject(ToastrService);
  private formulationService = inject(FormulationService);
  private dependencyService = inject(DependencyService);

  dependencyOptions: { label: string; value: string }[] = [];
  selectedDependency: string | null = null;
  selectedAno: string | null = null;

  isSingleDependency = false;
  formulationExists = false;
  checkingFormulation = false;
  showSuccessAnimation = false;

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
    this.cambioAno.emit(this.selectedAno); // <--- nuevo

    if (!this.selectedAno || !this.selectedDependency) {
      this.formulationExists = false;
      return;
    }

    this.checkingFormulation = true;

    const year = Number(this.selectedAno);
    const depId = Number(this.selectedDependency);

    this.formulationService.searchByDependencyAndYear(depId, year).subscribe({
      next: (formulations) => {
        this.formulationExists = formulations.length > 0;
        this.checkingFormulation = false;
      },
      error: () => {
        this.toastr.error('Error al verificar formulación.');
        this.checkingFormulation = false;
      }
    });
  }

  onBuscar() {
    if (!this.selectedAno || !this.selectedDependency) {
      this.toastr.warning('Por favor, seleccione año y dependencia.', 'Formulario inválido');
      return;
    }

    if (this.formulationExists) {
      this.buscar.emit({
        ano: this.selectedAno,
        dependencia: this.selectedDependency
      });
      return;
    }

    const nuevaFormulacion: Formulation = {
      year: Number(this.selectedAno),
      dependency: { idDependency: Number(this.selectedDependency) } as Dependency,
      formulationState: { idFormulationState: 1 } as FormulationState,
      active: true
    };

    this.formulationService.create(nuevaFormulacion).subscribe({
      next: () => {
        this.formulationExists = true;
        this.showSuccessAnimation = true;

        setTimeout(() => {
          this.showSuccessAnimation = false;
          this.buscar.emit({
            ano: this.selectedAno,
            dependencia: this.selectedDependency
          });
        }, 2500);
      },
      error: () => {
        this.toastr.error('Error al crear la formulación.', 'Error');
      }
    });
  }
}
