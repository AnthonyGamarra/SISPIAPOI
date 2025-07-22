import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-moduloks',
  templateUrl: './moduloks.component.html',
  styleUrls: ['./moduloks.component.scss']
})
export class ModuloksComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón modulop clickeado');
  this.router.navigate(['/valida']).then(success => {
    if (success) {
      console.log('Navegación a /valida exitosa');
    } else {
      console.warn('Navegación a /valida falló');
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