import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExecutedGoal } from '../../../models/logic/executedGoal.model';

@Injectable({
  providedIn: 'root'
})
export class ExecutedGoalService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/executed-goal';

  constructor(private http: HttpClient) { }

    getAll(): Observable<ExecutedGoal[]> {
      return this.http.get<ExecutedGoal[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<ExecutedGoal> {
      return this.http.get<ExecutedGoal>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: ExecutedGoal): Observable<ExecutedGoal> {
      return this.http.post<ExecutedGoal>(this.BASE_URL, objective);
    }
  
    update(objective: ExecutedGoal): Observable<void> {
      return this.http.put<void>(`${this.BASE_URL}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
