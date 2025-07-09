import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { StrategicObjectiveService } from '../../core/services/logic/strategic-objective.service';
import { StrategicActionService } from '../../core/services/logic/strategic-action.service';
import { StrategicObjective } from '../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../models/logic/strategicAction.model';

interface Accion {
  id?: number;
  nombre: string;
}

@Component({
  selector: 'app-tabla',
  templateUrl: './tabla.component.html',
  styleUrls: ['./tabla.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule]
})
export class TablaComponent implements OnChanges {
  @Input() mostrar = false;
  @Input() ano: string | null = null;
  @Output() seleccionCambio = new EventEmitter<Accion>();

  objetivos: { id?: number; nombre: string; acciones: { id?: number; nombre: string }[] }[] = [];
  opcionSeleccionadaId: number | null = null;

  constructor(
    private strategicObjectiveService: StrategicObjectiveService,
    private strategicActionService: StrategicActionService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    const cambioAno = changes['ano'] && !changes['ano'].firstChange;
    const cambioMostrar = changes['mostrar'];

    // Siempre limpiar si cambia el año o se oculta la tabla
    if (cambioAno || (cambioMostrar && !this.mostrar)) {
      this.opcionSeleccionadaId = null;
      this.objetivos = [];
    }

    // Cargar datos solo si mostrar = true y hay año definido
    if (this.mostrar && this.ano) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    const year = parseInt(this.ano!, 10);

    this.strategicObjectiveService.getAll().subscribe((objectives: StrategicObjective[]) => {
      this.strategicActionService.getAll().subscribe((actions: StrategicAction[]) => {
        const filteredObjectives = objectives.filter(
          obj => year >= obj.startYear && year <= obj.endYear
        );

        this.objetivos = filteredObjectives.map(obj => ({
          id: obj.idStrategicObjective,
          nombre: obj.name,
          acciones: actions
            .filter(a => a.strategicObjective?.idStrategicObjective === obj.idStrategicObjective)
            .map(a => ({ id: a.idStrategicAction, nombre: a.name }))
        })).filter(obj => obj.acciones.length > 0);
      });
    });
  }

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
