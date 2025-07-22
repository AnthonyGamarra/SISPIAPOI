import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import {MenubarComponent} from '../../components/utilities/menubar/menubar.component';
import { Form9Component } from '../../components/main-components/form9/form9.component';
import { Guardadof9Component } from '../../components/main-components/guardadof9/guardadof9.component';
import {SelectoractComponent} from '../../components/main-components/selectoract/selectoract.component';
import { RBSComponent } from '../../components/main-components/rbs/rbs.component';
@Component({
  selector: 'app-valida',
  imports: [CommonModule, FooterComponent, MenubarComponent, SelectoractComponent,Form9Component,Guardadof9Component, RBSComponent],
  templateUrl: './valida.component.html',
  styleUrl: './valida.component.scss'
})
export class ValidaComponent {
  idOperationalActivitySeleccionado: number | null = null;
  idDependencySeleccionada: number | null = null;
  actividadSeleccionada: any = null;

  manejarBusqueda(event: { idOperationalActivity: number | null, idDependency?: number | null, actividad?: any }) {
    this.idOperationalActivitySeleccionado = event?.idOperationalActivity ?? null;
    this.idDependencySeleccionada = event?.idDependency ?? null;
    this.actividadSeleccionada = event?.actividad ?? null;
  }
}
