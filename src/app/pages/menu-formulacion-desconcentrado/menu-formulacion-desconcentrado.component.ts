import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service';

import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { FooterComponent } from '../../components/utilities/footer/footer.component';

import { AdmMaestrosOCModuloComponent } from '../../components/modules/adm-maestros-oc-modulo/adm-maestros-oc-modulo.component';
import { FormulacionDesconcentradoGestionModuloComponent } from '../../components/modules/formulacion-desconcentrado-gestion-modulo/formulacion-desconcentrado-gestion-modulo.component';

@Component({
  selector: 'app-menu-formulacion-desconcentrado',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    AdmMaestrosOCModuloComponent,
    FormulacionDesconcentradoGestionModuloComponent
],
  templateUrl: './menu-formulacion-desconcentrado.component.html',
  styleUrl: './menu-formulacion-desconcentrado.component.scss'
})
export class MenuFormulacionDesconcentradoComponent {

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
