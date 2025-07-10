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
      const codPoFi = item.codPoFi;
      const order = Number(item.order) || 1;
      const idBudgetItem = Number(item.id);
      let realIdBudgetItem = idBudgetItem;
      // Si el id es un timestamp (duplicado), buscar el id original de la fila con el mismo codPoFi y order 1 y id válido
      if (idBudgetItem > 1000000000) {
        const original = (this.datosCapturados as any[]).find((x: any) => x.codPoFi === codPoFi && Number(x.order) === 1 && Number(x.id) < 1000000000);
        if (original) {
          realIdBudgetItem = Number(original.id);
        }
      }
      const payload = {
        orderItem: order,
        operationalActivity: { idOperationalActivity: 1 },
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
        }
      };
      // Validar que todos los campos requeridos estén presentes y correctos
      if (!payload.budgetItem.idBudgetItem || !payload.operationalActivity.idOperationalActivity || !payload.expenseType) {
        errores++;
        console.error('Payload inválido, no se envía:', payload);
        if (exitos + errores === total) {
          alert(`Guardado finalizado. Éxitos: ${exitos}, Errores: ${errores}`);
        }
        continue;
      }
      // Lógica mejorada: PUT para cualquier registro existente (id válido en BD), POST solo para nuevos (id generado por Date.now)
      const baseUrl = `http://10.0.29.240:8081/operational-activity-budget-item`;
      let request$;
      if (idBudgetItem > 1000000000) {
        // Es un registro nuevo (duplicado), usar POST
        request$ = this.http.post(baseUrl, payload);
      } else {
        // Es un registro existente, usar PUT
        const putUrl = `${baseUrl}/${realIdBudgetItem}/${order}`;
        request$ = this.http.put(putUrl, payload);
      }
      request$.subscribe({
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
