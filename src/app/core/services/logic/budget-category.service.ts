import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetCategory } from '../../../models/logic/budgetCategory.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BudgetCategoryService {

  private readonly BASE_URL = environment.apiLogicUrl + '/budget-category';

  constructor(private http: HttpClient) { }

  getAll(): Observable<BudgetCategory[]> {
      return this.http.get<BudgetCategory[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<BudgetCategory> {
      return this.http.get<BudgetCategory>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: BudgetCategory): Observable<BudgetCategory> {
      return this.http.post<BudgetCategory>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: BudgetCategory): Observable<BudgetCategory> {
      return this.http.put<BudgetCategory>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
