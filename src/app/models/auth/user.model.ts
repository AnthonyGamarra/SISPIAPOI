import { Role } from './role.model';
import { Dependency } from './dependency.model';

export interface User {
  idUser?: number;
  username: string;
  email: string;
  password?: string;
  ldap: boolean;
  enabled: boolean;
  roles: Role[];
  dependencies: Dependency[];
}