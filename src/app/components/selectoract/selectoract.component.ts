import { ManagementCenterService } from '../../core/services/logic/management-center.service';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DependencyService } from '../../core/services/logic/dependency.service';
import { OperationalActivityService } from '../../core/services/logic/operational-activity.service';
import { FormulationService } from '../../core/services/logic/formulation.service';
import { OperationalActivity } from '../../models/logic/operationalActivity.model';

@Component({
  selector: 'app-selectoract',
  standalone: true,
  imports: [CommonModule, DropdownModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './selectoract.component.html',
  styleUrl: './selectoract.component.scss'
})

export class SelectoractComponent implements OnInit {
  dependencyOptions: { label: string; value: string }[] = [];
  selectedDependency: string | null = null;
  optionsAno: { label: string; value: string }[] = [];
  selectedAno: string | null = null;
  activityOptions: { label: string; value: number }[] = [];
  selectedActivityId: number | null = null;

  // Management Center
  managementCenterOptions: { label: string; value: number }[] = [];
  selectedManagementCenterId: number | null = null;

  // Modificación
  formulationExists: boolean = false;
  foundFormulations: any[] = [];
  modificationOptions: { label: string; value: number }[] = [];
  selectedModificationOption: number | null = null;

  @Output() buscar = new EventEmitter<{ idOperationalActivity: number | null, modificationId?: number | null }>();

  constructor(
    private dependencyService: DependencyService,
    private operationalActivityService: OperationalActivityService,
    private formulationService: FormulationService,
    private managementCenterService: ManagementCenterService
  ) {}

  ngOnInit(): void {
    this.cargarDependencias();
    this.cargarAnios();
  }

  cargarDependencias(): void {
    this.dependencyService.getAll().subscribe({
      next: deps => {
        this.dependencyOptions = deps.map(dep => ({
          label: dep.name,
          value: dep.idDependency!.toString()
        }));
        // No se debe setear selectedActivityId aquí, solo en el dropdown de actividad
        this.actualizarActividades();
      },
      error: () => {
        this.dependencyOptions = [];
        this.selectedDependency = null;
        this.activityOptions = [];

      }

    });
  }

  cargarAnios(): void {
    this.formulationService.getAll().subscribe({
      next: formulaciones => {
        // Obtener años únicos y ordenarlos ascendentemente
        const years = Array.from(new Set(formulaciones.map(f => f.year?.toString()))).filter(y => !!y).sort((a, b) => Number(a) - Number(b));
        this.optionsAno = years.map(year => ({ label: year!, value: year! }));
        this.selectedAno = this.optionsAno[0]?.value || null;
        this.actualizarActividades();
      },
      error: () => {
        this.optionsAno = [];
        this.selectedAno = null;
        this.activityOptions = [];

      }
    });
  }

  actualizarActividades(): void {
    if (!this.selectedAno || !this.selectedDependency) {
      this.activityOptions = [];
      this.modificationOptions = [];
      this.formulationExists = false;
      this.foundFormulations = [];
      return;
    }
    this.formulationService.searchByDependencyAndYear(Number(this.selectedDependency), Number(this.selectedAno)).subscribe({
      next: formulaciones => {
        this.foundFormulations = formulaciones || [];
        this.formulationExists = this.foundFormulations.length > 0;
        // Modificación dropdown
        this.modificationOptions = this.foundFormulations.map((f, idx) => ({
          label: f.modification != null ? `Modificación ${f.modification}` : `Formulación ${f.idFormulation}`,
          value: f.idFormulation
        }));
        // Si no hay modificación seleccionada, seleccionar la primera
        if (!this.selectedModificationOption || !this.modificationOptions.some(opt => opt.value === this.selectedModificationOption)) {
          this.selectedModificationOption = this.modificationOptions[0]?.value || null;
        }

        if (!formulaciones || formulaciones.length === 0) {
          this.activityOptions = [];
          this.managementCenterOptions = [];
          this.selectedManagementCenterId = null;
          return;
        }
        // Usar la formulación seleccionada en el dropdown de modificación
        const formulacion = this.foundFormulations.find(f => f.idFormulation === this.selectedModificationOption) || this.foundFormulations[0];
        this.operationalActivityService.searchByFormulation(formulacion.idFormulation!).subscribe({
          next: actividades => {
            if (!actividades || actividades.length === 0) {
              this.activityOptions = [];
              this.managementCenterOptions = [];
              this.selectedManagementCenterId = null;
            } else {
              this.activityOptions = actividades.map(act => ({
                label: act.name,
                value: act.idOperationalActivity!
              }));
              this.selectedActivityId = this.activityOptions[0]?.value || null;
              // Obtener management centers únicos de las actividades
              const uniqueCenters: { [id: number]: { label: string; value: number } } = {};
              actividades.forEach(act => {
                if (act.managementCenter && act.managementCenter.idManagementCenter != null) {
                  uniqueCenters[act.managementCenter.idManagementCenter] = {
                    label: act.managementCenter.name,
                    value: act.managementCenter.idManagementCenter
                  };
                }
              });
              this.managementCenterOptions = Object.values(uniqueCenters);
              this.selectedManagementCenterId = this.managementCenterOptions[0]?.value || null;
            }
          },
          error: () => {
            this.activityOptions = [];
            this.managementCenterOptions = [];
            this.selectedManagementCenterId = null;
          }
        });
      },

      error: () => {
        this.activityOptions = [];
        this.managementCenterOptions = [];
        this.selectedManagementCenterId = null;
        this.modificationOptions = [];
        this.formulationExists = false;
        this.foundFormulations = [];
      }
    });
  }

  onManagementCenterChange(event: any): void {
    this.selectedManagementCenterId = event && event.value !== undefined ? event.value : null;
    // Filtrar actividades según el centro de gestión seleccionado
    if (this.selectedManagementCenterId) {
      // Buscar la formulación seleccionada
      const formulacion = this.foundFormulations.find(f => f.idFormulation === this.selectedModificationOption);
      if (formulacion) {
        this.operationalActivityService.searchByFormulation(formulacion.idFormulation!).subscribe({
          next: actividades => {
            if (!actividades || actividades.length === 0) {
              this.activityOptions = [];
              this.selectedActivityId = null;
            } else {
              // Filtrar actividades por centro de gestión
              const filtradas = actividades.filter(act => act.managementCenter && act.managementCenter.idManagementCenter === this.selectedManagementCenterId);
              this.activityOptions = filtradas.map(act => ({
                label: act.name,
                value: act.idOperationalActivity!
              }));
              this.selectedActivityId = this.activityOptions[0]?.value || null;
            }
          },
          error: () => {
            this.activityOptions = [];
            this.selectedActivityId = null;
          }
        });
      }
    } else {
      // Si no hay centro de gestión seleccionado, mostrar todas las actividades de la modificación
      this.onModificationChange();
    }
  }

  emitirActividadSeleccionada(): void {
    this.buscar.emit({
      idOperationalActivity: this.selectedActivityId,
      modificationId: this.selectedModificationOption
    });
  }

  onActivityChange(event: any): void {
    this.selectedActivityId = event && event.value !== undefined ? event.value : null;
    this.emitirActividadSeleccionada();
  }

  onModificationChange(): void {
    // Al cambiar la modificación, recargar actividades y filtrar centros de gestión para esa formulación
    if (this.selectedModificationOption) {
      const formulacion = this.foundFormulations.find(f => f.idFormulation === this.selectedModificationOption);
      if (formulacion) {
        this.operationalActivityService.searchByFormulation(formulacion.idFormulation!).subscribe({
          next: actividades => {
            if (!actividades || actividades.length === 0) {
              this.activityOptions = [];
              this.managementCenterOptions = [];
              this.selectedManagementCenterId = null;
            } else {
              this.activityOptions = actividades.map(act => ({
                label: act.name,
                value: act.idOperationalActivity!
              }));
              this.selectedActivityId = this.activityOptions[0]?.value || null;
              // Filtrar centros de gestión asociados a las actividades de la modificación
              const uniqueCenters: { [id: number]: { label: string; value: number } } = {};
              actividades.forEach(act => {
                if (act.managementCenter && act.managementCenter.idManagementCenter != null) {
                  uniqueCenters[act.managementCenter.idManagementCenter] = {
                    label: act.managementCenter.name,
                    value: act.managementCenter.idManagementCenter
                  };
                }
              });
              this.managementCenterOptions = Object.values(uniqueCenters);
              this.selectedManagementCenterId = this.managementCenterOptions[0]?.value || null;
            }
          },
          error: () => {
            this.activityOptions = [];
            this.managementCenterOptions = [];
            this.selectedManagementCenterId = null;
          }
        });
      }
    }
  }
}
