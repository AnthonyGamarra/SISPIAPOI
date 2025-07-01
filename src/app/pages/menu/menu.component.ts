import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import {MenubarComponent} from '../../components/menubar/menubar.component';
import {ModulopComponent} from '../../components/modulop/modulop.component';
import {ModuloksComponent} from '../../components/moduloks/moduloks.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FooterComponent, MenubarComponent, ModulopComponent,ModuloksComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

}
