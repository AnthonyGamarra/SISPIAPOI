import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulacion-desconcentrado-salud-modulo',
  templateUrl: './formulacion-desconcentrado-salud-modulo.component.html',
  styleUrls: ['./formulacion-desconcentrado-salud-modulo.component.scss']
})
export class FormulacionDesconcentradoSaludModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón módulo clickeado');
  this.router.navigate(['/formulacion/formulacion-desconcentrado/salud']).then(success => {

    if (success) {
      console.log('Navegación a /formulacion-desconcentrado-salud exitosa');
    } else {
      console.warn('Navegación a /formulacion-desconcentrado-salud falló');
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