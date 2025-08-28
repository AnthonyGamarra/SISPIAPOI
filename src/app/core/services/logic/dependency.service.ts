import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Dependency } from '../../../models/logic/dependency.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DependencyService {

  private readonly BASE_URL = environment.apiLogicUrl + '/dependency';
    
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
    
      update(objective: Dependency): Observable<Dependency> {
        return this.http.put<Dependency>(`${this.BASE_URL}`, objective);
      }
    
      delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.BASE_URL}/${id}`);
      }

}
