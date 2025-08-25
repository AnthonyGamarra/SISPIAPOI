import { Component, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { SelectorSocialesComponent } from '../../components/main-components/selector-sociales/selector-sociales.component';
import { FormulacionTablaComponent } from '../../components/main-components/formulacion-tabla/formulacion-tabla.component';
import { Formulation } from '../../models/logic/formulation.model';
import { FormulationService } from '../../core/services/logic/formulation.service';
import { FormulacionSocialesOdTablaComponent } from '../../components/main-components/formulacion-sociales-od-tabla/formulacion-sociales-od-tabla.component';

@Component({
  selector: 'app-formulacion-oodd-sociales',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    SelectorSocialesComponent,
    FormulacionSocialesOdTablaComponent,
  ],
  templateUrl: './formulacion-oodd-sociales.component.html',
  styleUrl: './formulacion-oodd-sociales.component.scss',
})
export class FormulacionOoddSocialesComponent {
  // We still keep ViewChild, but its direct manipulation will be minimized
  @ViewChild(FormulacionSocialesOdTablaComponent) formulacionSocialesOdTablaComponent!: FormulacionSocialesOdTablaComponent;

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
      ano?: string | null; // Made optional as `formulation` might carry it
      dependencia?: string | null; // Made optional
      idFormulation?: number | null; // Made optional
    } | Formulation | undefined | null, // Can receive either the event object, a full Formulation, or undefined/null
    formulation?: Formulation | null // For direct Formulation object
  ): void {
    console.log('manejarBusqueda llamado con event:', event, 'formulation:', formulation);
    let selectedFormulation: Formulation | null = null;

    // Handle explicit undefined/null cases (when selector clears the formulation)
    if (event === undefined || event === null) {
      console.log('Evento nulo/undefined - limpiando formulación');
      // Force change detection by temporarily setting to a different value
      this.currentFormulation = {} as any; // Temporary non-null value
      this.cdr.detectChanges(); // Force first change detection
      
      // Use setTimeout to trigger change detection in next cycle
      setTimeout(() => {
        this.currentFormulation = null;
        this.cdr.detectChanges(); // Force second change detection
      }, 0);
      return;
    }

    // Determine if `event` is a full `Formulation` object or the intermediate `{ano, dependencia, idFormulation}`
    if (event && (event as Formulation).idFormulation) {
        selectedFormulation = event as Formulation;
        // Para prestaciones sociales, verificar que la dependencia tenga social = true
        if (selectedFormulation.dependency?.social !== true) {
          this.currentFormulation = null;
          return;
        }
        // Update selected year and dependency from formulation
        this.selectedYear = selectedFormulation.year?.toString() || null;
        this.selectedDependency = selectedFormulation.dependency?.idDependency?.toString() || null;
    } else if (formulation && (formulation as Formulation).idFormulation) {
        selectedFormulation = formulation as Formulation;
        // Para prestaciones sociales, verificar que la dependencia tenga social = true
        if (selectedFormulation.dependency?.social !== true) {
          this.currentFormulation = null;
          return;
        }
        // Update selected year and dependency from formulation
        this.selectedYear = selectedFormulation.year?.toString() || null;
        this.selectedDependency = selectedFormulation.dependency?.idDependency?.toString() || null;
    } else if (event && (event as any).idFormulation) {
        // This handles the original `buscar` event structure
        this.selectedYear = (event as any).ano;
        this.selectedDependency = (event as any).dependencia;
        selectedFormulation = {
            idFormulation: (event as any).idFormulation,
            year: (event as any).ano ? parseInt((event as any).ano, 10) : undefined,
            dependency: (event as any).dependencia ? { idDependency: parseInt((event as any).dependencia, 10) } as any : undefined,
            // You might need to fetch the full object if only ID is available
            // For now, let's assume the Selector sends the full object if available
        } as Formulation;
    } else {
        // If event has ano/dependencia but no formulation, still store the selections
        if (event && (event as any).ano !== undefined) {
            this.selectedYear = (event as any).ano;
        }
        if (event && (event as any).dependencia !== undefined) {
            this.selectedDependency = (event as any).dependencia;
        }
    }

    if (!selectedFormulation?.idFormulation) {
      // If no valid formulation is selected or created, clear formulation but keep selections
      console.log('No se encontró formulación válida');
      this.currentFormulation = null;
      return;
    }
    console.log('Estableciendo formulación seleccionada:', selectedFormulation);
    this.currentFormulation = selectedFormulation;
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
      // Para prestaciones sociales, verificar que la dependencia tenga social = true
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
    if (data.ano !== undefined) {
      this.selectedYear = data.ano;
      console.log('Año cambiado a:', this.selectedYear);
      // Clear table when year changes to avoid showing old data
      this.limpiarTabla();
    }
    if (data.dependencia !== undefined) {
      this.selectedDependency = data.dependencia;
      console.log('Dependencia cambiada a:', this.selectedDependency);
      // Clear table when dependency changes to avoid showing old data
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
        
        // Para prestaciones sociales, buscar formulaciones de dependencias con social = true
        // No filtrar por formulationType ya que puede ser null
        const socialFormulations = formulations.filter(f => {
          // Verificar si la dependencia tiene social = true
          const isSocialDependency = f.dependency?.social === true;
          console.log(`Formulación ${f.idFormulation} - dependencia social: ${isSocialDependency}`);
          return isSocialDependency;
        });

        console.log('Formulaciones sociales filtradas:', socialFormulations);

        if (socialFormulations.length > 0) {
          // Ordenar por modificación para obtener la más reciente
          const sortedFormulations = socialFormulations.sort((a, b) => 
            (b.modification || 0) - (a.modification || 0)
          );
          console.log('Formulación seleccionada:', sortedFormulations[0]);
          this.currentFormulation = sortedFormulations[0];
        } else {
          // No se encontró formulación
          console.log('No se encontraron formulaciones sociales');
          this.currentFormulation = null;
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