import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExecutedMonthlyGoal } from '../../../models/logic/executedMonthlyGoal.model';

@Injectable({
  providedIn: 'root'
})
export class ExecutedMonthlyGoalService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/executed-monthly-goal';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<ExecutedMonthlyGoal[]> {
      return this.http.get<ExecutedMonthlyGoal[]>(this.BASE_URL);
    }

    getById(id: number): Observable<ExecutedMonthlyGoal> {
      return this.http.get<ExecutedMonthlyGoal>(`${this.BASE_URL}/${id}`);
    }

    create(dto: ExecutedMonthlyGoal): Observable<ExecutedMonthlyGoal> {
      return this.http.post<ExecutedMonthlyGoal>(this.BASE_URL, dto);
    }

    update(dto: ExecutedMonthlyGoal): Observable<void> {
      return this.http.put<void>(this.BASE_URL, dto);
    }

    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
