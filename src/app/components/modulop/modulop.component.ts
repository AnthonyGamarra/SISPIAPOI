import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-modulop',
  templateUrl: './modulop.component.html',
  styleUrls: ['./modulop.component.scss']
})
export class ModulopComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón modulop clickeado');
  this.router.navigate(['/formulation']).then(success => {
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