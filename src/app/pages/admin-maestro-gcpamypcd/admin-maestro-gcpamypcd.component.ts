import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { AdmMaestroGcpamypcdTablaComponent } from "../../components/main-components/adm-maestro-gcpamypcd-tabla/adm-maestro-gcpamypcd-tabla.component";

@Component({
  selector: 'app-admin-maestro-gcpamypcd.component',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmMaestroGcpamypcdTablaComponent
],
  templateUrl: './admin-maestro-gcpamypcd.component.html',
  styleUrl: './admin-maestro-gcpamypcd.component.scss'
})
export class AdminMaestroGcpamypcdComponent {

}
