import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExpenseType } from '../../../models/logic/expenseType.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseTypeService {

  private readonly BASE_URL = 'http://10.0.29.117:8081/expense-type';

  constructor(private http: HttpClient) { }

  getAll(): Observable<ExpenseType[]> {
      return this.http.get<ExpenseType[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<ExpenseType> {
      return this.http.get<ExpenseType>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: ExpenseType): Observable<ExpenseType> {
      return this.http.post<ExpenseType>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: ExpenseType): Observable<ExpenseType> {
      return this.http.put<ExpenseType>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
