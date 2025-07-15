import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetCategoryService } from '../../core/services/logic/budget-category.service';
import { BudgetItemService } from '../../core/services/logic/budget-item.service';
import { ExpenseTypeService } from '../../core/services/logic/expense-type.service';
import { OperationalActivityBudgetItemService } from '../../core/services/logic/operational-activity-budget-item.service';
import { ExpenseType } from '../../models/logic/expenseType.model';
import { BudgetCategory } from '../../models/logic/budgetCategory.model';
import { BudgetItem } from '../../models/logic/budgetItem.model';
import { ButtonModule } from 'primeng/button';
import { Form9DataService } from '../../core/services/logic/form9-data.service';
import { OperationalActivityBudgetItem } from '../../models/logic/operationalActivityBudgetItem.model';


interface Row {
  id: number;
  codPoFi: string;
  name: string;
  tipoGasto: string;
  meses: { [key: string]: number };
  expanded: boolean;
  editable: boolean;
  children?: Row[];
  parent?: Row;
  isOriginal?: boolean;  // <-- flag para fila original
  order?: number; // nuevo campo para el orden
}

@Component({
  selector: 'app-form9',
  templateUrl: './form9.component.html',
  styleUrls: ['./form9.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule,ButtonModule],
  providers: [BudgetCategoryService, BudgetItemService, ExpenseTypeService]
})
export class Form9Component implements OnInit {
  @Input() idOperationalActivity: number | null = null;

  eliminarFila(row: Row) {
    if (!row || !row.id) return;
    if (!confirm('¿Está seguro que desea eliminar este registro?')) return;
    this.operationalActivityBudgetItemService.deleteById(14, row.id).subscribe({
      next: () => {
        // Reiniciar la fila a valores predeterminados, pero no eliminar del visual
        for (const mes of this.meses) {
          row.meses[mes] = 0;
        }
        row.tipoGasto = '';
        // Puedes limpiar otros campos si lo deseas
        // row.order = 1;
        // row.isOriginal = true;
        if (row.parent) {
          this.updateParentValues(row.parent);
        }
        this.updateForm9DataService();
        alert('Registro eliminado correctamente.');
      },
      error: (err) => {
        alert('Error al eliminar el registro.');
        console.error(err);
      }
    });
  }
  meses: string[] = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL',
    'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
    'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  tiposGasto: ExpenseType[] = [];
  data: Row[] = [];

  constructor(
    private budgetCategoryService: BudgetCategoryService,
    private budgetItemService: BudgetItemService,
    private expenseTypeService: ExpenseTypeService,
    private form9DataService: Form9DataService, // inyectar servicio
    private operationalActivityBudgetItemService: OperationalActivityBudgetItemService // nuevo servicio
  ) {}

  ngOnInit() {
    if (this.idOperationalActivity) {
      console.log(this.idOperationalActivity)
          Promise.all([
      this.budgetCategoryService.getAll().toPromise(),
      this.budgetItemService.getAll().toPromise(),
      this.expenseTypeService.getAll().toPromise(),
      
        this.operationalActivityBudgetItemService.getByOperationalActivity(this.idOperationalActivity).toPromise() // id fijo
           
    ]).then(([categories, items, expenseTypes, oaBudgetItems]) => {
      this.tiposGasto = expenseTypes || [];
      if (categories && items) {
        this.data = this.buildRows(categories, items, oaBudgetItems || []);
        this.form9DataService.setData(this.data); // guardar datos iniciales
      } else {
        this.data = [];
        this.form9DataService.setData([]);
      }
    });
    } 

  }

  buildRows(categories: BudgetCategory[], items: BudgetItem[], oaBudgetItems: OperationalActivityBudgetItem[]): Row[] {
    // Map de categorías
    const catMap = new Map<number, Row>();
    for (const cat of categories) {
      const id = cat.idBudgetCategory ?? 0;
      catMap.set(id, {
        id: id,
        codPoFi: cat.codPoFi || '',
        name: cat.name,
        tipoGasto: '',
        meses: this.initMeses(),
        expanded: false,
        editable: false,
        children: []
      });
    }
    // Relacionar jerarquía de categorías
    const roots: Row[] = [];
    for (const cat of categories) {
      const id = cat.idBudgetCategory ?? 0;
      const node = catMap.get(id)!;
      if (cat.parentCategory && cat.parentCategory.idBudgetCategory !== undefined) {
        const parentId = cat.parentCategory.idBudgetCategory ?? 0;
        const parent = catMap.get(parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
          node.parent = parent;
        }
      } else {
        roots.push(node);
      }
    }
    // Relacionar items como hijos editables de la categoría correspondiente
    // Agrupar por idBudgetItem y procesar todos los órdenes
    const itemsById = new Map<number, BudgetItem>();
    for (const item of items) {
      if (item.idBudgetItem !== undefined) {
        itemsById.set(item.idBudgetItem, item);
      }
    }
    // Agrupar todos los oaBudgetItems por idBudgetItem
    const oaItemsGrouped = new Map<number, OperationalActivityBudgetItem[]>();
    for (const oa of oaBudgetItems) {
      const id = oa.budgetItem.idBudgetItem ?? 0;
      if (!oaItemsGrouped.has(id)) oaItemsGrouped.set(id, []);
      oaItemsGrouped.get(id)!.push(oa);
    }
    for (const [id, item] of itemsById.entries()) {
      const parentId = item.budgetCategory.idBudgetCategory ?? 0;
      const parent = catMap.get(parentId);
      if (parent) {
        // Si hay OA para este item, crear una fila por cada orden
        const oaList = oaItemsGrouped.get(id) || [];
        if (oaList.length > 0) {
          // Ordenar por orderItem ascendente
          oaList.sort((a, b) => (a.orderItem || 1) - (b.orderItem || 1));
          for (const oaItem of oaList) {
            const meses = oaItem && oaItem.monthAmounts ? this.initMeses(oaItem.monthAmounts) : this.initMeses();
            const tipoGasto = oaItem && oaItem.expenseType ? String(oaItem.expenseType.idExpenseType) : (item.budgetType?.name || '');
            const order = oaItem && typeof oaItem.orderItem === 'number' ? oaItem.orderItem : 1;
            const itemRow: Row = {
              id: item.idBudgetItem ?? 0,
              codPoFi: item.codPoFi,
              name: item.name,
              tipoGasto: tipoGasto,
              meses: meses,
              expanded: false,
              editable: true,
              parent: parent,
              isOriginal: order === 1, // solo el primero es original
              order: order
            };
            parent.children = parent.children || [];
            parent.children.push(itemRow);
          }
        } else {
          // Si no hay OA, crear solo la fila original
          const itemRow: Row = {
            id: item.idBudgetItem ?? 0,
            codPoFi: item.codPoFi,
            name: item.name,
            tipoGasto: item.budgetType?.name || '',
            meses: this.initMeses(),
            expanded: false,
            editable: true,
            parent: parent,
            isOriginal: true,
            order: 1
          };
          parent.children = parent.children || [];
          parent.children.push(itemRow);
        }
      }
    }
    // Limpiar arrays vacíos
    for (const row of catMap.values()) {
      if (row.children && row.children.length === 0) {
        delete row.children;
      }
    }
    // Calcular sumas iniciales por categoría
    for (const root of roots) {
      this.updateParentValuesRecursive(root);
    }
    return roots;
  }

  initMeses(values: Partial<{ [key: string]: number }> = {}): { [key: string]: number } {
    const mesesObj: { [key: string]: number } = {};
    for (const mes of this.meses) {
      mesesObj[mes] = values[mes] || 0;
    }
    return mesesObj;
  }

  toggleExpand(row: Row) {
    row.expanded = !row.expanded;
  }

  updateParentValues(parent: Row) {
    if (parent && parent.children) {
      for (const mes of this.meses) {
        parent.meses[mes] = parent.children.reduce((sum, child) => sum + (child.meses[mes] || 0), 0);
      }
      if (parent.parent) {
        this.updateParentValues(parent.parent);
      }
    }
  }

  updateParentValuesRecursive(row: Row) {
    if (row.children && row.children.length > 0) {
      for (const child of row.children) {
        this.updateParentValuesRecursive(child);
      }
      for (const mes of this.meses) {
        row.meses[mes] = row.children.reduce((sum, child) => sum + (child.meses[mes] || 0), 0);
      }
    }
  }

  calcularTotal(row: Row): number {
    return this.meses.reduce((sum, mes) => sum + (row.meses[mes] || 0), 0);
  }

  onInputValueChange(row: Row, mes: string) {
    if (row.meses[mes] < 0 || row.meses[mes] === null || row.meses[mes] === undefined) {
      row.meses[mes] = 0;
    }
    if (row.parent) {
      this.updateParentValues(row.parent);
    }
    this.updateForm9DataService(); // actualizar datos
  }
  replicarEnero(row: Row) {
    // Copia el valor del primer mes definido en this.meses (debe ser ENERO)
    const primerMes = this.meses[0];
    const valor = row.meses[primerMes] || 0;
    for (const mes of this.meses) {
      row.meses[mes] = valor;
    }
    if (row.parent) {
      this.updateParentValues(row.parent);
    }
    this.updateForm9DataService(); // actualizar datos
  }

  // Llamar esto cada vez que los datos cambien
  updateForm9DataService() {
    this.form9DataService.setData(this.data);
  }
}
