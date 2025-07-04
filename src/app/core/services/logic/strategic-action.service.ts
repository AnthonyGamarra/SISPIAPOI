import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StrategicAction } from '../../../models/logic/strategicAction.model';

@Injectable({
  providedIn: 'root'
})
export class StrategicActionService {

  private readonly BASE_URL = 'http://10.0.29.240:8081/strategic-action';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<StrategicAction[]> {
      return this.http.get<StrategicAction[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<StrategicAction> {
      return this.http.get<StrategicAction>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: StrategicAction): Observable<StrategicAction> {
      return this.http.post<StrategicAction>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: StrategicAction): Observable<StrategicAction> {
      return this.http.put<StrategicAction>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
