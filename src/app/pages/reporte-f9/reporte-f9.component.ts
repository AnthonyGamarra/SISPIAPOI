import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/utilities/footer/footer.component';
import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { OeAeAdminComponent } from "../../components/main-components/oe-ae-admin/oe-ae-admin.component";

@Component({
  selector: 'app-reporte-f9',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
],
  templateUrl: './reporte-f9.component.html',
  styleUrl: './reporte-f9.component.scss'
})
export class ReporteF9 {

}
