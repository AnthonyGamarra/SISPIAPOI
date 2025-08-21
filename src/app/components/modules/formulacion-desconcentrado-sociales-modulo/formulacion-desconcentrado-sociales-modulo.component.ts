import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulacion-desconcentrado-sociales-modulo',
  templateUrl: './formulacion-desconcentrado-sociales-modulo.component.html',
  styleUrls: ['./formulacion-desconcentrado-sociales-modulo.component.scss']
})
export class FormulacionDesconcentradoSocialesModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón módulo clickeado');
  this.router.navigate(['/formulacion/formulacion-desconcentrado/sociales']).then(success => {

    if (success) {
      console.log('Navegación a /formulacion-desconcentrado-sociales exitosa');
    } else {
      console.warn('Navegación a /formulacion-desconcentrado-sociales falló');
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