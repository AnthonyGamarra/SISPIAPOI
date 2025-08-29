import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-usuarios-modulo',
  imports: [],
  templateUrl: './adm-usuarios-modulo.component.html',
  styleUrl: './adm-usuarios-modulo.component.scss'
})
export class AdmUsuariosModuloComponent {
  constructor(private router: Router) {}
  @Output() clicked = new EventEmitter<void>();

  onClick() {
  this.router.navigate(['/gestion/admin-usuarios']).then(success => {
    if (success) {
      console.log('Navegación a /admin-usuarios exitosa');
    } else {
      console.warn('Navegación a /admin-usuarios falló');
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
