import { BudgetCategory } from "./budgetCategory.model";
import { BudgetType } from "./budgetType.model";

export interface BudgetItem {
  idBudgetItem?: number;
  codPoFi: string;  
  name: string;
  active?: boolean;
  budgetType: BudgetType;
  budgetCategory: BudgetCategory;
}

