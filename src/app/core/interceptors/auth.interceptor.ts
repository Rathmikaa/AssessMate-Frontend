import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const REFRESH_URL_SEGMENT = '/auth/refresh';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const isUnauthorized = err instanceof HttpErrorResponse && err.status === 401;
      const isRefreshCall = req.url.includes(REFRESH_URL_SEGMENT);

      // A 401 on a request that never had a token attached (e.g. a failed
      // login attempt) is just normal form feedback — not a session problem.
      if (!isUnauthorized || !token) {
        return throwError(() => err);
      }

      // A 401 from the refresh call itself means the refresh token is no
      // good either — there's nothing left to try. Log out and stop here,
      // rather than looping back into another refresh attempt.
      if (isRefreshCall) {
        auth.forceLogout();
        return throwError(() => err);
      }

      // Otherwise: the access token that failed might just be stale.
      // Try a silent refresh, then replay the original request with
      // whatever new token comes back.
      return auth.refreshSession().pipe(
        switchMap((result) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${result.token}` } })),
        ),
        catchError(() => {
          auth.forceLogout();
          return throwError(() => err);
        }),
      );
    }),
  );
};