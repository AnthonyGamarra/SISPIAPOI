import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Accion {
  id: number;
  nombre: string;
}

interface Objetivo {
  id: number;
  nombre: string;
  acciones: Accion[];
}

@Component({
  selector: 'app-tabla',
  templateUrl: './tabla.component.html',
  styleUrls: ['./tabla.component.scss'],
  imports: [CommonModule, FormsModule ]
})
export class TablaComponent {
  @Input() mostrar = false; // Para mostrar u ocultar la tabla
  @Output() seleccionCambio = new EventEmitter<Accion>();

  // Datos fijos para el ejemplo
  objetivos: Objetivo[] = [
    {
      id: 1,
      nombre: 'O.E.1 Proteger Financieramente las Prestaciones que se brindan a los Asegurados garantizando una gestión eficiente de los recursos',
      acciones: [
        { id: 11, nombre: 'A.E.1.1 Gestión oportuna y eficiente de los recursos para financiar los servicios institucionales' },
        { id: 12, nombre: 'A.E.1.2 Manejo eficiente de los gastos institucionales' }
      ]
    },
    {
      id: 2,
      nombre: 'O.E.2 Brindar a los asegurados acceso oportuno a prestaciones integrales y de calidad acorde a sus necesidades',
      acciones: [
        { id: 21, nombre: 'A.E.2.1 Mejora del modelo de atención integral diferenciado por ciclo de vida, con asegurados empoderados en sus derechos y deberes' },
        { id: 22, nombre: 'A.E.2.2 Estándares de calidad alineados a las expectativas y necesidades de los asegurados' },
        { id: 23, nombre: 'A.E.2.3 Articulación efectiva de la red inter e intrainstitucional al servicio del asegurado'}
      ]
    },
    {
      id: 3,
      nombre: 'Objetivo 3',
      acciones: [
        { id: 24, nombre: 'Acción estratégica 1' },
        { id: 25, nombre: 'Acción estratégica 2' }
      ]
    },
      {
      id: 4,
      nombre: 'Objetivo 4',
      acciones: [
        { id: 26, nombre: 'Acción estratégica 1' },
        { id: 27, nombre: 'Acción estratégica 2' }
      ]
    },
  ];

  opcionSeleccionadaId: number | null = null;

  onSeleccionar(id: number) {
    this.opcionSeleccionadaId = id;
    const accionSeleccionada = this.objetivos
      .flatMap(o => o.acciones)
      .find(a => a.id === id);
    if (accionSeleccionada) {
      this.seleccionCambio.emit(accionSeleccionada);
    }
  }
}
