import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Goal } from '../../../models/logic/goal.model';

@Injectable({
  providedIn: 'root'
})
export class GoalService {

  private readonly BASE_URL = 'http://10.0.29.240:8081/goal';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Goal[]> {
      return this.http.get<Goal[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<Goal> {
      return this.http.get<Goal>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: Goal): Observable<Goal> {
      return this.http.post<Goal>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: Goal): Observable<Goal> {
      return this.http.put<Goal>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
