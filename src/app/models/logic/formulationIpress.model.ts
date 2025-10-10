import { Formulation } from "./formulation.model";
import { Ipress } from "./ipress.model";

export interface FormulationIpress {
  idFormulationIpress?: number;
  formulation: Formulation;
  ipress: Ipress;
  goods: number;
  remuneration: number;
  services: number;
  active?: boolean;
  createTime?: Date;
}

// DTOs auxiliares para respuestas específicas del controlador
export interface BudgetSummary {
  formulationId: number;
  totalGoods: number;
  totalRemuneration: number;
  totalServices: number;
  totalBudget: number;
  formulationGoods: number;
  formulationRemuneration: number;
  formulationServices: number;
  formulationBudget: number;
}

export interface BudgetValidation {
  valid: boolean;
  message: string;
}

export interface BudgetValidationRequest {
  formulationId: number;
  goods: number;
  remuneration: number;
  services: number;
  excludeId?: number;
}
