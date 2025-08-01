import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service'; // Adjust path if necessary, assuming it's in core/services/authentication/

import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { FooterComponent } from '../../components/utilities/footer/footer.component';

import { FormulacionModuloComponent } from '../../components/modules/formulacion-modulo/formulacion-modulo.component';
import { EvaluacionModuloComponent } from '../../components/main-components/evaluacion-modulo/evaluacion-modulo.component'
import { AdmPlanificacionModuloComponent } from '../../components/modules/adm-planificacion-modulo/adm-planificacion-modulo.component'
import { ModuloksComponent } from '../../components/modules/moduloks/moduloks.component';
import { AdmOEAEModuloComponent } from "../../components/modules/adm-oe-ae-modulo/adm-oe-ae-modulo.component";
import { ModuloReporteF9Component } from '../../components/modules/modulo-reporte-f9/modulo-reporte-f9.component';
import { GestionModuloComponent } from "../../components/modules/gestion-modulo/gestion-modulocomponent";

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    FormulacionModuloComponent,
    ModuloksComponent,
    ModuloReporteF9Component,
    GestionModuloComponent
],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

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
