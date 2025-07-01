import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthTokens } from '../../models/auth/auth.model';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly BASE_URL = 'http://10.0.2.144:8081';

  // Signals para estado de login
  tokens = signal<AuthTokens | null>(null);

  login(data: LoginRequest) {
    return this.http.post<AuthTokens>(`${this.BASE_URL}/login`, data).pipe(
      tap((res) => {
        this.tokens.set(res);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
      })
    );
  }

  logout() {
    this.tokens.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/login']);
  }

  get accessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}
