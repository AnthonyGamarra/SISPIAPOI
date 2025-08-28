import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExecutedMonthlyBudget } from '../../../models/logic/executedMonthlyBudget.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExecutedMonthlyBudgetService {

  private readonly BASE_URL = environment.apiLogicUrl + '/executed-monthly-budget';

  constructor(private http: HttpClient) { }

    getAll(): Observable<ExecutedMonthlyBudget[]> {
      return this.http.get<ExecutedMonthlyBudget[]>(this.BASE_URL);
    }

    getById(id: number): Observable<ExecutedMonthlyBudget> {
      return this.http.get<ExecutedMonthlyBudget>(`${this.BASE_URL}/${id}`);
    }

    create(objective: ExecutedMonthlyBudget): Observable<ExecutedMonthlyBudget> {
      return this.http.post<ExecutedMonthlyBudget>(this.BASE_URL, objective);
    }
  
    update(objective: ExecutedMonthlyBudget): Observable<void> {
      return this.http.put<void>(`${this.BASE_URL}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
