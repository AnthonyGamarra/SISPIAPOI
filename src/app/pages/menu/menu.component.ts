import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service'; // Adjust path if necessary, assuming it's in core/services/authentication/

import { MenubarComponent } from '../../components/menubar/menubar.component';
import { FooterComponent } from '../../components/footer/footer.component';

import { FormulacionModuloComponent } from '../../components/formulacion-modulo/formulacion-modulo.component';
import { EvaluacionModuloComponent } from '../../components/evaluacion-modulo/evaluacion-modulo.component'
import { AdmPlanificacionModuloComponent } from '../../components/adm-planificacion-modulo/adm-planificacion-modulo.component'
import { ModuloksComponent } from '../../components/moduloks/moduloks.component';
import { AdmOEAEModuloComponent } from "../../components/adm-oe-ae-modulo/adm-oe-ae-modulo.component";

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    FormulacionModuloComponent,
    EvaluacionModuloComponent,
    AdmPlanificacionModuloComponent,
    ModuloksComponent,
    AdmOEAEModuloComponent
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
