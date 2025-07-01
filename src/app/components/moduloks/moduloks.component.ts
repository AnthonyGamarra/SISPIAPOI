import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-moduloks',
  templateUrl: './moduloks.component.html',
  styleUrls: ['./moduloks.component.scss']
})
export class ModuloksComponent {
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