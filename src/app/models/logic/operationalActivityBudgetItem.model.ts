import { OperationalActivity } from "./operationalActivity.model";
import { BudgetItem } from "./budgetItem.model";
import { ExpenseType } from "./expenseType.model";

// Representación del enum MonthEnum en TS
export enum MonthEnum {
  ENERO = "ENERO",
  FEBRERO = "FEBRERO",
  MARZO = "MARZO",
  ABRIL = "ABRIL",
  MAYO = "MAYO",
  JUNIO = "JUNIO",
  JULIO = "JULIO",
  AGOSTO = "AGOSTO",
  SEPTIEMBRE = "SEPTIEMBRE",
  OCTUBRE = "OCTUBRE",
  NOVIEMBRE = "NOVIEMBRE",
  DICIEMBRE = "DICIEMBRE"
}

// Interfaz del modelo principal
export interface OperationalActivityBudgetItem {
  operationalActivity: OperationalActivity;
  budgetItem: BudgetItem;
  orderItem: number;
  monthAmounts: Partial<Record<MonthEnum, number>>
  expenseType?: ExpenseType | null;
}
