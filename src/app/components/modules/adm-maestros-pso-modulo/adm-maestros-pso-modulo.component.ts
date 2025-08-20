import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-maestros-pso-modulo',
  imports: [],
  templateUrl: './adm-maestros-pso-modulo.component.html',
  styleUrl: './adm-maestros-pso-modulo.component.scss'
})
export class AdmMaestrosPSOModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/gestion/adm-maestro-gcpamypcd']).then(success => {
    if (success) {
      console.log('Navegación a /gestion/adm-maestro-gcpamypcd exitosa');
    } else {
      console.warn('Navegación a /gestion/adm-maestro-gcpamypcd falló');
    }
  }).catch(err => {
    console.error('Error durante la navegación:', err);
  });
  }
  onModuleClick(module: string) {
  console.log('Módulo seleccionado:', module);
    // Aquí puedes agregar navegación o lógica específica
  }
}
