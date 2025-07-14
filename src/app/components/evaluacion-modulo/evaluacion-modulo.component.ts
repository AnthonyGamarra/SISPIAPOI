import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-evaluacion-modulo',
  templateUrl: './evaluacion-modulo.component.html',
  styleUrls: ['./evaluacion-modulo.component.scss']
})
export class EvaluacionModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/evaluacion']).then(success => {
    if (success) {
      console.log('Navegación a /evaluacion exitosa');
    } else {
      console.warn('Navegación a /evaluacion falló');
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