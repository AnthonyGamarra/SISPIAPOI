import { StrategicAction } from "./strategicAction.model";
import { Formulation } from "./formulation.model";
import { FinancialFund } from "./financialFund.model";
import { ManagementCenter } from "./managementCenter.model";
import { CostCenter } from "./costCenter.model";
import { MeasurementType } from "./measurementType.model";
import { Goal } from "./goal.model";
import { Priority } from "./priority.model";
import { ExecutedGoal } from "./executedGoal.model";
import { MonthlyGoal } from "./monthlyGoal.model";
import { ExecutedMonthlyGoal } from "./executedMonthlyGoal.model";
import { ActivityFamily } from "./activityFamily.model";

export interface OperationalActivity {
  idOperationalActivity?: number;
  sapCode: string;
  correlativeCode: String;
  name: string;
  active?: boolean;
  strategicAction: StrategicAction;
  formulation: Formulation;
  financialFund: FinancialFund;
  managementCenter: ManagementCenter;
  costCenter: CostCenter;
  measurementType?: MeasurementType;
  measurementUnit?: string;
  goals?: Goal[];
  executedGoals?: ExecutedGoal[];
  monthlyGoals?: MonthlyGoal[];
  executedMonthlyGoals?: ExecutedMonthlyGoal[];
  priority: Priority;
  goods: number;
  remuneration: number;
  services: number;
  description: string;
  activityFamily?: ActivityFamily;
}
