import { OperationalActivity } from "./operationalActivity.model";

export interface Goal {
  idGoal: number;
  active?: boolean;
  operationalActivity: OperationalActivity;
  goalOrder: number;
  value: number; 
}
