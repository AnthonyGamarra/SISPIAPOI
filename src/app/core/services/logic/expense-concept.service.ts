import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExpenseConcept } from '../../../models/logic/expenseConcept.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExpenseConceptService {

  private readonly BASE_URL = environment.apiLogicUrl + '/expense-concept';

  constructor(private http: HttpClient) { }

  getAll(): Observable<ExpenseConcept[]> {
      return this.http.get<ExpenseConcept[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<ExpenseConcept> {
      return this.http.get<ExpenseConcept>(`${this.BASE_URL}/${id}`);
    }

    create(objective: ExpenseConcept): Observable<ExpenseConcept> {
      return this.http.post<ExpenseConcept>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: ExpenseConcept): Observable<ExpenseConcept> {
      return this.http.put<ExpenseConcept>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
