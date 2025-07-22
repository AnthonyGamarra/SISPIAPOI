import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-f9resume',
  templateUrl: './f9resume.component.html',
  styleUrls: ['./f9resume.component.scss'],
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe]
})
export class F9resumeComponent implements OnInit {
  @Input() form9Data: any[] = [];

  meses: string[] = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL',
    'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
    'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  resumen: { categoria: string, valores: number[], total: number }[] = [];

  ngOnInit() {
    this.calcularResumen();
  }

  ngOnChanges() {
    this.calcularResumen();
  }

  calcularResumen() {
    // Inicializar totales
    const remu = new Array(12).fill(0);
    const bienes = new Array(12).fill(0);
    const servicios = new Array(12).fill(0);

    // Recorrer data de form9
    const recorrer = (rows: any[]) => {
      for (const row of rows) {
        if (row.children) recorrer(row.children);
        if (row.editable && row.tipoGasto) {
          // Remuneraciones: GASTO DE PERSONAL Y OBLIGAC. SOCIALES
          if (row.tipoGasto.toUpperCase().includes('PERSONAL') || row.tipoGasto.toUpperCase().includes('REMUN')) {
            this.meses.forEach((mes, i) => remu[i] += Number(row.meses?.[mes] || 0));
          }
          // Bienes
          if (row.tipoGasto.toUpperCase().includes('BIEN')) {
            this.meses.forEach((mes, i) => bienes[i] += Number(row.meses?.[mes] || 0));
          }
          // Servicios
          if (row.tipoGasto.toUpperCase().includes('SERVICIO')) {
            this.meses.forEach((mes, i) => servicios[i] += Number(row.meses?.[mes] || 0));
          }
        }
      }
    };
    recorrer(this.form9Data);
    this.resumen = [
      { categoria: 'Remuneraciones', valores: remu, total: remu.reduce((a,b)=>a+b,0) },
      { categoria: 'Bienes', valores: bienes, total: bienes.reduce((a,b)=>a+b,0) },
      { categoria: 'Servicios', valores: servicios, total: servicios.reduce((a,b)=>a+b,0) }
    ];
  }
}
