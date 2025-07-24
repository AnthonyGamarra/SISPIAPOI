import { StrategicAction } from "./strategicAction.model";
import { Goal } from "./goal.model";
import { MonthlyGoal } from "./monthlyGoal.model";
import { ActivityFamily } from "./activityFamily.model";
import { FormulationType } from "./formulationType.model";

export interface ActivityDetail {
  idActivityDetail?: number;
  name: string;
  description?: string;
  active?: boolean;
  head?: boolean;
  measurementUnit?: string;
  strategicAction: StrategicAction;
  formulationType: FormulationType;
  activityFamily?: ActivityFamily;
  goals?: Goal[];
  monthlyGoals?: MonthlyGoal[];
  year: number;
}
