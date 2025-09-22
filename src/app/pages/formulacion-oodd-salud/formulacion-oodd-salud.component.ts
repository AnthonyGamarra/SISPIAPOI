import { Component, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { SelectorSaludComponent } from '../../components/main-components/selector-salud/selector-salud.component';
import { FormulacionTablaComponent } from '../../components/main-components/formulacion-tabla/formulacion-tabla.component';
import { Formulation } from '../../models/logic/formulation.model';
import { FormulationService } from '../../core/services/logic/formulation.service';
import { FormulacionSaludOdTablaComponent } from '../../components/main-components/formulacion-salud-od-tabla/formulacion-salud-od-tabla.component';

@Component({
  selector: 'app-formulacion-oodd-salud',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    SelectorSaludComponent,
    FormulacionSaludOdTablaComponent,
  ],
  templateUrl: './formulacion-oodd-salud.component.html',
  styleUrl: './formulacion-oodd-salud.component.scss',
})
export class FormulacionOoddSaludComponent {
  // We still keep ViewChild, but its direct manipulation will be minimized
  @ViewChild(FormulacionSaludOdTablaComponent) formulacionSaludOdTablaComponent!: FormulacionSaludOdTablaComponent;

  private cdr = inject(ChangeDetectorRef);
  private formulationService = inject(FormulationService);

  // We only need to manage the `currentFormulation` object directly
  // All other inputs for `FormulacionTablaComponent` will be derived from this.
  currentFormulation: Formulation | null = null;
  
  // Store selected year and dependency independently of formulation
  selectedYear: string | null = null;
  selectedDependency: string | null = null;

  /**
   * Called when the year is changed in the selector, indicating a need to clear the table.
   */
  limpiarTabla(): void {
    this.currentFormulation = null; // Clear the formulation object
    // Keep selectedYear and selectedDependency as they represent current selection
  }

  /**
   * Handles the 'buscar' event from the SelectorComponent.
   * This event should ideally pass the full Formulation object, or enough data to fetch it.
   *
   * @param event The data emitted by the selector.
   * If `formulationSelected` is used, the event itself is the Formulation object.
   * If `buscar` is used, it contains `ano`, `dependencia`, `idFormulation`.
   * @param formulation (Optional) The full Formulation object if directly passed.
   */
  manejarBusqueda(
    event: {
      ano?: string | null;
      dependencia?: string | null;
      idFormulation?: number | null;
    } | Formulation | undefined | null,
    formulation?: Formulation | null
  ): void {
    console.log('manejarBusqueda llamado con event:', event, 'formulation:', formulation);
    let selectedFormulation: Formulation | null = null;

    // Limpia la formulación y fuerza el loader antes de procesar el nuevo evento
    this.currentFormulation = null;
    this.cdr.detectChanges();

    // Si el evento es nulo, solo limpia y retorna
    if (event === undefined || event === null) {
      console.log('Evento nulo/undefined - limpiando formulación');
      return;
    }

    // Determina si el evento es una formulación completa
    if (event && (event as Formulation).idFormulation) {
      selectedFormulation = event as Formulation;
      if (selectedFormulation.dependency?.social !== true) {
        return;
      }
      this.selectedYear = selectedFormulation.year?.toString() || null;
      this.selectedDependency = selectedFormulation.dependency?.idDependency?.toString() || null;
    } else if (formulation && (formulation as Formulation).idFormulation) {
      selectedFormulation = formulation as Formulation;
      if (selectedFormulation.dependency?.social !== true) {
        return;
      }
      this.selectedYear = selectedFormulation.year?.toString() || null;
      this.selectedDependency = selectedFormulation.dependency?.idDependency?.toString() || null;
    } else if (event && (event as any).idFormulation) {
      this.selectedYear = (event as any).ano;
      this.selectedDependency = (event as any).dependencia;
      selectedFormulation = {
        idFormulation: (event as any).idFormulation,
        year: (event as any).ano ? parseInt((event as any).ano, 10) : undefined,
        dependency: (event as any).dependencia ? { idDependency: parseInt((event as any).dependencia, 10) } as any : undefined,
      } as Formulation;
    } else {
      if (event && (event as any).ano !== undefined) {
        this.selectedYear = (event as any).ano;
      }
      if (event && (event as any).dependencia !== undefined) {
        this.selectedDependency = (event as any).dependencia;
      }
    }

    // Si no hay formulación válida, no asigna nada
    if (!selectedFormulation?.idFormulation) {
      console.log('No se encontró formulación válida');
      return;
    }
    // Asigna la formulación y fuerza el cambio visual
    setTimeout(() => {
      console.log('[PADRE] Asignando currentFormulation en manejarBusqueda:', selectedFormulation);
      this.currentFormulation = selectedFormulation;
      this.cdr.detectChanges();
    }, 0);
  }

