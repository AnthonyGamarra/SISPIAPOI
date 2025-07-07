import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';


@Component({
  selector: 'app-datoscabecera',
  imports: [TableModule],
  templateUrl: './datoscabecera.component.html',
  styleUrl: './datoscabecera.component.scss'
})
export class DatoscabeceraComponent {

  datos = [
    { etiqueta: 'Órgano desconcentrado', valor: '' },
    { etiqueta: 'Código de centro gestor', valor: '' },
    { etiqueta: 'Establecimiento de salud', valor: '' },
    { etiqueta: 'Actividad', valor: '' },
    { etiqueta: 'Prioridad', valor: '' }
  ];

}
