import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetCategoryService } from '../../core/services/logic/budget-category.service';
import { BudgetItemService } from '../../core/services/logic/budget-item.service';
import { BudgetCategory } from '../../models/logic/budgetCategory.model';
import { BudgetItem } from '../../models/logic/budgetItem.model';

interface Row {
  id: number;
  codPoFi: string;
  name: string;
  tipoGasto: string;
  meses: { [key: string]: number };
  expanded: boolean;
  editable: boolean;
  children?: Row[];
  parent?: Row; // <-- Referencia al padre
}

@Component({
  selector: 'app-form9',
  templateUrl: './form9.component.html',
  styleUrls: ['./form9.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [BudgetCategoryService, BudgetItemService]
})
export class Form9Component implements OnInit {
  meses: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  tiposGasto: string[] = ['Operativo', 'Capital', 'Administrativo'];
  data: Row[] = [];

  constructor(
    private budgetCategoryService: BudgetCategoryService,
    private budgetItemService: BudgetItemService
  ) {}

  ngOnInit() {
    Promise.all([
      this.budgetCategoryService.getAll().toPromise(),
      this.budgetItemService.getAll().toPromise()
    ]).then(([categories, items]) => {
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
          node.parent = parent; // <-- Asignar referencia al padre
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
          meses: this.initMeses(), // Inicializa los meses en cero
          expanded: false,
          editable: true,
          parent: parent // <-- Asignar referencia al padre
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
}
