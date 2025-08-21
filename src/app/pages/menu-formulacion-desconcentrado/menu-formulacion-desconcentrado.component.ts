import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service';
import { DependencyService } from '../../core/services/logic/dependency.service';

import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { FooterComponent } from '../../components/utilities/footer/footer.component';

import { FormulacionDesconcentradoGestionModuloComponent } from '../../components/modules/formulacion-desconcentrado-gestion-modulo/formulacion-desconcentrado-gestion-modulo.component';
import { FormulacionDesconcentradoSocialesModuloComponent } from '../../components/modules/formulacion-desconcentrado-sociales-modulo/formulacion-desconcentrado-sociales-modulo.component';

@Component({
  selector: 'app-menu-formulacion-desconcentrado',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    FormulacionDesconcentradoGestionModuloComponent,
    FormulacionDesconcentradoSocialesModuloComponent
],
  templateUrl: './menu-formulacion-desconcentrado.component.html',
  styleUrl: './menu-formulacion-desconcentrado.component.scss'
})
export class MenuFormulacionDesconcentradoComponent implements OnInit {

    constructor(
        private authService: AuthService,
        private dependencyService: DependencyService
    ) {} 

    allowedRolesForEvaluacion: string[] = ["ADMIN", "UPLANEAMIENTO", "GPLANEAMIENTO"];

    allowedRolesForAdm: string[] = ["ADMIN", "GPLANEAMIENTO"];

    allowedRolesForSociales: string[] = ["ADMIN", "GPLANEAMIENTO", "UPRESUPUESTO", "UDEPENDENCIA"];

    userDependencyIds: number[] = [];
    canShowSociales: boolean = false;

    ngOnInit(): void {
        // Obtener los IDs de dependencias del usuario y validar permisos
        this.loadUserDependencies();
    }

    private loadUserDependencies(): void {
        // Obtener los IDs de dependencias del token
        this.userDependencyIds = this.authService.getDependenciesFromToken();
        // Validar permisos para mostrar el componente de sociales
        this.validateSocialesPermissions();
    }

    private validateSocialesPermissions(): void {
        const userRole = this.authService.getUserRole();
        
        // ADMIN y GPLANEAMIENTO siempre pueden ver
        if (userRole === "ADMIN" || userRole === "GPLANEAMIENTO") {
            this.canShowSociales = true;
            return;
        }

        // Para UPRESUPUESTO y UDEPENDENCIA, verificar dependencias
        if (userRole === "UPRESUPUESTO" || userRole === "UDEPENDENCIA") {
            this.checkDependenciesSocialField();
        } else {
            this.canShowSociales = false;
        }
    }

    private checkDependenciesSocialField(): void {
        const userRole = this.authService.getUserRole();
        
        if (this.userDependencyIds.length === 0) {
            this.canShowSociales = false;
            return;
        }

        // Para UDEPENDENCIA: solo verificar la primera dependencia
        if (userRole === "UDEPENDENCIA") {
            this.dependencyService.getById(this.userDependencyIds[0]).subscribe({
                next: (dependency) => {
                    this.canShowSociales = dependency.social === true;
                },
                error: (error) => {
                    console.error('Error fetching dependency:', error);
                    this.canShowSociales = false;
                }
            });
        }
        
        // Para UPRESUPUESTO: verificar si al menos una dependencia tiene social = true
        if (userRole === "UPRESUPUESTO") {
            let checkedDependencies = 0;
            let hasSocialDependency = false;

            this.userDependencyIds.forEach(depId => {
                this.dependencyService.getById(depId).subscribe({
                    next: (dependency) => {
                        checkedDependencies++;
                        if (dependency.social === true) {
                            hasSocialDependency = true;
                        }
                        
                        // Cuando se hayan verificado todas las dependencias
                        if (checkedDependencies === this.userDependencyIds.length) {
                            this.canShowSociales = hasSocialDependency;
                        }
                    },
                    error: (error) => {
                        console.error('Error fetching dependency:', error);
                        checkedDependencies++;
                        
                        // Cuando se hayan verificado todas las dependencias
                        if (checkedDependencies === this.userDependencyIds.length) {
                            this.canShowSociales = hasSocialDependency;
                        }
                    }
                });
            });
        }
    }

    canSeeEvaluacionComponent(): boolean {
      return this.authService.hasRole(this.allowedRolesForEvaluacion);
    }

    canSeeAdmComponent(): boolean {
      return this.authService.hasRole(this.allowedRolesForAdm);
    }

    canSeeSocialesComponent(): boolean {
        return this.canShowSociales;
    }
}
