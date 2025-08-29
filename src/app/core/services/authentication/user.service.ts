import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../../models/auth/user.model';
import { ChangePasswordDTO } from '../../../models/auth/change-password.dto';
import { Role } from '../../../models/auth/role.model';
import { Dependency } from '../../../models/auth/dependency.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly BASE_URL = environment.apiAuthUrl + '/users';

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.BASE_URL);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.BASE_URL}/${id}`);
  }

  create(user: User): Observable<void> {
    return this.http.post<void>(this.BASE_URL, user);
  }

  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.BASE_URL}/${id}`, user);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

  resetPassword(id: number): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/${id}/reset-password`, {});
  }

  changePassword(id: number, dto: ChangePasswordDTO): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/${id}/change-password`, dto);
  }

  addRole(id: number, role: Role): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/${id}/add-role`, role);
  }

  removeRole(id: number, role: Role): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/${id}/remove-role`, role);
  }

  addDependency(id: number, dependency: Dependency): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/${id}/add-dependency`, dependency);
  }

  removeDependency(id: number, dependency: Dependency): Observable<void> {
    return this.http.post<void>(`${this.BASE_URL}/${id}/remove-dependency`, dependency);
  }

}