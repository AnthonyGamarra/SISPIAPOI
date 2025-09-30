import { IndicatorSheet } from "./indicator-sheet.model";

export interface Variable {
  idVariable?: number;
  symbol?: string;
  operationalDefinition?: number;
  source?: number;
  parameters?: string;
  responsible?: string;
  analysis?: string;
  indicatorSheet?: IndicatorSheet;
  active?: boolean;
}

