import { Dependency } from "./dependency.model";
import { IpressLevel } from "./ipressLevel.model";
import { IpressComplexity } from "./ipressComplexity.model";

export interface Ipress {
  idIpress?: number;
  code: string;
  name: string;
  active?: boolean;
  dependency: Dependency;
  ipressLevel: IpressLevel;
  ipressComplexity: IpressComplexity;
  createTime?: Date;
}
