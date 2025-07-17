import { Dependency } from "./dependency.model";
import { FormulationState } from "./formulationState.model";
import { FormulationSupportFile } from "./formulationSupportFile.model";

export interface Formulation {
  idFormulation?: number;
  active?: boolean;
  dependency: Dependency;
  formulationState: FormulationState;
  formulationSupportFile?: FormulationSupportFile;
  year?: number;
  modification?: number;
  quarter?: number;
}

