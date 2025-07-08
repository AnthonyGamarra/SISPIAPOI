export interface BudgetCategory {
  idBudgetCategory?: number;
  codPoFi: string;  
  name: string;
  active?: boolean;
  parentCategory: BudgetCategory;
}

