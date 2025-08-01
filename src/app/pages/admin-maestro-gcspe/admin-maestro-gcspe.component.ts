import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { AdmMaestroGcspeTablaComponent } from "../../components/main-components/adm-maestro-gcspe-tabla/adm-maestro-gcspe-tabla.component";

@Component({
  selector: 'app-admin-maestro-gcspe.component',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmMaestroGcspeTablaComponent
],
  templateUrl: './admin-maestro-gcspe.component.html',
  styleUrl: './admin-maestro-gcspe.component.scss'
})
export class AdminMaestroGcspeComponent {

}
