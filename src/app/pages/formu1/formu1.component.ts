import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import {MenubarComponent} from '../../components/menubar/menubar.component';
import {SelectorComponent} from '../../components/selector/selector.component';
import { TablaComponent } from '../../components/tabla/tabla.component';

@Component({
  selector: 'app-formu1',
  imports: [CommonModule, FooterComponent, MenubarComponent,SelectorComponent, TablaComponent],
  templateUrl: './formu1.component.html',
  styleUrl: './formu1.component.scss'
})
export class Formu1Component {

  filtros = {
    ano: null as string | null,
    centro: null as string | null,
    centroc: null as string | null
  };
  mostrarTabla = false;

  manejarBusqueda(event: { ano: string | null; centro: string | null; centroc: string | null }) {
    this.filtros = event;
    this.mostrarTabla = true;
  }

}
