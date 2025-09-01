import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulacion-modulo',
  templateUrl: './formulacion-modulo.component.html',
  styleUrls: ['./formulacion-modulo.component.scss']
})
export class FormulacionModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {

  this.router.navigate(['/formulacion']).then(success => {
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