import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Form9DataService {
  private form9Data: any = null;

  setData(data: any) {
    this.form9Data = data;
  }

  getData() {
    return this.form9Data;
  }
}
