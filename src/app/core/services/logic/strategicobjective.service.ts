import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StrategicObjective } from '../../../models/logic/strategicObjective.model';

@Injectable({
  providedIn: 'root'
})
export class StrategicobjectiveService {
  private readonly BASE_URL = 'http://10.0.29.240:8081/strategic-objective';

  constructor(private http: HttpClient) { }

  getAll(): Observable<StrategicObjective[]> {
    return this.http.get<StrategicObjective[]>(this.BASE_URL);
  }

  getById(id: number): Observable<StrategicObjective> {
    return this.http.get<StrategicObjective>(`${this.BASE_URL}/${id}`);
  }

  create(objective: StrategicObjective): Observable<StrategicObjective> {
    return this.http.post<StrategicObjective>(this.BASE_URL, objective);
  }

  update(id: number, objective: StrategicObjective): Observable<StrategicObjective> {
    return this.http.put<StrategicObjective>(`${this.BASE_URL}/${id}`, objective);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }
}
