import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulacion-desconcentrado-gestion-modulo',
  templateUrl: './formulacion-desconcentrado-gestion-modulo.component.html',
  styleUrls: ['./formulacion-desconcentrado-gestion-modulo.component.scss']
})
export class FormulacionDesconcentradoGestionModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón módulo clickeado');
  this.router.navigate(['/formulacion-desconcentrado-gestion']).then(success => {

    if (success) {
      console.log('Navegación a /formulacion-desconcentrado-gestion exitosa');
    } else {
      console.warn('Navegación a /formulacion-desconcentrado-gestion falló');
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