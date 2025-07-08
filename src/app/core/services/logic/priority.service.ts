import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Priority } from '../../../models/logic/priority.model';

@Injectable({
  providedIn: 'root'
})
export class PriorityService {

  private readonly BASE_URL = 'http://10.0.29.240:8081/priority';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<Priority[]> {
      return this.http.get<Priority[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<Priority> {
      return this.http.get<Priority>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: Priority): Observable<Priority> {
      return this.http.post<Priority>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: Priority): Observable<Priority> {
      return this.http.put<Priority>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
