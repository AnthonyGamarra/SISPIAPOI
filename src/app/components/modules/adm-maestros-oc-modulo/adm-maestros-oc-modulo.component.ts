import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-maestros-oc-modulo',
  imports: [],
  templateUrl: './adm-maestros-oc-modulo.component.html',
  styleUrl: './adm-maestros-oc-modulo.component.scss'
})
export class AdmMaestrosOCModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/adm-maestro-gestion-oc']).then(success => {
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
