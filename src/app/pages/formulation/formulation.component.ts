import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import {MenubarComponent} from '../../components/menubar/menubar.component';
import {SelectorComponent} from '../../components/selector/selector.component';
import { TablaComponent } from '../../components/tabla/tabla.component';
import { FormComponent } from '../../components/form/form.component';
// import { DatoscabeceraComponent } from '../../components/datoscabecera/datoscabecera.component';
@Component({
  selector: 'app-formulation',
  imports: [CommonModule, FooterComponent, MenubarComponent,SelectorComponent, TablaComponent, FormComponent, /*DatoscabeceraComponent*/],
  templateUrl: './formulation.component.html',
  styleUrl: './formulation.component.scss'
})
export class FormulationComponent {
  anoSeleccionado: string | null = null;

  manejarBusqueda(event: any) {
    this.anoSeleccionado = event.ano;
  }

}
