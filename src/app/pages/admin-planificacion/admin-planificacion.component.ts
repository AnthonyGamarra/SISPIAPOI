import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import { MenubarComponent } from '../../components/menubar/menubar.component';
import { AdmPlanificacionTableComponent } from "../../components/adm-planificacion-table/adm-planificacion-table.component";

@Component({
  selector: 'app-admin-planificacion',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    AdmPlanificacionTableComponent
],
  templateUrl: './admin-planificacion.component.html',
  styleUrl: './admin-planificacion.component.scss'
})
export class AdminPlanificacionComponent {
  
}
