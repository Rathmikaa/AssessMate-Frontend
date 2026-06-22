import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      // Only force a logout when we *sent* a token and the server still
      // rejected it — a 401 on an unauthenticated request (e.g. a failed
      // login attempt) should just surface as a normal error to the form.
      if (err instanceof HttpErrorResponse && err.status === 401 && token) {
        auth.forceLogout();
      }
      return throwError(() => err);
    }),
  );
};
