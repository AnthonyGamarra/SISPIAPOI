// src/app/core/services/authentication/auth.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthTokens } from '../../../models/auth/auth.model';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  private readonly BASE_URL = 'http://10.0.2.144:8080';

  // Signals para estado de login
  tokens = signal<AuthTokens | null>(null);

  login(data: LoginRequest) {
    return this.http.post<AuthTokens>(`${this.BASE_URL}/login`, data).pipe(
      tap((res) => {
        this.tokens.set(res);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        // Decodificar el token y guardar las dependencias y el rol
        try {
          const payload = JSON.parse(atob(res.access_token.split('.')[1]));
          if (payload.dependencies) {
            localStorage.setItem('dependencies', JSON.stringify(payload.dependencies));
          }
          if (payload.role) { // Store the user role from the token payload
            localStorage.setItem('user_role', payload.role);
          }
        } catch (e) {
          console.error('Error decoding access token during login:', e);
        }
      })
    );
  }

  logout(data: AuthTokens) {
    return this.http.post(`${this.BASE_URL}/logout-tokens`, data, { responseType: 'text' }).pipe(
      tap(() => {
        this.clearTokens();
        this.toastr.success('Sesión cerrada correctamente. ¡Hasta pronto!', 'Cierre de sesión');
        this.router.navigate(['/login']);
      })
    );
  }

  get accessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    const token = this.accessToken;
    if (!token) {
      return false;
    }
    
    // Verificar si el token ha expirado
    if (this.isTokenExpiredInternal(token)) {
      // Si el token ha expirado, limpiar automáticamente
      this.clearTokens();
      return false;
    }
    
    return true;
  }

  /**
   * Verifica si el token actual ha expirado (método público)
   * @returns True si el token ha expirado o no existe, false si aún es válido
   */
  isTokenExpired(): boolean {
    const token = this.accessToken;
    if (!token) {
      return true;
    }
    return this.isTokenExpiredInternal(token);
  }

  /**
   * Verifica si el token JWT ha expirado
   * @param token El token JWT a verificar
   * @returns True si el token ha expirado, false si aún es válido
   */
  private isTokenExpiredInternal(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000); // Tiempo actual en segundos
      
      // 'exp' es el tiempo de expiración en segundos desde epoch
      if (payload.exp) {
        return payload.exp < currentTime;
      }
      
      // Si no tiene campo 'exp', considerar que no ha expirado
      return false;
    } catch (e) {
      console.error('Error decoding token to check expiration:', e);
      // Si hay error al decodificar, considerar que ha expirado
      return true;
    }
  }

  /**
   * Decodes the access token and returns the user's role.
   * @returns The user's role as a string, or null if not found or token is invalid.
   */
  getUserRole(): string | null {
    const accessToken = this.accessToken;
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return payload.role || null;
      } catch (e) {
        console.error('Error decoding access token to get user role:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Checks if the current user has any of the specified roles.
   * @param allowedRoles An array of roles that are permitted.
   * @returns True if the user's role is in the allowedRoles array, false otherwise.
   */
  hasRole(allowedRoles: string[]): boolean {
    const userRole = this.getUserRole();
    if (userRole) {
      return allowedRoles.includes(userRole);
    }
    return false;
  }

  /**
   * Limpia los tokens si han expirado
   */
  private clearExpiredTokens(): void {
    if (this.isTokenExpired()) {
      this.clearTokens();
    }
  }

  /**
   * Limpia todos los tokens del localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('dependencies');
    this.tokens.set(null);
  }

  /**
   * Obtiene el tiempo restante antes de que expire el token (en segundos)
   * @returns Segundos restantes, o 0 si el token ha expirado o no existe
   */
  getTokenExpirationTime(): number {
    const token = this.accessToken;
    if (!token) {
      return 0;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp) {
        const remaining = payload.exp - currentTime;
        return remaining > 0 ? remaining : 0;
      }
      
      return 0;
    } catch (e) {
      console.error('Error getting token expiration time:', e);
      return 0;
    }
  }

  getDependenciesFromToken(): number[] {
    // Usar el access_token correcto en lugar de 'token'
    const token = this.accessToken;
    if (!token) return [];
    try {
      // Decodificar el payload del JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Puede ser 'dependencies' o 'dependencias', ajusta según tu backend
      const deps = payload.dependencies || payload.dependencias || [];
      if (Array.isArray(deps)) {
        return deps.map((d: any) => Number(d)).filter((d: number) => !isNaN(d));
      }
      return [];
    } catch {
      return [];
    }
  }
}