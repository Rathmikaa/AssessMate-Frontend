import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiResponse } from '../models/api-response.model';
import {
  AppRole,
  AuthResult,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/auth.model';

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

  /** True once a session exists AND its access token has not yet passed
   *  expiresAt. False here does NOT necessarily mean "logged out" — the
   *  refresh token might still be good; see refreshSession(). */
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  });

  readonly currentUser = computed(() => this.session());
  readonly role = computed<AppRole | null>(() => this.session()?.role ?? null);

  readonly loading = signal(false);

  /** Shared by every concurrent caller of refreshSession() while a refresh
   *  is in flight, so 5 requests that all 401 at once trigger exactly one
   *  HTTP call to /auth/refresh instead of 5. Cleared once that call
   *  settles, so the *next* 401 (sometime later) starts a fresh one. */
  private refreshInFlight$: Observable<AuthResult> | null = null;

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

  /** The backend always returns the same generic success message whether
   *  or not the email exists — by design, so attackers can't use this to
   *  discover registered emails. There's no error case for "not found",
   *  only for genuine failures (network error, malformed request, etc.). */
  forgotPassword(req: ForgotPasswordRequest): Observable<void> {
    this.loading.set(true);
    return this.http.post<ApiResponse<null>>(`${API_BASE_URL}/auth/forgot-password`, req).pipe(
      map((res) => this.unwrapVoid(res)),
      catchError((err) => this.toFailure(err)),
      finalize(() => this.loading.set(false)),
    );
  }

  /** Also used for accepting an admin-created candidate invite — same
   *  endpoint, same shape, the backend doesn't distinguish the two. */
  resetPassword(req: ResetPasswordRequest): Observable<void> {
    this.loading.set(true);
    return this.http.post<ApiResponse<null>>(`${API_BASE_URL}/auth/reset-password`, req).pipe(
      map((res) => this.unwrapVoid(res)),
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

  /** Exchanges the stored refresh token for a new access + refresh token
   *  pair. Called by the interceptor on a 401, and by initializeSession()
   *  on app startup if the stored access token is already expired.
   *  Concurrent callers all get the same in-flight call's result. */
  refreshSession(): Observable<AuthResult> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      return throwError(
        () => ({ statusCode: 401, errorMessages: ['Session expired. Please sign in again.'] }) as AuthFailure,
      );
    }

    const req: RefreshTokenRequest = { refreshToken };

    this.refreshInFlight$ = this.http.post<ApiResponse<AuthResult>>(`${API_BASE_URL}/auth/refresh`, req).pipe(
      map((res) => this.unwrap(res)),
      tap((result) => this.persist(result)),
      catchError((err) => this.toFailure(err)),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay(1),
    );

    return this.refreshInFlight$;
  }

  /** Runs once at app startup (see app.config.ts's provideAppInitializer).
   *  Handles the "closed the laptop, came back hours later" case: the
   *  stored access token is already expired, but the refresh token might
   *  still be good — try to silently exchange it before the router
   *  activates the first route, so the user isn't bounced to /login for
   *  no real reason. */
  async initializeSession(): Promise<void> {
    if (!this.session() || this.isAuthenticated()) {
      return; // nothing stored, or the access token is still currently valid
    }

    try {
      await firstValueFrom(this.refreshSession());
    } catch {
      this.clearSession();
    }
  }

  /** Clears local session state and redirects to /login without calling
   *  the API — used when the server itself tells us the token is no
   *  longer valid (a 401 on an authenticated request, or a failed
   *  refresh attempt). */
  forceLogout(): void {
    this.clearSession();
  }

  /** Where to send a user right after login, based on role. */
  homeRouteFor(role: AppRole): string {
    switch (role) {
      case 'SuperAdmin':
        return '/superadmin/evaluators';
      case 'Evaluator':
        return '/admin/dashboard';
      case 'Candidate':
        return '/candidate/dashboard';
    }
  }

  private persist(result: AuthResult): void {
    // sessionStorage, not localStorage — see the note on STORAGE_KEY below
    // for why. This call only ever affects the current tab.
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    this.session.set(result);
  }

  private clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigateByUrl('/login');
  }

  /** CHANGED: used to wipe storage immediately if the access token had
   *  already expired. Now it just restores whatever's there — an expired
   *  access token paired with a still-good refresh token is exactly the
   *  case initializeSession() exists to recover from, so we don't want to
   *  destroy that information before it even gets a chance to run. */
  private restore(): AuthResult | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResult;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private unwrap(res: ApiResponse<AuthResult>): AuthResult {
    if (!res.isSuccess || !res.body) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as AuthFailure;
    }
    return res.body;
  }

  /** Like unwrap(), but for endpoints that succeed with no body —
   *  forgot/reset-password return only messages, never a payload. */
  private unwrapVoid(res: ApiResponse<unknown>): void {
    if (!res.isSuccess) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as AuthFailure;
    }
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