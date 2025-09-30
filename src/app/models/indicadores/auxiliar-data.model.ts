import { IndicatorSheet } from "./indicator-sheet.model";
import { DataKind } from "./data-kind.enum";

export interface AuxiliarData {
  idAuxiliarData?: number;
  indicatorValue?: number;
  indicatorSheet: IndicatorSheet;
  dataKind?: DataKind;
  active?: boolean;
}

