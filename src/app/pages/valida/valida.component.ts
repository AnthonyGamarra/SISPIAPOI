import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import {MenubarComponent} from '../../components/menubar/menubar.component';
import { Form9Component } from '../../components/form9/form9.component';
import { Guardadof9Component } from '../../components/guardadof9/guardadof9.component';
import {SelectoractComponent} from '../../components/selectoract/selectoract.component';
@Component({
  selector: 'app-valida',
  imports: [CommonModule, FooterComponent, MenubarComponent, SelectoractComponent,Form9Component,Guardadof9Component],
  templateUrl: './valida.component.html',
  styleUrl: './valida.component.scss'
})
export class ValidaComponent {
  idActividad: number | null = null;
}
