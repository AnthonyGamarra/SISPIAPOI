import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Dependency } from '../../../models/logic/dependency.model';

@Injectable({
  providedIn: 'root'
})
export class DependencyService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/dependency';
    
      constructor(private http: HttpClient) { }
    
      getAll(): Observable<Dependency[]> {
        return this.http.get<Dependency[]>(this.BASE_URL);
      }
    
      getById(id: number): Observable<Dependency> {
        return this.http.get<Dependency>(`${this.BASE_URL}/${id}`);
      }
    
      create(objective: Dependency): Observable<Dependency> {
        return this.http.post<Dependency>(this.BASE_URL, objective);
      }
    
      update(id: number, objective: Dependency): Observable<Dependency> {
        return this.http.put<Dependency>(`${this.BASE_URL}/${id}`, objective);
      }
    
      delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.BASE_URL}/${id}`);
      }

}
