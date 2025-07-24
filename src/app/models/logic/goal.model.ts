import { OperationalActivity } from "./operationalActivity.model";
import { ActivityDetail } from "./activityDetail.model";

export interface Goal {
  idGoal?: number;
  active?: boolean;
  operationalActivity?: OperationalActivity;
  activityDetail?: ActivityDetail;
  goalOrder: number;
  value: number;
}