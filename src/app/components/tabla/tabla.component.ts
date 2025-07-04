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
      nombre: 'Objetivo 1',
      acciones: [
        { id: 11, nombre: 'Acción estratégica 1' },
        { id: 12, nombre: 'Acción estratégica 2' }
      ]
    },
    {
      id: 2,
      nombre: 'Objetivo 2',
      acciones: [
        { id: 21, nombre: 'Acción estratégica 1' },
        { id: 22, nombre: 'Acción estratégica 2' }
      ]
    }
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
