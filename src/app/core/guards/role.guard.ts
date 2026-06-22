import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppRole } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/** Add `data: { role: 'Admin' }` (or 'Candidate') to any route that
 *  should only be reachable by that role. Mismatched roles are sent to
 *  their own home route rather than an error page — they're logged in,
 *  just in the wrong place. */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const required = route.data['role'] as AppRole | undefined;
  const current = auth.role();

  if (!required || current === required) {
    return true;
  }

  return router.createUrlTree([current ? auth.homeRouteFor(current) : '/login']);
};
