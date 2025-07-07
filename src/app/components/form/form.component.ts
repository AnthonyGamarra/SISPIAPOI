import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, InputNumberModule, ButtonModule],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent {
  filas: any[] = [];

  agregarFila() {
    this.filas.push({
      denominacion: '',
      indicador: '',
      comportamiento: '',
      metaI: null,
      metaII: null,
      metaIII: null,
      metaIV: null,
      metaTotal: null,
      remuneraciones: null,
      bienes: null,
      servicios: null,
      ejecutado: null,
      esperado: null,
      estadoActivo: true, // si quieres controlar estado con un booleano
    });
  }

  eliminarFila(index: number) {
    this.filas.splice(index, 1);
  }

  guardarFila(index: number) {
    console.log(`Guardar fila ${index}`, this.filas[index]);
  }

  cambiarEstado(index: number) {
    // Ejemplo: alternar el estado
    this.filas[index].estadoActivo = !this.filas[index].estadoActivo;
    console.log(`Cambiar estado fila ${index}: `, this.filas[index].estadoActivo);
  }
}
