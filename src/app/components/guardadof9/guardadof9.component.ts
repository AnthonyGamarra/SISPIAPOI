import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Form9DataService } from '../../core/services/logic/form9-data.service';
import { ButtonModule } from 'primeng/button';  // Importa el módulo de botones PrimeNG

@Component({
  selector: 'app-guardadof9',
  standalone: true,
  imports: [CommonModule,ButtonModule],
  templateUrl: './guardadof9.component.html',
  styleUrl: './guardadof9.component.scss'
})

export class Guardadof9Component {
  datosCapturados: any = null;

  constructor(private form9DataService: Form9DataService) {}

  capturarDatosForm9() {
    // Solo budgetItems (filas editables) CON información
    const allRows = this.form9DataService.getData();
    if (!allRows) {
      this.datosCapturados = [];
      return;
    }
    // Recursivo para aplanar y filtrar solo editables con datos
    function extraerBudgetItemsConInfo(rows: any[]): any[] {
      let items: any[] = [];
      for (const row of rows) {
        if (
          row.editable &&
          row.meses &&
          Object.values(row.meses).some((v) => Number(v) > 0)
        ) {
          items.push(row);
        }
        if (row.children) {
          items = items.concat(extraerBudgetItemsConInfo(row.children));
        }
      }
      return items;
    }
    this.datosCapturados = extraerBudgetItemsConInfo(allRows);
    console.log('BudgetItems capturados con información:', this.datosCapturados);
  }
}
