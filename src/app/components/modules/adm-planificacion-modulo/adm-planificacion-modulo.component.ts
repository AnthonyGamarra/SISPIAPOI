import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-planificacion-modulo',
  imports: [],
  templateUrl: './adm-planificacion-modulo.component.html',
  styleUrl: './adm-planificacion-modulo.component.scss'
})
export class AdmPlanificacionModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/gestion/admin-planificacion']).then(success => {
    if (success) {
      console.log('Navegación a /admin-planificacion exitosa');
    } else {
      console.warn('Navegación a /admin-planificacion falló');
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
