import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Form9DataService } from '../../core/services/logic/form9-data.service';
import { ButtonModule } from 'primeng/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-guardadof9',
  standalone: true,
  imports: [CommonModule, ButtonModule, HttpClientModule],
  templateUrl: './guardadof9.component.html',
  styleUrl: './guardadof9.component.scss'
})

export class Guardadof9Component {
  datosCapturados: any = null;

  constructor(private form9DataService: Form9DataService, private http: HttpClient) {}

  capturarDatosForm9() {
    // Solo budgetItems (filas editables) CON información
    const allRows = this.form9DataService.getData();
    if (!allRows) {
      this.datosCapturados = [];
      return;
    }
    // Recursivo para aplanar y filtrar solo editables con datos, omitiendo parent y children
    function extraerBudgetItemsConInfo(rows: any[]): any[] {
      let items: any[] = [];
      for (const row of rows) {
        const tieneMesesConValores =
          row.meses && Object.values(row.meses).some((v) => Number(v) > 0);

        if (row.editable && tieneMesesConValores) {
          items.push({
            id: row.id,
            meses: row.meses,
            tipoGastoId: row.tipoGasto,
          });
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

  guardarDatos() {
    if (!this.datosCapturados || this.datosCapturados.length === 0) {
      alert('No hay datos para guardar.');
      return;
    }
    let exitos = 0;
    let errores = 0;
    let total = this.datosCapturados.length;
    for (const item of this.datosCapturados) {
      const payload = {
        operationalActivity: { idOperationalActivity: 19 },
        budgetItem: { idBudgetItem: item.id },
        expenseType: { idExpenseType: item.tipoGastoId },
        monthAmounts: {
          ENERO: item.meses['ENERO'] || 0,
          FEBRERO: item.meses['FEBRERO'] || 0,
          MARZO: item.meses['MARZO'] || 0,
          ABRIL: item.meses['ABRIL'] || 0,
          MAYO: item.meses['MAYO'] || 0,
          JUNIO: item.meses['JUNIO'] || 0,
          JULIO: item.meses['JULIO'] || 0,
          AGOSTO: item.meses['AGOSTO'] || 0,
          SEPTIEMBRE: item.meses['SEPTIEMBRE'] || 0,
          OCTUBRE: item.meses['OCTUBRE'] || 0,
          NOVIEMBRE: item.meses['NOVIEMBRE'] || 0,
          DICIEMBRE: item.meses['DICIEMBRE'] || 0
        }
      };
      console.log('Enviando payload:', payload);
      this.http.post('http://10.0.29.240:8081/operational-activity-budget-item', payload).subscribe({
        next: (resp) => {
          exitos++;
          if (exitos + errores === total) {
            alert(`Guardado finalizado. Éxitos: ${exitos}, Errores: ${errores}`);
          }
        },
        error: (err) => {
          errores++;
          console.error('Error al guardar item:', err);
          if (exitos + errores === total) {
            alert(`Guardado finalizado. Éxitos: ${exitos}, Errores: ${errores}`);
          }
        }
      });
    }
  }
}
