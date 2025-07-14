import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authentication/auth.service'; // Adjust path if necessary
import { ToastrService } from 'ngx-toastr'; // To display messages

export const dependencyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const requiredDependencies = route.data['dependencies'] as number[]; // Get the required dependencies from route data

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']); // Not authenticated, redirect to login
    return false;
  }

  // Decode the token to get the user's dependencies
  const accessToken = authService.accessToken;
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const userDependencies: number[] = payload.dependencies || [];

      if (!requiredDependencies || requiredDependencies.length === 0) {
        return true; // No specific dependencies required for this route
      }

      // Check if the user has at least one of the required dependencies
      const hasRequiredDependency = requiredDependencies.some(reqDep => userDependencies.includes(reqDep));

      if (hasRequiredDependency) {
        return true; // User has at least one required dependency, allow access
      } else {
        toastr.warning('No tienes las dependencias necesarias para acceder a esta página.', 'Acceso Restringido');
        router.navigate(['/dashboard']); // Or a common unauthorized page
        return false;
      }
    } catch (e) {
      console.error('Error decoding access token for dependency guard:', e);
      toastr.error('Error de autenticación. Por favor, inicia sesión de nuevo.', 'Error');
      router.navigate(['/login']); // Token invalid, redirect to login
      return false;
    }
  }

  // Should not be reached, but as a fallback:
  router.navigate(['/login']);
  return false;
};