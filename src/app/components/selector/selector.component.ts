import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { ManagementCenterService } from '../../core/services/logic/management-center.service';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [DropdownModule, FormsModule],
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent implements OnInit {
  @Output() buscar = new EventEmitter<{ ano: string | null; centro: string | null; centroc: string | null }>();

  optionsCentro: { label: string; value: string }[] = [];
  selectedCentro: string | null = null;

  optionsAno = [
    { label: '2025', value: '2025' },
    { label: '2026', value: '2026' },
    { label: '2027', value: '2027' },
    { label: '2028', value: '2028' },
    { label: '2029', value: '2029' },
    { label: '2030', value: '2030' },
    { label: '2031', value: '2031' },
    { label: '2032', value: '2032' },
    { label: '2033', value: '2033' },
    { label: '2034', value: '2034' },
    { label: '2035', value: '2035' },
    { label: '2036', value: '2036' },
    { label: '2037', value: '2037' },
    { label: '2038', value: '2038' },
  ];
  selectedAno: string | null = null;

  optionsCentroC = [
    { label: 'CentroC 1', value: '1' },
    { label: 'CentroC 2', value: '2' },
    { label: 'CentroC 3', value: '3' }
  ];
  selectedCentroC: string | null = null;

  constructor(private managementCenterService: ManagementCenterService) {}

  ngOnInit() {
    const dependencies = JSON.parse(localStorage.getItem('dependencies') || '[]');
    this.managementCenterService.getAll().subscribe(centros => {
      this.optionsCentro = centros
        .filter(c => c.dependency && dependencies.includes(c.dependency.idDependency))
        .map(c => ({ label: c.managementCenterCode + " :: " + c.name, value: c.idManagementCenter.toString() }));
    });
  }

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
