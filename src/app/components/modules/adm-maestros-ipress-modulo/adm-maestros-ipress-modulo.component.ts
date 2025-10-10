import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-maestros-ipress-modulo',
  imports: [],
  templateUrl: './adm-maestros-ipress-modulo.component.html',
  styleUrl: './adm-maestros-ipress-modulo.component.scss'
})
export class AdmMaestrosIPRESSModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/gestion/adm-maestro-ipress']).then(success => {
    if (success) {
      console.log('Navegación a /gestion/adm-maestro-ipress exitosa');
    } else {
      console.warn('Navegación a /gestion/adm-maestro-ipress falló');
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
