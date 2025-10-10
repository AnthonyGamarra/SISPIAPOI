import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  FormulationIpress, 
  BudgetSummary, 
  BudgetValidation, 
  BudgetValidationRequest 
} from '../../../models/logic/formulationIpress.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormulationIpressService {

  private readonly BASE_URL = environment.apiLogicUrl + '/formulation-ipress';

  constructor(private http: HttpClient) { }

  getAll(): Observable<FormulationIpress[]> {
    return this.http.get<FormulationIpress[]>(this.BASE_URL);
  }

  getById(id: number): Observable<FormulationIpress> {
    return this.http.get<FormulationIpress>(`${this.BASE_URL}/${id}`);
  }

  getByFormulationId(formulationId: number): Observable<FormulationIpress[]> {
    return this.http.get<FormulationIpress[]>(`${this.BASE_URL}/by-formulation/${formulationId}`);
  }

  getByIpressId(ipressId: number): Observable<FormulationIpress[]> {
    return this.http.get<FormulationIpress[]>(`${this.BASE_URL}/by-ipress/${ipressId}`);
  }

  getBudgetSummary(formulationId: number): Observable<BudgetSummary> {
    return this.http.get<BudgetSummary>(`${this.BASE_URL}/budget-summary/${formulationId}`);
  }

  create(formulationIpress: FormulationIpress): Observable<FormulationIpress> {
    return this.http.post<FormulationIpress>(this.BASE_URL, formulationIpress);
  }

  update(formulationIpress: FormulationIpress): Observable<FormulationIpress> {
    return this.http.put<FormulationIpress>(this.BASE_URL, formulationIpress);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

  changeActiveStatus(id: number, active: boolean): Observable<FormulationIpress> {
    return this.http.put<FormulationIpress>(`${this.BASE_URL}/change-active/${id}?active=${active}`, {});
  }

  validateBudget(request: BudgetValidationRequest): Observable<BudgetValidation> {
    return this.http.post<BudgetValidation>(`${this.BASE_URL}/validate-budget`, request);
  }

  // Método de utilidad para calcular el total del presupuesto (equivalente al getTotalBudget del DTO)
  calculateTotalBudget(formulationIpress: FormulationIpress): number {
    const goods = formulationIpress.goods || 0;
    const remuneration = formulationIpress.remuneration || 0;
    const services = formulationIpress.services || 0;
    return goods + remuneration + services;
  }
}