  /**
   * Handles actions emitted from FormulacionTablaComponent.
   * @param accion The action data.
   */
  onSeleccionAccion(accion: any): void {
    console.log('Acción seleccionada desde la tabla:', accion);
    // You might want to react to this, e.g., show a detail view
  }

  /**
   * Handles when the selector updates a formulation (e.g., state change, or a new one is created).
   * This method ensures the `currentFormulation` input to the table is always up-to-date.
   * @param updatedFormulation The updated or newly created Formulation object.
   */
  onFormulationUpdated(updatedFormulation: Formulation): void {
    if (updatedFormulation && updatedFormulation.idFormulation) {
      // Para prestaciones salud, verificar que la dependencia tenga social = true
      if (updatedFormulation.dependency?.social !== true) {
        this.limpiarTabla();
        return;
      }
      this.currentFormulation = updatedFormulation; // Update the stored object
      this.selectedYear = updatedFormulation.year?.toString() || null;
      this.selectedDependency = updatedFormulation.dependency?.idDependency?.toString() || null;
    } else {
      this.limpiarTabla(); // If for some reason update is null or invalid, clear table.
    }
  }

  /**
   * NEW: Handles dependency and year selection changes from selector
   * This captures selections even when no formulation exists yet
   */
  onSelectorChange(data: { ano?: string | null; dependencia?: string | null }): void {
    console.log('onSelectorChange llamado con:', data);
    let limpiar = false;
    if (data.ano !== undefined) {
      if (this.selectedYear !== data.ano) {
        limpiar = true;
      }
      this.selectedYear = data.ano;
      console.log('Año cambiado a:', this.selectedYear);
    }
    if (data.dependencia !== undefined) {
      if (this.selectedDependency !== data.dependencia) {
        limpiar = true;
      }
      this.selectedDependency = data.dependencia;
      console.log('Dependencia cambiada a:', this.selectedDependency);
    }
    // Solo limpiar si realmente cambió año o dependencia
    if (limpiar) {
      this.limpiarTabla();
    }

    // Si tenemos tanto año como dependencia, buscar formulación automáticamente
    if (this.selectedYear && this.selectedDependency) {
      console.log('Iniciando búsqueda automática de formulación');
      this.buscarFormulacionAutomatica();
    }
  }

  /**
   * Busca automáticamente la formulación cuando se tienen año y dependencia
   */
  private buscarFormulacionAutomatica(): void {
    if (!this.selectedYear || !this.selectedDependency) {
      return;
    }

    const year = Number(this.selectedYear);
    const depId = Number(this.selectedDependency);

    console.log(`Buscando formulación para año: ${year}, dependencia: ${depId}`);

    this.formulationService.searchByDependencyAndYear(depId, year).subscribe({
      next: (formulations) => {
        console.log('Formulaciones encontradas:', formulations);
        
        // Para prestaciones salud, buscar formulaciones de dependencias con social = true
        // No filtrar por formulationType ya que puede ser null
        const socialFormulations = formulations.filter(f => {
          // Verificar si la dependencia tiene ospe = false
          const isSaludDependency = f.dependency?.ospe === false && f.formulationType?.idFormulationType === 3;
          console.log(`Formulación ${f.idFormulation} - dependencia salud: ${isSaludDependency}`);
          return isSaludDependency;
        });

        console.log('Formulaciones salud filtradas:', socialFormulations);

        if (socialFormulations.length > 0) {
          // Ordenar por modificación para obtener la más reciente
          const sortedFormulations = socialFormulations.sort((a, b) => 
            (b.modification || 0) - (a.modification || 0)
          );
          console.log('[PADRE] Asignando currentFormulation en buscarFormulacionAutomatica:', sortedFormulations[0]);
          this.currentFormulation = sortedFormulations[0];
          // Actualizar también los otros inputs para el hijo
          this.selectedYear = sortedFormulations[0].year?.toString() || null;
          this.selectedDependency = sortedFormulations[0].dependency?.idDependency?.toString() || null;
          this.cdr.detectChanges();
        } else {
          // No se encontró formulación
          console.log('[PADRE] No se encontraron formulaciones salud, asignando null a currentFormulation');
          this.currentFormulation = null;
          this.selectedYear = null;
          this.selectedDependency = null;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al buscar formulación:', err);
        this.currentFormulation = null;
      }
    });
  }

  activitiesCount: number = 0;

  onActivitiesCountChanged(count: number): void {
    this.activitiesCount = count;
  }

  onActivitiesCreated(activities: any[]): void {
    this.activitiesCount = activities.length;
  }
  
}