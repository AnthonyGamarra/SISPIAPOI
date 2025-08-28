import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FinancialFund } from '../../../models/logic/financialFund.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinancialFundService {

  private readonly BASE_URL = environment.apiLogicUrl + '/financial-fund';

  constructor(private http: HttpClient) { }

  getAll(): Observable<FinancialFund[]> {
      return this.http.get<FinancialFund[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<FinancialFund> {
      return this.http.get<FinancialFund>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: FinancialFund): Observable<FinancialFund> {
      return this.http.post<FinancialFund>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: FinancialFund): Observable<FinancialFund> {
      return this.http.put<FinancialFund>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
