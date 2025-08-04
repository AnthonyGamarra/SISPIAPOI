import { OperationalActivity } from "./operationalActivity.model";

export interface ExecutedMonthlyBudget {
  idExecutedMonthlyBudget?: number;
  active?: boolean;
  operationalActivity?: OperationalActivity;
  budgetOrder: number;
  value: number;
}