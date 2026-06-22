import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiResponse } from '../models/api-response.model';
import { AppRole, AuthResult, LoginRequest, RegisterRequest } from '../models/auth.model';

const STORAGE_KEY = 'assessmate.session';

/** Thrown/emitted to components as a plain string list, already unwrapped
 *  from the ApiResponse.errorMessages array — components don't need to
 *  know about the envelope shape. */
export interface AuthFailure {
  statusCode: number;
  errorMessages: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<AuthResult | null>(this.restore());

  /** True once a session exists AND has not passed its expiresAt. */
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  });

  readonly currentUser = computed(() => this.session());
  readonly role = computed<AppRole | null>(() => this.session()?.role ?? null);

  readonly loading = signal(false);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(req: LoginRequest): Observable<AuthResult> {
    this.loading.set(true);
    return this.http.post<ApiResponse<AuthResult>>(`${API_BASE_URL}/auth/login`, req).pipe(
      map((res) => this.unwrap(res)),
      tap((result) => this.persist(result)),
      catchError((err) => this.toFailure(err)),
      finalize(() => this.loading.set(false)),
    );
  }

  register(req: RegisterRequest): Observable<AuthResult> {
    this.loading.set(true);
    return this.http.post<ApiResponse<AuthResult>>(`${API_BASE_URL}/auth/register`, req).pipe(
      map((res) => this.unwrap(res)),
      tap((result) => this.persist(result)),
      catchError((err) => this.toFailure(err)),
      finalize(() => this.loading.set(false)),
    );
  }

  /** Calls the API to revoke the token, then always clears local state —
   *  a failed revoke call should never trap the user in a logged-in UI. */
  logout(): Observable<void> {
    const token = this.getToken();
    const clear$ = of(void 0).pipe(tap(() => this.clearSession()));

    if (!token) {
      return clear$;
    }

    return this.http.post(`${API_BASE_URL}/auth/logout`, {}).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      tap(() => this.clearSession()),
    );
  }

  getToken(): string | null {
    return this.session()?.token ?? null;
  }

  /** Clears local session state and redirects to /login without calling
   *  the API — used when the server itself tells us the token is no
   *  longer valid (a 401 on an authenticated request). */
  forceLogout(): void {
    this.clearSession();
  }

  /** Where to send a user right after login, based on role. */
  homeRouteFor(role: AppRole): string {
    return role === 'Admin' ? '/admin/dashboard' : '/candidate/dashboard';
  }

  private persist(result: AuthResult): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    this.session.set(result);
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigateByUrl('/login');
  }

  private restore(): AuthResult | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthResult;
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private unwrap(res: ApiResponse<AuthResult>): AuthResult {
    if (!res.isSuccess || !res.body) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as AuthFailure;
    }
    return res.body;
  }

  private toFailure(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiResponse<unknown> | undefined;
      const failure: AuthFailure = {
        statusCode: err.status,
        errorMessages:
          body?.errorMessages?.length ? body.errorMessages : ['Something went wrong. Please try again.'],
      };
      return throwError(() => failure);
    }
    return throwError(() => err as AuthFailure);
  }
}
