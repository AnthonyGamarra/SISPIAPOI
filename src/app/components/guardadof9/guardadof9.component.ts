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
            order: row.order || 1,
            codPoFi: row.codPoFi // clave para identificar duplicados
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
      // Buscar si hay otra fila con el mismo codPoFi y diferente order
      const codPoFi = item.codPoFi;
      const order = Number(item.order) || 1;
      const idBudgetItem = Number(item.id);
      // El idBudgetItem debe ser único por codPoFi+order, pero si es duplicado (por Date.now), hay que mapearlo correctamente
      // Si el id es un timestamp (duplicado), se debe enviar el idBudgetItem original (de la fila original) y el order correspondiente
      // Si el id es un número muy grande (timestamp), buscar el id original
      let realIdBudgetItem = idBudgetItem;
      // Si el id es un timestamp (duplicado), buscar el id original de la fila con el mismo codPoFi y order 1
      if (idBudgetItem > 1000000000) {
        const original = (this.datosCapturados as any[]).find((x: any) => x.codPoFi === codPoFi && Number(x.order) === 1 && Number(x.id) < 1000000000);
        if (original) {
          realIdBudgetItem = Number(original.id);
        }
      }
      // Para cada orden > 1, el idBudgetItem debe ser el original, pero el orderItem debe ser el correspondiente
      // Así, si hay n filas con el mismo codPoFi, todas se guardan con el mismo idBudgetItem pero distinto orderItem
      const payload = {
        orderItem: order,
        operationalActivity: { idOperationalActivity: 8 },
        budgetItem: { idBudgetItem: realIdBudgetItem },
        expenseType: Number(item.tipoGastoId) ? { idExpenseType: Number(item.tipoGastoId) } : null,
        monthAmounts: {
          ENERO: Number(item.meses['ENERO']) || 0,
          FEBRERO: Number(item.meses['FEBRERO']) || 0,
          MARZO: Number(item.meses['MARZO']) || 0,
          ABRIL: Number(item.meses['ABRIL']) || 0,
          MAYO: Number(item.meses['MAYO']) || 0,
          JUNIO: Number(item.meses['JUNIO']) || 0,
          JULIO: Number(item.meses['JULIO']) || 0,
          AGOSTO: Number(item.meses['AGOSTO']) || 0,
          SEPTIEMBRE: Number(item.meses['SEPTIEMBRE']) || 0,
          OCTUBRE: Number(item.meses['OCTUBRE']) || 0,
          NOVIEMBRE: Number(item.meses['NOVIEMBRE']) || 0,
          DICIEMBRE: Number(item.meses['DICIEMBRE']) || 0
        },
        createTime: new Date().toISOString()
      };
      // Validar que los campos requeridos estén presentes y correctos
      // Para la fila original (order === 1), expenseType es obligatorio
      if (!payload.budgetItem.idBudgetItem || !payload.operationalActivity.idOperationalActivity || (order === 1 && !payload.expenseType)) {
        errores++;
        console.error('Payload inválido, no se envía:', payload);
        if (exitos + errores === total) {
          alert(`Guardado finalizado. Éxitos: ${exitos}, Errores: ${errores}`);
        }
        continue;
      }
      // Siempre usar PUT para todos los duplicados (order > 1) y POST solo para el original (order === 1)
      const url = (order === 1 && idBudgetItem < 1000000000) ?
        `http://10.0.29.240:8081/operational-activity-budget-item` :
        `http://10.0.29.240:8081/operational-activity-budget-item`;
      const method = (order === 1 && idBudgetItem < 1000000000) ? 'post' : 'put';
      console.log('Enviando payload:', payload, 'con método', method);
      this.http[method](url, payload).subscribe({
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
