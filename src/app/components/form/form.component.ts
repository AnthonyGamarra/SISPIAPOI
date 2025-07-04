import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 


@Component({
  selector: 'app-form',
  imports: [CommonModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss'
})
export class FormComponent {
  filas: any[] = [];

  agregarFila() {
    this.filas.push({});
  }

  eliminarFila(index: number) {
    this.filas.splice(index, 1);
  }
}
