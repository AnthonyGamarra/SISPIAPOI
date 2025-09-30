import { AuxiliarData } from './auxiliar-data.model';
import { Variable } from './variable.model';

export class AuxiliarDataVariable {
  auxiliarData!: AuxiliarData;
  variable!: Variable;
  total: boolean = false;
  value: number = 0;
  year!: number;
  quarter?: number | null;

  constructor(init?: Partial<AuxiliarDataVariable>) {
    Object.assign(this, init);
  }

  isPeriodConsistent(): boolean {
    if (this.total === true) {
      return this.quarter == null;
    }
    return this.quarter != null && this.quarter >= 1 && this.quarter <= 4;
  }

  /**
   * Validate fields according to Java constraints.
   * - year between 2000 and 2200
   * - quarter null when total true; otherwise between 1 and 4
   * Returns array of error messages (empty if valid).
   */
  validate(): string[] {
    const errors: string[] = [];

    if (this.year == null || this.year < 2000 || this.year > 2200) {
      errors.push('year must be between 2000 and 2200');
    }

    if (this.total == null) {
      errors.push('total must be provided');
    }

    if (this.total === true) {
      if (this.quarter != null) {
        errors.push('If total is true then quarter must be null');
      }
    } else {
      if (this.quarter == null || this.quarter < 1 || this.quarter > 4) {
        errors.push('If total is false quarter must be between 1 and 4');
      }
    }

    return errors;
  }
}
