import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service';
import { DependencyService } from '../../core/services/logic/dependency.service';

import { MenubarComponent } from '../../components/utilities/menubar/menubar.component';
import { FooterComponent } from '../../components/utilities/footer/footer.component';

import { FormulacionDesconcentradoGestionModuloComponent } from '../../components/modules/formulacion-desconcentrado-gestion-modulo/formulacion-desconcentrado-gestion-modulo.component';
import { FormulacionDesconcentradoSocialesModuloComponent } from '../../components/modules/formulacion-desconcentrado-sociales-modulo/formulacion-desconcentrado-sociales-modulo.component';
import { FormulacionDesconcentradoSaludModuloComponent } from "../../components/modules/formulacion-desconcentrado-salud-modulo/formulacion-desconcentrado-salud-modulo.component";

@Component({
  selector: 'app-menu-formulacion-desconcentrado',
  standalone: true,
  imports: [
    CommonModule,
    FooterComponent,
    MenubarComponent,
    FormulacionDesconcentradoGestionModuloComponent,
    FormulacionDesconcentradoSocialesModuloComponent,
    FormulacionDesconcentradoSaludModuloComponent
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

    allowedRolesForSociales: string[] = ["ADMIN", "GPLANEAMIENTO", "UPLANEAMIENTO", "UDEPENDENCIA"];

    userDependencyIds: number[] = [];
    canShowSociales: boolean = false;
    canShowSalud: boolean = false;

    ngOnInit(): void {
        // Obtener los IDs de dependencias del usuario y validar permisos
        this.loadUserDependencies();
    }

    private loadUserDependencies(): void {
        // Obtener los IDs de dependencias del token
        this.userDependencyIds = this.authService.getDependenciesFromToken();
        // Validar permisos para mostrar el componente de sociales
        this.validateSocialesPermissions();
        // Validar permisos para mostrar el componente de salud
        this.validateSaludPermissions();
    }

    private validateSocialesPermissions(): void {
        const userRole = this.authService.getUserRole();
        
        // ADMIN y GPLANEAMIENTO siempre pueden ver
        if (userRole === "ADMIN" || userRole === "GPLANEAMIENTO") {
            this.canShowSociales = true;
            return;
        }

        // Para UPLANEAMIENTO y UDEPENDENCIA, verificar dependencias
        if (userRole === "UPLANEAMIENTO" || userRole === "UDEPENDENCIA") {
            this.checkDependenciesSocialField();
        } else {
            this.canShowSociales = false;
        }
    }

    private validateSaludPermissions(): void {
        const userRole = this.authService.getUserRole();
        
        // ADMIN y GPLANEAMIENTO siempre pueden ver
        if (userRole === "ADMIN" || userRole === "GPLANEAMIENTO") {
            this.canShowSalud = true;
            return;
        }

        // Para UPLANEAMIENTO y UDEPENDENCIA, verificar dependencias
        if (userRole === "UPLANEAMIENTO" || userRole === "UDEPENDENCIA") {
            this.checkDependenciesSaludField();
        } else {
            this.canShowSalud = false;
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
        
        // Para UPLANEAMIENTO: verificar si al menos una dependencia tiene social = true
        if (userRole === "UPLANEAMIENTO") {
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

    private checkDependenciesSaludField(): void {
        const userRole = this.authService.getUserRole();
        
        if (this.userDependencyIds.length === 0) {
            this.canShowSalud = false;
            return;
        }

        // Para UDEPENDENCIA: solo verificar la primera dependencia
        if (userRole === "UDEPENDENCIA") {
            this.dependencyService.getById(this.userDependencyIds[0]).subscribe({
                next: (dependency) => {
                    this.canShowSalud = dependency.dependencyType?.idDependencyType === 2;
                },
                error: (error) => {
                    console.error('Error fetching dependency:', error);
                    this.canShowSalud = false;
                }
            });
        }
        
        // Para UPLANEAMIENTO: verificar si al menos una dependencia tiene idDependencyType = 3
        if (userRole === "UPLANEAMIENTO") {
            let checkedDependencies = 0;
            let hasSaludDependency = false;

            this.userDependencyIds.forEach(depId => {
                this.dependencyService.getById(depId).subscribe({
                    next: (dependency) => {
                        checkedDependencies++;
                        if (dependency.dependencyType?.idDependencyType === 2) {
                            hasSaludDependency = true;
                        }
                        
                        // Cuando se hayan verificado todas las dependencias
                        if (checkedDependencies === this.userDependencyIds.length) {
                            this.canShowSalud = hasSaludDependency;
                        }
                    },
                    error: (error) => {
                        console.error('Error fetching dependency:', error);
                        checkedDependencies++;
                        
                        // Cuando se hayan verificado todas las dependencias
                        if (checkedDependencies === this.userDependencyIds.length) {
                            this.canShowSalud = hasSaludDependency;
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

    canSeeSaludComponent(): boolean {
        return this.canShowSalud;
    }
}
