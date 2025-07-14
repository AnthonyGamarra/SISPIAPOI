import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Form9DataService {
  private form9Data: any = null;
  private originalForm9Data: any = null;

  setData(data: any) {
    this.form9Data = data;
    if (!this.originalForm9Data) {
      // Guarda una copia profunda de los datos originales solo la primera vez
      this.originalForm9Data = JSON.parse(JSON.stringify(data));
    }
  }

  getData() {
    return this.form9Data;
  }

  getOriginalData() {
    return this.originalForm9Data;
  }
  }

