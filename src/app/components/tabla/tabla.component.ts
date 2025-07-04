import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { StrategicobjectiveService } from '../../core/services/logic/strategicobjective.service';
import { StrategicActionService } from '../../core/services/logic/strategic-action.service';
import { StrategicObjective } from '../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../models/logic/strategicAction.model';

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
  imports: [CommonModule, FormsModule, DropdownModule]
})
export class TablaComponent implements OnInit, OnChanges {
  @Input() mostrar = false; // Para mostrar u ocultar la tabla
  @Input() ano: string | null = null; // Nuevo input para el año
  @Output() seleccionCambio = new EventEmitter<Accion>();

  objetivos: { id: number; nombre: string; acciones: { id: number; nombre: string }[] }[] = [];
  opcionSeleccionadaId: number | null = null;

  constructor(
    private strategicObjectiveService: StrategicobjectiveService,
    private strategicActionService: StrategicActionService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ano'] && !changes['ano'].firstChange) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    this.strategicObjectiveService.getAll().subscribe((objectives: StrategicObjective[]) => {
      this.strategicActionService.getAll().subscribe((actions: StrategicAction[]) => {
        let filteredObjectives = objectives;
        if (this.ano) {
          const year = parseInt(this.ano, 10);
          filteredObjectives = objectives.filter(obj => year >= obj.startYear && year <= obj.endYear);
        }
        this.objetivos = filteredObjectives.map(obj => ({
          id: obj.idStrategicObjective,
          nombre: obj.name,
          acciones: actions
            .filter(a => a.strategicObjective && a.strategicObjective.idStrategicObjective === obj.idStrategicObjective)
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
