import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Goal } from '../../../models/logic/goal.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoalService {

  private readonly BASE_URL = environment.apiLogicUrl + '/goal';

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
  
    update(objective: Goal): Observable<void> {
      return this.http.put<void>(`${this.BASE_URL}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
