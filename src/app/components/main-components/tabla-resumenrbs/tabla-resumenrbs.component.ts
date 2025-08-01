
import { Component, OnInit } from '@angular/core';
import { Form9DataService } from '../../../core/services/logic/form9-data.service';

@Component({
  selector: 'app-tabla-resumenrbs',
  templateUrl: './tabla-resumenrbs.component.html',
  styleUrls: ['./tabla-resumenrbs.component.scss']
})
export class TablaResumenrbsComponent implements OnInit {
  resumen: { bienes: number, servicios: number, personal: number } = { bienes: 0, servicios: 0, personal: 0 };
  meses: string[] = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL',
    'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
    'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  constructor(private form9DataService: Form9DataService) {}

  ngOnInit() {
    this.calcularResumen();
  }

  calcularResumen() {
    const data = this.form9DataService.getData() || [];
    let bienes = 0, servicios = 0, personal = 0;
    // Buscar categorías padre relevantes
    for (const cat of data) {
      if (!cat.children) continue;
      for (const sub of cat.children) {
        if (!sub.children) continue;
        // GASTO DE PERSONAL Y OBLIGAC. SOCIALES
        if (sub.name && sub.name.toUpperCase().includes('GASTO DE PERSONAL')) {
          personal += this.sumarMeses(sub.children);
        }
        // BIENES
        if (sub.name && sub.name.toUpperCase().includes('BIENES')) {
          bienes += this.sumarMeses(sub.children);
        }
        // SERVICIOS
        if (sub.name && sub.name.toUpperCase().includes('SERVICIOS')) {
          servicios += this.sumarMeses(sub.children);
        }
      }
    }
    this.resumen = { bienes, servicios, personal };
  }

  sumarMeses(rows: any[]): number {
    let total = 0;
    for (const row of rows) {
      if (row.meses) {
        for (const mes of this.meses) {
          total += row.meses[mes] || 0;
        }
      }
      if (row.children) {
        total += this.sumarMeses(row.children);
      }
    }
    return total;
  }
}
