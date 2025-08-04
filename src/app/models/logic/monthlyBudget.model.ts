import { OperationalActivity } from "./operationalActivity.model";
import { ActivityDetail } from "./activityDetail.model";

export interface MonthlyBudget {
  idMonthlyBudget?: number;
  active?: boolean;
  operationalActivity?: OperationalActivity;
  activityDetail?: ActivityDetail;
  budgetOrder: number;
  value: number;
}