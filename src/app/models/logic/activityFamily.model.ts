import { MeasurementType } from "./measurementType.model";

export interface ActivityFamily {
  idActivityFamily?: number;
  name: string;
  description?: string;
  active?: boolean;
  type?: string;
  parentActivityFamily?: ActivityFamily;
  measurementType?: MeasurementType;
}

