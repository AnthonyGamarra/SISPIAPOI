import { Component, Output, EventEmitter } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [DropdownModule, FormsModule],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent {
  @Output() buscar = new EventEmitter<{ ano: string | null; centro: string | null; centroc: string | null }>();

  optionsCentro = [
    { label: 'Centro 1', value: 'centro1' },
    { label: 'Centro 2', value: 'centro2' },
    { label: 'Centro 3', value: 'centro3' }
  ];
  selectedCentro: string | null = null;

  optionsAno = [
    { label: 'Año 1', value: '2024' },
    { label: 'Año 2', value: '2025' },
    { label: 'Año 3', value: '2026' }
  ];
  selectedAno: string | null = null;

  optionsCentroC = [
    { label: 'CentroC 1', value: '1' },
    { label: 'CentroC 2', value: '2' },
    { label: 'CentroC 3', value: '3' }
  ];
  selectedCentroC: string | null = null;

  onBuscar() {
  if (!this.selectedAno || !this.selectedCentro || !this.selectedCentroC) {
    alert('Por favor selecciona todas las opciones antes de buscar.');
    return;
  }

  this.buscar.emit({
    ano: this.selectedAno,
    centro: this.selectedCentro,
    centroc: this.selectedCentroC
  });
  }
}
