import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MonthlyGoal } from '../../../models/logic/monthlyGoal.model';

@Injectable({
  providedIn: 'root'
})
export class MonthlyGoalService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/monthly-goal';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<MonthlyGoal[]> {
      return this.http.get<MonthlyGoal[]>(this.BASE_URL);
    }

    getById(id: number): Observable<MonthlyGoal> {
      return this.http.get<MonthlyGoal>(`${this.BASE_URL}/${id}`);
    }

    create(dto: MonthlyGoal): Observable<MonthlyGoal> {
      return this.http.post<MonthlyGoal>(this.BASE_URL, dto);
    }

    update(dto: MonthlyGoal): Observable<void> {
      return this.http.put<void>(this.BASE_URL, dto);
    }

    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
