import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulacion-desconcentrado-modulo',
  templateUrl: './formulacion-desconcentrado-modulo.component.html',
  styleUrls: ['./formulacion-desconcentrado-modulo.component.scss']
})
export class FormulacionDesconcentradoModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón modulop clickeado');
  this.router.navigate(['/formulacion-desconcentrado']).then(success => {
    if (success) {
      console.log('Navegación a /formulation exitosa');
    } else {
      console.warn('Navegación a /formulation falló');
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