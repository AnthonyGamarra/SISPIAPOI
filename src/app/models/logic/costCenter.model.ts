import { Dependency } from "./dependency.model";

export interface CostCenter {
  idCostCenter?: number;
  costCenterCode: string;  
  name: string;
  active?: boolean;
  dependency: Dependency;
}

