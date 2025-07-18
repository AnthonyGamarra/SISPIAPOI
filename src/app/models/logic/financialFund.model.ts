import { Dependency } from "./dependency.model";

export interface FinancialFund {
  idFinancialFund?: number;
  name: string;
  active?: boolean;
  dependency: Dependency;
  codFofi: string;
}

