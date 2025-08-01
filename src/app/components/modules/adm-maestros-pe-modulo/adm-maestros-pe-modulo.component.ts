import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-maestros-pe-modulo',
  imports: [],
  templateUrl: './adm-maestros-pe-modulo.component.html',
  styleUrl: './adm-maestros-pe-modulo.component.scss'
})
export class AdmMaestrosPEModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/gestion/adm-maestro-gcspe']).then(success => {
    if (success) {
      console.log('Navegación a /admin-maestros-oc exitosa');
    } else {
      console.warn('Navegación a /admin-maestros-oc falló');
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
