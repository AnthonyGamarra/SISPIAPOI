import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import {MenubarComponent} from '../../components/menubar/menubar.component';
import {SelectorComponent} from '../../components/selector/selector.component';
import { TablaComponent } from '../../components/tabla/tabla.component';
import { FormComponent } from '../../components/form/form.component';
import {Form2Component} from '../../components/form2/form2.component';
import { DatoscabeceraComponent } from '../../components/datoscabecera/datoscabecera.component';
import { Form9Component } from '../../components/form9/form9.component';
@Component({
  selector: 'app-valida',
  imports: [CommonModule, FooterComponent, MenubarComponent,SelectorComponent, TablaComponent, FormComponent,Form2Component, DatoscabeceraComponent, Form9Component],
  templateUrl: './valida.component.html',
  styleUrl: './valida.component.scss'
})
export class ValidaComponent {

}
