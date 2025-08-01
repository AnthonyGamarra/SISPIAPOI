import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { SelectorComponent } from '../../components/main-components/selector/selector.component';
import { FormulacionTablaComponent } from '../../components/main-components/formulacion-tabla/formulacion-tabla.component';
import { Formulation } from '../../models/logic/formulation.model';

@Component({
  selector: 'app-formulacion-central',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    SelectorComponent,
    FormulacionTablaComponent,
  ],
  templateUrl: './formulacion-central.component.html',
  styleUrl: './formulacion-central.component.scss',
})
export class FormulacionCentralComponent {
  // We still keep ViewChild, but its direct manipulation will be minimized
  @ViewChild(FormulacionTablaComponent) formulacionTablaComponent!: FormulacionTablaComponent;

  // We only need to manage the `currentFormulation` object directly
  // All other inputs for `FormulacionTablaComponent` will be derived from this.
  currentFormulation: Formulation | null = null;
  mostrarTabla = false; // Controls visibility of the table
  
  // NEW: Store selected year and dependency independently of formulation
  selectedYear: string | null = null;
  selectedDependency: string | null = null;

  /**
   * Called when the year is changed in the selector, indicating a need to clear the table.
   */
  limpiarTabla(): void {
    this.mostrarTabla = false; // Hide the table
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
    } | Formulation, // Can receive either the event object or a full Formulation
    formulation?: Formulation | null // For direct Formulation object
  ): void {
    let selectedFormulation: Formulation | null = null;

    // Determine if `event` is a full `Formulation` object or the intermediate `{ano, dependencia, idFormulation}`
    if (event && (event as Formulation).idFormulation) {
        selectedFormulation = event as Formulation;
        // Update selected year and dependency from formulation
        this.selectedYear = selectedFormulation.year?.toString() || null;
        this.selectedDependency = selectedFormulation.dependency?.idDependency?.toString() || null;
    } else if (formulation && (formulation as Formulation).idFormulation) {
        selectedFormulation = formulation as Formulation;
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
      this.currentFormulation = null;
      this.mostrarTabla = false;
      return;
    }
    this.currentFormulation = selectedFormulation;
    this.mostrarTabla = true;
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
      this.currentFormulation = updatedFormulation; // Update the stored object
      this.selectedYear = updatedFormulation.year?.toString() || null;
      this.selectedDependency = updatedFormulation.dependency?.idDependency?.toString() || null;
      this.mostrarTabla = true; // Ensure table is visible if a formulation is updated/created
    } else {
      this.limpiarTabla(); // If for some reason update is null or invalid, clear table.
    }
  }

  /**
   * NEW: Handles dependency and year selection changes from selector
   * This captures selections even when no formulation exists yet
   */
  onSelectorChange(data: { ano?: string | null; dependencia?: string | null }): void {
    if (data.ano !== undefined) {
      this.selectedYear = data.ano;
      // Clear table when year changes to avoid showing old data
      this.limpiarTabla();
    }
    if (data.dependencia !== undefined) {
      this.selectedDependency = data.dependencia;
      // Clear table when dependency changes to avoid showing old data
      this.limpiarTabla();
    }
  }

  activitiesCount: number = 0;

  onActivitiesCountChanged(count: number): void {
    this.activitiesCount = count;
  }
  
}