import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DependencyType } from '../../../models/logic/dependencyType.model';

@Injectable({
  providedIn: 'root'
})
export class DependencyTypeService {

  private readonly BASE_URL = 'http://10.0.29.117:8081/dependency-type';

  constructor(private http: HttpClient) { }

  getAll(): Observable<DependencyType[]> {
      return this.http.get<DependencyType[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<DependencyType> {
      return this.http.get<DependencyType>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: DependencyType): Observable<DependencyType> {
      return this.http.post<DependencyType>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: DependencyType): Observable<DependencyType> {
      return this.http.put<DependencyType>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
