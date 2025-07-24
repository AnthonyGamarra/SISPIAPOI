import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { AdmMaestroGestionOcTablaComponent } from "../../components/main-components/adm-maestro-gestion-oc-tabla/adm-maestro-gestion-oc-tabla.component";

@Component({
  selector: 'app-admin-maestro-gestion-oc',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmMaestroGestionOcTablaComponent
],
  templateUrl: './admin-maestro-gestion-oc.component.html',
  styleUrl: './admin-maestro-gestion-oc.component.scss'
})
export class AdminMaestroGestionOcComponent {

}
