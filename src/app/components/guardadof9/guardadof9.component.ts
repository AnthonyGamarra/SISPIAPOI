import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Form9DataService } from '../../core/services/logic/form9-data.service';
import { ButtonModule } from 'primeng/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { OperationalActivityBudgetItemService } from '../../core/services/logic/operational-activity-budget-item.service';
import { LottieComponent } from 'ngx-lottie';
import { AnimationOptions } from 'ngx-lottie';
import { FinancialFund } from '../../models/logic/financialFund.model';
import { OperationalActivity } from '../../models/logic/operationalActivity.model';

@Component({
  selector: 'app-guardadof9',
  standalone: true,
  imports: [CommonModule, ButtonModule, HttpClientModule,LottieComponent],
  templateUrl: './guardadof9.component.html',
  styleUrl: './guardadof9.component.scss'
})

export class Guardadof9Component {
  @Input() idOperationalActivity: number | null = null;
  datosCapturados: any = null;

  constructor(
    private form9DataService: Form9DataService,
    private http: HttpClient,
    private operationalActivityBudgetItemService: OperationalActivityBudgetItemService
  ) {}

  options: AnimationOptions = {
    path: 'resources/succes-allert.json'
  };
 showSuccessAnimation = false;

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
          // Clonar meses y quitar ESTIMADO
          const { ESTIMADO, ...mesesSinEstimado } = row.meses || {};
          items.push({
            id: row.id,
            meses: mesesSinEstimado,
            tipoGastoId: row.tipoGasto,
            codPoFi: row.codPoFi,
            order: row.order || 1,
            financialFundId: row.financialFund?.idFinancialFund || null,
            estimation: typeof row.estimation === 'number' ? row.estimation : 0
          });
        }

        if (row.children) {
          items = items.concat(extraerBudgetItemsConInfo(row.children));
        }
      }
      // Permitir duplicados por id pero con distinto order
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
    // Obtener los datos originales del backend antes de guardar
    if (!this.idOperationalActivity) {
      alert('No se ha seleccionado una actividad operativa.');
      return;
    }
    this.operationalActivityBudgetItemService.getByOperationalActivity(this.idOperationalActivity).subscribe({
      next: (originalData: any[]) => {
        let exitos = 0;
        let errores = 0;
        let total = this.datosCapturados.length;
        for (const item of this.datosCapturados) {
          const idBudgetItem = Number(item.id);
          // Validar tipo de gasto y fondo financiero si hay valores en meses
          const tieneValores = Object.values(item.meses).some((v: any) => Number(v) > 0);
          if (tieneValores && (!item.tipoGastoId || item.tipoGastoId === '' || item.tipoGastoId === null)) {
            alert('Seleccione el tipo de gasto para los items con valores.');
            errores++;
            continue;
          }
          // Si no hay fondo financiero, simplemente no guardar este item
          if (tieneValores && (!item.financialFundId || item.financialFundId === null)) {
            continue;
          }
          // Buscar si existe en los datos originales del backend (comparar idBudgetItem y orderItem)
          const originalItem = originalData.find((orig: any) =>
            orig.budgetItem?.idBudgetItem === idBudgetItem &&
            (Number(orig.orderItem || 1) === Number(item.order || 1))
          );
          // Construir el payload usando los objetos completos si existen
          const estimationValue = typeof item.estimation === 'number' ? item.estimation : 0;
          const payload = {
            operationalActivity: originalItem?.operationalActivity?.idOperationalActivity
              ? { idOperationalActivity: originalItem.operationalActivity.idOperationalActivity } as OperationalActivity
              : { idOperationalActivity: this.idOperationalActivity } as OperationalActivity,
            budgetItem: originalItem?.budgetItem || { idBudgetItem: idBudgetItem },
            expenseType: Number(item.tipoGastoId)
              ? (originalItem?.expenseType && Number(item.tipoGastoId) === Number(originalItem.expenseType.idExpenseType)
                  ? originalItem.expenseType
                  : { idExpenseType: Number(item.tipoGastoId) })
              : null,
            financialFund: { idFinancialFund: item.financialFundId } as FinancialFund,
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
            orderItem: item.order || 1,
            estimation: estimationValue
          };
          // Validar que los campos requeridos estén presentes y correctos (permitir valores 0)
          if (
            payload.budgetItem.idBudgetItem === undefined || payload.budgetItem.idBudgetItem === null ||
            payload.operationalActivity.idOperationalActivity === undefined || payload.operationalActivity.idOperationalActivity === null ||
            !payload.expenseType
          ) {
            errores++;
            console.error('Payload inválido, no se envía:', payload);
            if (exitos + errores === total) {
              alert(`Guardado finalizado. Éxitos: ${exitos}, Errores: ${errores}`);
            }
            continue;
          }
          let changed = false;
          if (originalItem) {
            // Compara meses y tipoGastoId
            for (const mes of [
              'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']) {
              if (Number(item.meses[mes]) !== Number(originalItem.monthAmounts?.[mes] || 0)) {
                changed = true;
                break;
              }
            }
            if (!changed && Number(item.tipoGastoId) !== Number(originalItem.expenseType?.idExpenseType)) {
              changed = true;
            }
          }
          // Si existe y cambió, PUT; si no existe, POST
          if (originalItem) {
            if (changed) {
              // Actualizar
              console.log('Enviando payload:', payload, 'con método', 'put');
              this.operationalActivityBudgetItemService.update(payload).subscribe({
                next: () => {
                  exitos++;
                  if (exitos + errores === total) {
                    this.showSuccessAnimation = true;
                    setTimeout(() => {
                      this.showSuccessAnimation = false;
                    }, 2500);
                  }
                },
                error: (err) => {
                  errores++;
                  console.error('Error al actualizar item:', err);
                  if (exitos + errores === total) {
                    this.showSuccessAnimation = true;
                    setTimeout(() => {
                      this.showSuccessAnimation = false;
                    }, 2500);
                  }
                }
              });
            } else {
              // No cambió, no hacer nada
              exitos++;
              if (exitos + errores === total) {
                this.showSuccessAnimation = true;
                setTimeout(() => {
                  this.showSuccessAnimation = false;
                }, 2500);
              }
            }
          } else {
            // Nuevo registro
            console.log('Enviando payload:', payload, 'con método', 'post');
            this.operationalActivityBudgetItemService.create(payload).subscribe({
              next: () => {
                exitos++;
                if (exitos + errores === total) {
                  this.showSuccessAnimation = true;
                  setTimeout(() => {
                    this.showSuccessAnimation = false;
                  }, 2500);
                }
              },
              error: (err) => {
                errores++;
                console.error('Error al guardar item:', err);
                if (exitos + errores === total) {
                  this.showSuccessAnimation = true;
                  setTimeout(() => {
                    this.showSuccessAnimation = false;
                  }, 2500);
                }
              }
            });
          }
        }
      },
      error: (err) => {
        alert('Error al obtener datos originales del backend.');
        console.error(err);
      }
    });
  }
}
