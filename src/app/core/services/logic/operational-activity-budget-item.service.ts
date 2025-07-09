import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OperationalActivityBudgetItem } from '../../../models/logic/operationalActivityBudgetItem.model';

@Injectable({
  providedIn: 'root'
})
export class OperationalActivityBudgetItemService {

  private readonly BASE_URL = 'http://172.21.0.1:8081/operational-activity-budget-item';
  
    constructor(private http: HttpClient) { }
  
    // Obtener todos
    getAll(): Observable<OperationalActivityBudgetItem[]> {
      return this.http.get<OperationalActivityBudgetItem[]>(`${this.BASE_URL}`);
    }

    // Obtener por idOperationalActivity
    getByOperationalActivity(idOperationalActivity: number): Observable<OperationalActivityBudgetItem[]> {
      return this.http.get<OperationalActivityBudgetItem[]>(`${this.BASE_URL}/operational-activity/${idOperationalActivity}`);
    }

    // Obtener por ambos IDs
    getById(idOperationalActivity: number, idBudgetItem: number): Observable<OperationalActivityBudgetItem> {
      return this.http.get<OperationalActivityBudgetItem>(`${this.BASE_URL}/${idOperationalActivity}/${idBudgetItem}`);
    }

    // Crear nuevo
    create(data: OperationalActivityBudgetItem): Observable<void> {
      return this.http.post<void>(`${this.BASE_URL}`, data);
    }

    // Actualizar
    update(data: OperationalActivityBudgetItem): Observable<OperationalActivityBudgetItem> {
      return this.http.put<OperationalActivityBudgetItem>(`${this.BASE_URL}`, data);
    }

    // Eliminar por ambos IDs
    deleteById(idOperationalActivity: number, idBudgetItem: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${idOperationalActivity}/${idBudgetItem}`);
    }

    // Eliminar todos por idOperationalActivity
    deleteByOperationalActivity(idOperationalActivity: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/operational-activity/${idOperationalActivity}`);
    }

}
