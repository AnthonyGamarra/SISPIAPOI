import { OperationalActivity } from "./operationalActivity.model";

export interface ExecutedGoal {
  idExecutedGoal?: number;
  active?: boolean;
  operationalActivity: OperationalActivity;
  goalOrder: number;
  value: number;
}