import { StrategicAction } from "./strategicAction.model";
import { Formulation } from "./formulation.model";
import { FinancialFund } from "./financialFund.model";
import { ManagementCenter } from "./managementCenter.model";
import { CostCenter } from "./costCenter.model";
import { MeasurementType } from "./measurementType.model";
import { Goal } from "./goal.model";
import { Priority } from "./priority.model";

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
  measurementType: MeasurementType;
  measurementUnit: string;
  executedGoal?: number | null;
  expectedGoal?: number | null;
  goals?: Goal[];
  priority: Priority;
  goods: number;
  remuneration: number;
  services: number;
}
