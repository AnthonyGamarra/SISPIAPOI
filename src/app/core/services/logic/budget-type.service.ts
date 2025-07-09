import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetType } from '../../../models/logic/budgetType.model';

@Injectable({
  providedIn: 'root'
})
export class BudgetTypeService {

  private readonly BASE_URL = 'http://172.21.0.1:8081/budget-type';

  constructor(private http: HttpClient) { }

  getAll(): Observable<BudgetType[]> {
      return this.http.get<BudgetType[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<BudgetType> {
      return this.http.get<BudgetType>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: BudgetType): Observable<BudgetType> {
      return this.http.post<BudgetType>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: BudgetType): Observable<BudgetType> {
      return this.http.put<BudgetType>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
