import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MonthlyBudget } from '../../../models/logic/monthlyBudget.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MonthlyBudgetService {

  private readonly BASE_URL = environment.apiLogicUrl + '/monthly-budget';

  constructor(private http: HttpClient) { }

    getAll(): Observable<MonthlyBudget[]> {
      return this.http.get<MonthlyBudget[]>(this.BASE_URL);
    }

    getById(id: number): Observable<MonthlyBudget> {
      return this.http.get<MonthlyBudget>(`${this.BASE_URL}/${id}`);
    }

    create(objective: MonthlyBudget): Observable<MonthlyBudget> {
      return this.http.post<MonthlyBudget>(this.BASE_URL, objective);
    }

    update(objective: MonthlyBudget): Observable<void> {
      return this.http.put<void>(`${this.BASE_URL}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
