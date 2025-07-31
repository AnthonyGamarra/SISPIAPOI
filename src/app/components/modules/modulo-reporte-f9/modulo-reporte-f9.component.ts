import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-modulo-reporte-f9',
  templateUrl: './modulo-reporte-f9.component.html',
  styleUrls: ['./modulo-reporte-f9.component.scss']
})
export class ModuloReporteF9Component {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
console.log('Botón módulo clickeado');
  this.router.navigate(['/reporte-f9']).then(success => {
    if (success) {
      console.log('Navegación a /reporte-f9 exitosa');
    } else {
      console.warn('Navegación a /reporte-f9 falló');
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