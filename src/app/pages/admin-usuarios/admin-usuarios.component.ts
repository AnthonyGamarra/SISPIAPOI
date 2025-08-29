import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { AdmUsuariosTablaComponent } from '../../components/main-components/adm-usuarios-tabla/adm-usuarios-tabla.component';

@Component({
  selector: 'app-admin-usuarios',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmUsuariosTablaComponent
],
  templateUrl: './admin-usuarios.component.html',
  styleUrl: './admin-usuarios.component.scss'
})
export class AdminUsuariosComponent {

}
