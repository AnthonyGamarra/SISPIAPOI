import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import { MenubarComponent } from '../../components/menubar/menubar.component';
import { SelectorComponent } from '../../components/selector/selector.component';
import { TablaComponent } from '../../components/tabla/tabla.component';

@Component({
  selector: 'app-formulation',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    SelectorComponent,
    TablaComponent
  ],
  templateUrl: './formulation.component.html',
  styleUrl: './formulation.component.scss'
})
export class FormulationComponent {
  anoSeleccionado: string | null = null;
  mostrarTabla = false;
  idFormulation: number | null = null;
  idDependencySeleccionado: string | null = null; // ¡NUEVA PROPIEDAD!

  // Se llama apenas se cambia el año desde el selector
  limpiarTabla() {
    this.mostrarTabla = false;
    this.anoSeleccionado = null;
    this.idDependencySeleccionado = null; // Limpiar también la dependencia
  }

  // Se llama cuando se presiona "Mostrar" o "Crear"
  manejarBusqueda(event: { ano: string | null; dependencia: string | null; idFormulation: number | null }) {
    if (!event.ano) return;

    this.anoSeleccionado = event.ano;
    this.idFormulation = event.idFormulation;
    this.idDependencySeleccionado = event.dependencia; // ¡ASIGNAR EL VALOR!

    // Mostrar la tabla después de un ciclo de vida
    setTimeout(() => {
      this.mostrarTabla = true;
    });
  }

  onSeleccionAccion(accion: any) {
    console.log('Acción seleccionada:', accion);
  }
}