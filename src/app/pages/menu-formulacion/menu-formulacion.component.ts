import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/authentication/auth.service';
import { DependencyService } from '../../core/services/logic/dependency.service';

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
export class MenuFormulacionComponent implements OnInit {
  showCentral = false;
  showDesconcentrado = false;

  constructor(private authService: AuthService, private dependencyService: DependencyService) {}

  ngOnInit(): void {
    if (this.authService.hasRole(['ADMIN', 'GPLANEAMIENTO'])) {
      this.showCentral = true;
      this.showDesconcentrado = true;
      return;
    }
    if (this.authService.hasRole(['UDEPENDENCIA', 'UPLANEAMIENTO'])) {
      // Tomar dependencies directamente de localStorage
      let dependencies: number[] = [];
      try {
        dependencies = JSON.parse(localStorage.getItem('dependencies') || '[]');
      } catch {
        dependencies = [];
      }
      if (dependencies.length > 0) {
        const depIds = this.authService.hasRole(['UDEPENDENCIA']) ? [dependencies[0]] : dependencies;
        let foundCentral = false;
        let foundDesconcentrado = false;
        let checked = 0;
        depIds.forEach(depId => {
          this.dependencyService.getById(depId).subscribe({
            next: (dep) => {
              const typeId = dep?.dependencyType?.idDependencyType;
              if (typeId == 1) foundCentral = true;
              if (typeId == 2) foundDesconcentrado = true;
              checked++;
              if (checked === depIds.length) {
                this.showCentral = foundCentral;
                this.showDesconcentrado = foundDesconcentrado;
              }
            },
            error: () => {
              checked++;
              if (checked === depIds.length) {
                this.showCentral = foundCentral;
                this.showDesconcentrado = foundDesconcentrado;
              }
            }
          });
        });
      }
    }
  }
}
