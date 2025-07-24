import { OperationalActivity } from "./operationalActivity.model";
import { ActivityDetail } from "./activityDetail.model";

export interface MonthlyGoal {
  idMonthlyGoal?: number;
  active?: boolean;
  operationalActivity?: OperationalActivity;
  activityDetail?: ActivityDetail;
  goalOrder: number;
  value: number;
}