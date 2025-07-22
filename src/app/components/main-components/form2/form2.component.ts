import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form2',
  imports: [CommonModule],
  templateUrl: './form2.component.html',
  styleUrl: './form2.component.scss'
})
export class Form2Component {
  filas: any[] = [];

  agregarFila() {
    this.filas.push({});
  }

  eliminarFila(index: number) {
    this.filas.splice(index, 1);
  }
}
