import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StrategicObjective } from '../../../models/logic/strategicObjective.model';
import { MinMaxYears } from '../../../models/logic/min-max-years.model';

@Injectable({
  providedIn: 'root'
})
export class StrategicObjectiveService {
  private readonly BASE_URL = 'http://10.0.2.144:8081/strategic-objective';

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

  getMinMaxYears(): Observable<MinMaxYears> {
    return this.http.get<MinMaxYears>(`${this.BASE_URL}/years-range`);
  }
  
}
