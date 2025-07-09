import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetCategoryService } from '../../core/services/logic/budget-category.service';
import { BudgetItemService } from '../../core/services/logic/budget-item.service';
import { ExpenseTypeService } from '../../core/services/logic/expense-type.service';
import { ExpenseType } from '../../models/logic/expenseType.model';
import { BudgetCategory } from '../../models/logic/budgetCategory.model';
import { BudgetItem } from '../../models/logic/budgetItem.model';
import { ButtonModule } from 'primeng/button';


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
  meses: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  tiposGasto: ExpenseType[] = [];
  data: Row[] = [];

  constructor(
    private budgetCategoryService: BudgetCategoryService,
    private budgetItemService: BudgetItemService,
    private expenseTypeService: ExpenseTypeService
  ) {}

  ngOnInit() {
    Promise.all([
      this.budgetCategoryService.getAll().toPromise(),
      this.budgetItemService.getAll().toPromise(),
      this.expenseTypeService.getAll().toPromise()
    ]).then(([categories, items, expenseTypes]) => {
      this.tiposGasto = expenseTypes || [];
      if (categories && items) {
        this.data = this.buildRows(categories, items);
      } else {
        this.data = [];
      }
    });
  }

  buildRows(categories: BudgetCategory[], items: BudgetItem[]): Row[] {
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
    for (const item of items) {
      const parentId = item.budgetCategory.idBudgetCategory ?? 0;
      const parent = catMap.get(parentId);
      if (parent) {
        const itemRow: Row = {
          id: item.idBudgetItem ?? 0,
          codPoFi: item.codPoFi,
          name: item.name,
          tipoGasto: item.budgetType?.name || '',
          meses: this.initMeses(),
          expanded: false,
          editable: true,
          parent: parent,
          isOriginal: true // <-- marca original
        };
        parent.children = parent.children || [];
        parent.children.push(itemRow);
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

  duplicarItem(row: Row) {
    if (!row.parent) return;

    const parent = row.parent;
    parent.children = parent.children ?? [];

    const index = parent.children.indexOf(row);
    if (index === -1) return;

    const nuevoItem: Row = {
      id: Date.now(),
      codPoFi: row.codPoFi,
      name: row.name,
      tipoGasto: row.tipoGasto,
      meses: { ...row.meses },
      expanded: false,
      editable: true,
      parent: parent,
      isOriginal: false
    };

    parent.children.splice(index + 1, 0, nuevoItem);
    this.updateParentValues(parent);
  }

  eliminarItem(row: Row) {
    if (row.isOriginal) {
      alert('No se puede eliminar la fila original.');
      return;
    }

    const parent = row.parent;
    if (!parent || !parent.children) return;

    const index = parent.children.indexOf(row);
    if (index !== -1) {
      parent.children.splice(index, 1);
      this.updateParentValues(parent);
    }
  }
  onInputValueChange(row: Row, mes: string) {
    if (row.meses[mes] < 0 || row.meses[mes] === null || row.meses[mes] === undefined) {
      row.meses[mes] = 0;
    }
    if (row.parent) {
      this.updateParentValues(row.parent);
    }
  }
  replicarEnero(row: Row) {
    const valor = row.meses['Enero'] || 0;
    for (const mes of this.meses) {
      row.meses[mes] = valor;
    }
    if (row.parent) {
      this.updateParentValues(row.parent);
    }
  }
}
