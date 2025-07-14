import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service'; // Adjust path if necessary, assuming it's in core/services/authentication/

import { MenubarComponent } from '../../components/menubar/menubar.component';
import { FooterComponent } from '../../components/footer/footer.component';

import { FormulacionModuloComponent } from '../../components/formulacion-modulo/formulacion-modulo.component';
import { EvaluacionModuloComponent } from '../../components/evaluacion-modulo/evaluacion-modulo.component'
import { ModuloksComponent } from '../../components/moduloks/moduloks.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FooterComponent, MenubarComponent, FormulacionModuloComponent, EvaluacionModuloComponent, ModuloksComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

  constructor(private authService: AuthService) {} // Inject your AuthService

  allowedRolesForEvaluacion: string[] = ["ADMIN", "UPLANEAMIENTO", "GPLANEAMIENTO"];

  canSeeEvaluacionComponent(): boolean {
    return this.authService.hasRole(this.allowedRolesForEvaluacion);
  }

}
