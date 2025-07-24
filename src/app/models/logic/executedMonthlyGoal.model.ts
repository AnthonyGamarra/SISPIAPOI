import { OperationalActivity } from "./operationalActivity.model";

export interface ExecutedMonthlyGoal {
  idExecutedMonthlyGoal?: number;
  active?: boolean;
  operationalActivity?: OperationalActivity;
  goalOrder: number;
  value: number;
}