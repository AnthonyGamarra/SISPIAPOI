import { Dependency } from "./dependency.model";
import { FormulationState } from "./formulationState.model";
import { FormulationSupportFile } from "./formulationSupportFile.model";
import { FormulationType } from "./formulationType.model";
import { OperationalActivity } from "./operationalActivity.model";

export interface Formulation {
  idFormulation?: number;
  active?: boolean;
  dependency: Dependency;
  formulationState: FormulationState;
  formulationSupportFile?: FormulationSupportFile;
  year?: number;
  modification?: number;
  quarter?: number;
  month?: number;
  formulationType?: FormulationType;
  budget?: number; // number in TypeScript covers double/float from backend/db
  goods?: number;
  remuneration?: number;
  services?: number;
  operationalActivities?: OperationalActivity[]; // Adjust type as needed
}

