import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { DependencyService } from '../../core/services/logic/dependency.service';
import { FormulationService } from '../../core/services/logic/formulation.service';

import { Formulation } from '../../models/logic/formulation.model';
import { Dependency } from '../../models/logic/dependency.model';
import { FormulationState } from '../../models/logic/formulationState.model';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [CommonModule, DropdownModule, FormsModule],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent implements OnInit {
  @Output() buscar = new EventEmitter<{ ano: string | null; dependencia: string | null }>();

  private toastr = inject(ToastrService);
  private formulationService = inject(FormulationService);

  dependencyOptions: { label: string; value: string }[] = [];
  selectedDependency: string | null = null;
  isSingleDependency = false;

  optionsAno = Array.from({ length: 14 }, (_, i) => {
    const year = (2025 + i).toString();
    return { label: year, value: year };
  });
  selectedAno: string | null = null;

  formulationExists = false;
  checkingFormulation = false;

  constructor(private dependencyService: DependencyService) {}

  ngOnInit() {
    const dependencyIds: number[] = JSON.parse(localStorage.getItem('dependencies') || '[]');

    if (dependencyIds.length === 0) {
      this.dependencyOptions = [];
      this.isSingleDependency = false;
      return;
    }

    this.dependencyService.getAll().subscribe(dependencies => {
      const filteredDeps = dependencies.filter(dep => dependencyIds.includes(dep.idDependency!));
      this.isSingleDependency = filteredDeps.length === 1;

      this.dependencyOptions = filteredDeps.map(dep => ({
        label: dep.name,
        value: dep.idDependency!.toString()
      }));

      this.selectedDependency = this.isSingleDependency ? this.dependencyOptions[0]?.value : null;

      this.verificarFormulacion();
    });
  }

  verificarFormulacion() {
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

    const dependencyId = Number(this.selectedDependency);
    const year = Number(this.selectedAno);

    const nuevaFormulacion: Formulation = {
      year: year,
      dependency: { idDependency: dependencyId } as Dependency,
      formulationState: { idFormulationState: 1 } as FormulationState,
      active: true
    };

    this.formulationService.create(nuevaFormulacion).subscribe({
      next: () => {
        this.toastr.success('Formulación creada exitosamente.', 'Éxito');
        this.buscar.emit({
          ano: this.selectedAno,
          dependencia: this.selectedDependency
        });
        this.formulationExists = true;
      },
      error: () => {
        this.toastr.error('Error al crear la formulación.', 'Error');
      }
    });
  }
}
