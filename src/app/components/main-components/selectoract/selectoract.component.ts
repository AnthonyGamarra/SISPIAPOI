import { ManagementCenterService } from '../../../core/services/logic/management-center.service';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../../core/services/authentication/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DependencyService } from '../../../core/services/logic/dependency.service';
import { OperationalActivityService } from '../../../core/services/logic/operational-activity.service';
import { FormulationService } from '../../../core/services/logic/formulation.service';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';

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
  isAdmin: boolean = false;
  isSingleDependency: boolean = false;
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

  @Output() buscar = new EventEmitter<{ idOperationalActivity: number | null, idDependency?: number | null, modificationId?: number | null, actividad?: OperationalActivity | null }>();

  constructor(
    private dependencyService: DependencyService,
    private operationalActivityService: OperationalActivityService,
    private formulationService: FormulationService,
    private managementCenterService: ManagementCenterService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN', 'UPLANEAMIENTO', 'GPLANEAMIENTO']);
    this.cargarDependencias();
    this.cargarAnios();
  }

  cargarDependencias(): void {
    this.dependencyService.getAll().subscribe({
      next: dependencies => {
        let filteredDependencies: any[];
        if (this.isAdmin) {
          filteredDependencies = dependencies;
        } else {
          const dependencyIds: number[] = JSON.parse(localStorage.getItem('dependencies') || '[]');
          if (dependencyIds.length === 0) {
            // Si tienes toastr, descomenta la siguiente línea:
            // this.toastr.warning('No se encontraron dependencias para el usuario.', 'Acceso Restringido');
            this.dependencyOptions = [];
            this.selectedDependency = null;
            this.activityOptions = [];
            return;
          }
          filteredDependencies = dependencies.filter(dep => dependencyIds.includes(dep.idDependency!));
        }

        this.isSingleDependency = filteredDependencies.length === 1;
        this.dependencyOptions = filteredDependencies.map(dep => ({
          label: dep.name,
          value: dep.idDependency!.toString()
        }));

        if (this.isSingleDependency) {
          this.selectedDependency = this.dependencyOptions[0]?.value;
        } else if (this.isAdmin && this.dependencyOptions.length > 0) {
          this.selectedDependency = null;
        }

        if (this.selectedAno && this.selectedDependency) {
          this.actualizarActividades();
        }
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
        this.modificationOptions = this.foundFormulations
          .slice() // copiar
          .sort((a, b) => (b.modification ?? 0) - (a.modification ?? 0)) // mayor a menor
          .map(f => {
            let label = '';
            if (f.modification === 1) label = 'Inicial';
            else if (f.modification === 2) label = 'Primera Actualización';
            else if (f.modification === 3) label = 'Segunda Actualización';
            else if (f.modification === 4) label = 'Tercera Actualización';
            else if (f.modification > 4) label = `Modificación ${f.modification}`;
            else label = `Formulación ${f.idFormulation}`;
            return {
              label,
              value: f.idFormulation
            };
          });
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

  selectedActivity: OperationalActivity | null = null;

  emitirActividadSeleccionada(): void {
    // Buscar la actividad seleccionada en el array de actividades cargadas
    if (this.selectedActivityId && Array.isArray(this.activityOptions)) {
      // Buscar en el último fetch de actividades
      if (this.foundFormulations && this.selectedModificationOption) {
        const formulacion = this.foundFormulations.find(f => f.idFormulation === this.selectedModificationOption) || this.foundFormulations[0];
        if (formulacion) {
          this.operationalActivityService.searchByFormulation(formulacion.idFormulation!).subscribe({
            next: actividades => {
              this.selectedActivity = actividades.find((act: OperationalActivity) => act.idOperationalActivity === this.selectedActivityId) || null;
              this.buscar.emit({
                idOperationalActivity: this.selectedActivityId,
                idDependency: this.selectedDependency ? Number(this.selectedDependency) : null,
                modificationId: this.selectedModificationOption,
                actividad: this.selectedActivity
              });
            },
            error: () => {
              this.selectedActivity = null;
              this.buscar.emit({
                idOperationalActivity: this.selectedActivityId,
                idDependency: this.selectedDependency ? Number(this.selectedDependency) : null,
                modificationId: this.selectedModificationOption,
                actividad: null
              });
            }
          });
          return;
        }
      }
    }
    this.selectedActivity = null;
    this.buscar.emit({
      idOperationalActivity: this.selectedActivityId,
      idDependency: this.selectedDependency ? Number(this.selectedDependency) : null,
      modificationId: this.selectedModificationOption,
      actividad: null
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
