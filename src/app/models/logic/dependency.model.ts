import { DependencyType } from "./dependencyType.model";

export interface Dependency {
  idDependency?: number;
  name: string;
  description: string;
  active?: boolean;
  dependencyType: DependencyType;
  ospe?: boolean;
}

