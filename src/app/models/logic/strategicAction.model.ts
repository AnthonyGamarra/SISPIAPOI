import { StrategicObjective } from "./strategicObjective.model";

export interface StrategicAction {
  idStrategicAction: number;
  code: string;
  name: string;
  active: boolean;
  strategicObjective: StrategicObjective;
}

