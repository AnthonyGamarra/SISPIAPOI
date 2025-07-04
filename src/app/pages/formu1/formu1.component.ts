import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import {MenubarComponent} from '../../components/menubar/menubar.component';
import {SelectorComponent} from '../../components/selector/selector.component';
import { TablaComponent } from '../../components/tabla/tabla.component';
import { FormComponent } from '../../components/form/form.component';

@Component({
  selector: 'app-formu1',
  imports: [CommonModule, FooterComponent, MenubarComponent,SelectorComponent, TablaComponent, FormComponent],
  templateUrl: './formu1.component.html',
  styleUrl: './formu1.component.scss'
})
export class Formu1Component {
  mostrarResultados = false;
  accionSeleccionada: any = null;

  manejarBusqueda(event: any) {
    this.mostrarResultados = true;
  }

  manejarSeleccion(accion: any) {
    this.accionSeleccionada = accion;
    console.log('Acción seleccionada:', accion);
  }
}
