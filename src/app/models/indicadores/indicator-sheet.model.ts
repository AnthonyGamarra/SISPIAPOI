import { AuxiliarData } from "./auxiliar-data.model";
import { IndicatorBehavior } from "./indicator-behavior.model";
import { Variable } from "./variable.model";

export interface IndicatorSheet {
  idIndicatorSheet?: number;
  indicatorName: string;
  idStrategicObjective?: number;
  idDependency?: number;
  perspective?: string;
  justification?: string;
  formula?: string;
  measurementUnit?: string;
  indicatorBehavior?: IndicatorBehavior;
  variables?: Variable[];
  year?: number;
  modification?: number;
  analysis?: string;
  limitations?: string;
  actions?: string;
  responsible?: string;
  areas?: string;
  comments?: string;
  auxiliarData?: AuxiliarData[];
  active?: boolean;
}

