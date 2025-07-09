import { Component } from '@angular/core';
import { Form9DataService } from '../../core/services/logic/form9-data.service';

@Component({
  selector: 'app-guardadof9',
  imports: [],
  templateUrl: './guardadof9.component.html',
  styleUrl: './guardadof9.component.scss'
})
export class Guardadof9Component {
  constructor(private form9DataService: Form9DataService) {}

  capturarDatosForm9() {
    const datos = this.form9DataService.getData();
    console.log('Datos capturados de Form9:', datos);
    // Aquí puedes agregar la lógica para guardar o procesar los datos
  }
}
