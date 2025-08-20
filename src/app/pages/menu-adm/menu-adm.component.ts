import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service';

import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { FooterComponent } from '../../components/utilities/footer/footer.component';

import { AdmMaestrosAGModuloComponent } from '../../components/modules/adm-maestros-ag-modulo/adm-maestros-ag-modulo.component';
import { AdmPlanificacionModuloComponent } from '../../components/modules/adm-planificacion-modulo/adm-planificacion-modulo.component';
import { AdmOEAEModuloComponent } from '../../components/modules/adm-oe-ae-modulo/adm-oe-ae-modulo.component';
import { AdmMaestrosPEModuloComponent } from '../../components/modules/adm-maestros-pe-modulo/adm-maestros-pe-modulo.component';
import { AdmMaestrosPSOModuloComponent } from '../../components/modules/adm-maestros-pso-modulo/adm-maestros-pso-modulo.component';

@Component({
  selector: 'app-menu-adm',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    AdmMaestrosAGModuloComponent,
    AdmPlanificacionModuloComponent,
    AdmOEAEModuloComponent,
    AdmMaestrosPEModuloComponent,
    AdmMaestrosPSOModuloComponent
],
  templateUrl: './menu-adm.component.html',
  styleUrl: './menu-adm.component.scss'
})
export class MenuAdmComponent {

    constructor(private authService: AuthService) {} // Inject your AuthService

    allowedRolesForEvaluacion: string[] = ["ADMIN", "UPLANEAMIENTO", "GPLANEAMIENTO"];

    allowedRolesForAdm: string[] = ["ADMIN", "GPLANEAMIENTO"];

    canSeeEvaluacionComponent(): boolean {
      return this.authService.hasRole(this.allowedRolesForEvaluacion);
    }

    canSeeAdmComponent(): boolean {
      return this.authService.hasRole(this.allowedRolesForAdm);
      
    }

}
