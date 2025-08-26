import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { AdmMaestroGcpsTablaComponent } from '../../components/main-components/adm-maestro-gcps-tabla/adm-maestro-gcps-tabla.component';

@Component({
  selector: 'app-admin-maestro-gcps.component',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmMaestroGcpsTablaComponent
],
  templateUrl: './admin-maestro-gcps.component.html',
  styleUrl: './admin-maestro-gcps.component.scss'
})
export class AdminMaestroGcpsComponent {

}
