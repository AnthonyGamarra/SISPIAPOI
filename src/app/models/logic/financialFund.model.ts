import { Dependency } from "./dependency.model";

export interface FinancialFund {
  idCostCenter?: number;
  name: string;
  active?: boolean;
  dependency: Dependency;
}

