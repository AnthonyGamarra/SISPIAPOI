import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetItem } from '../../../models/logic/budgetItem.model';

@Injectable({
  providedIn: 'root'
})
export class BudgetItemService {

  private readonly BASE_URL = 'http://10.0.29.117:8081/budget-item';

  constructor(private http: HttpClient) { }

  getAll(): Observable<BudgetItem[]> {
      return this.http.get<BudgetItem[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<BudgetItem> {
      return this.http.get<BudgetItem>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: BudgetItem): Observable<BudgetItem> {
      return this.http.post<BudgetItem>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: BudgetItem): Observable<BudgetItem> {
      return this.http.put<BudgetItem>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
