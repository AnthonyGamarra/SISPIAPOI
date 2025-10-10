import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { AdmMaestroIpressTablaComponent } from '../../components/main-components/adm-maestro-ipress-tabla/adm-maestro-ipress-tabla.component';

@Component({
  selector: 'app-admin-maestro-ipress.component',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmMaestroIpressTablaComponent
],
  templateUrl: './admin-maestro-ipress.component.html',
  styleUrl: './admin-maestro-ipress.component.scss'
})
export class AdminMaestroIpressComponent {

}
