import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authentication/auth.service'; // Adjust path if necessary
import { ToastrService } from 'ngx-toastr';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  // Get the required roles from route data. It can be a single string or an array of strings.
  const requiredRoles = route.data['roles'] as string | string[];

  // Convert to array if it's a single string for consistent checking
  const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']); // Not authenticated, redirect to login
    return false;
  }

  const accessToken = authService.accessToken;
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const userRole = payload.role as string;

      // Check if the user's role is included in the list of required roles
      if (rolesToCheck.includes(userRole)) {
        return true; // User has one of the required roles, allow access
      } else {
        toastr.warning('No tienes el rol necesario para acceder a esta página.', 'Acceso Denegado');
        router.navigate(['/dashboard']); // Or a common unauthorized page
        return false;
      }
    } catch (e) {
      console.error('Error decoding access token for role guard:', e);
      toastr.error('Error de autenticación. Por favor, inicia sesión de nuevo.', 'Error');
      router.navigate(['/login']); // Token invalid, redirect to login
      return false;
    }
  }

  router.navigate(['/login']);
  return false;
};