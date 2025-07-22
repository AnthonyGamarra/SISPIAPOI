import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service'; // Adjust path if necessary, assuming it's in core/services/authentication/

import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { FooterComponent } from '../../components/utilities/footer/footer.component';

import { FormulacionCentralModuloComponent } from '../../components/modules/formulacion-central-modulo/formulacion-central-modulo.component';
import { FormulacionDesconcentradoModuloComponent } from '../../components/modules/formulacion-desconcentrado-modulo/formulacion-desconcentrado-modulo.component';

@Component({
  selector: 'app-menu-formulacion',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    FormulacionCentralModuloComponent,
    FormulacionDesconcentradoModuloComponent,
],
  templateUrl: './menu-formulacion.component.html',
  styleUrl: './menu-formulacion.component.scss'
})
export class MenuFormulacionComponent {

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
