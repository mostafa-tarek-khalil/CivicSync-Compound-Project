import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';


export function requiredRoles(
  route: ActivatedRouteSnapshot
): string[] {
  const roles = route.data['roles'];

  return Array.isArray(roles) ? roles : [];
}


export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();

  if (!authService.getToken() || !user) {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (user.status !== 'ACTIVE') {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url, reason: 'inactive' }
    });
  }

  const allowedRoles = requiredRoles(route);

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return router.createUrlTree(['/access-denied'], {
      queryParams: { from: state.url }
    });
  }

  return true;
};
