import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-modulop',
  templateUrl: './modulop.component.html',
  styleUrls: ['./modulop.component.scss']
})
export class ModulopComponent {
  @Output() clicked = new EventEmitter<void>();

  onClick() {
    this.clicked.emit();
    console.log('Botón modulop clickeado');
  }
  onModuleClick(module: string) {
  console.log('Módulo seleccionado:', module);
    // Aquí puedes agregar navegación o lógica específica
  }
}