import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-oe-ae-modulo',
  imports: [],
  templateUrl: './adm-oe-ae-modulo.component.html',
  styleUrl: './adm-oe-ae-modulo.component.scss'
})
export class AdmOEAEModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/admin-oe-ae']).then(success => {
    if (success) {
      console.log('Navegación a /admin-oe-ae exitosa');
    } else {
      console.warn('Navegación a /admin-oe-ae falló');
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
