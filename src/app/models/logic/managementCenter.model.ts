import { Dependency } from "./dependency.model";

export interface ManagementCenter {
  idManagementCenter?: number;
  name: string;
  description: string;
  managementCenterCode: string;
  active?: boolean;
  head?: boolean;
  dependency: Dependency;
}

