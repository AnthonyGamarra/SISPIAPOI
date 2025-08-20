import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-maestros-ag-modulo',
  imports: [],
  templateUrl: './adm-maestros-ag-modulo.component.html',
  styleUrl: './adm-maestros-ag-modulo.component.scss'
})
export class AdmMaestrosAGModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/gestion/adm-maestro-gestion-ag']).then(success => {
    if (success) {
      console.log('Navegación a /gestion/adm-maestro-gestion-ag exitosa');
    } else {
      console.warn('Navegación a /gestion/adm-maestro-gestion-ag falló');
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
