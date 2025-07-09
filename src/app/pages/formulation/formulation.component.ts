import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import { MenubarComponent } from '../../components/menubar/menubar.component';
import { SelectorComponent } from '../../components/selector/selector.component';
import { TablaComponent } from '../../components/tabla/tabla.component';
import { ActividadesComponent } from '../../components/actividades/actividades.component';

@Component({
  selector: 'app-formulation',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    SelectorComponent,
    TablaComponent,
    ActividadesComponent,
  ],
  templateUrl: './formulation.component.html',
  styleUrl: './formulation.component.scss'
})
export class FormulationComponent {
  anoSeleccionado: string | null = null;
  mostrarTabla = false;

  // Se llama apenas se cambia el año desde el selector
  limpiarTabla() {
    this.mostrarTabla = false;
    this.anoSeleccionado = null;
  }

  // Se llama cuando se presiona "Mostrar" o "Crear"
  manejarBusqueda(event: { ano: string | null; dependencia: string | null }) {
    if (!event.ano) return;

    this.anoSeleccionado = event.ano;

    // Mostrar la tabla después de un ciclo de vida
    setTimeout(() => {
      this.mostrarTabla = true;
    });
  }

  onSeleccionAccion(accion: any) {
    console.log('Acción seleccionada:', accion);
  }
}

