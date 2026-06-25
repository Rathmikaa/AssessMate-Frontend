import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiFailure, ApiResponse } from '../models/api-response.model';
import { CreateEvaluatorRequest, EvaluatorSummary } from '../models/evaluator.model';

/** Raw shape the backend's create-evaluator endpoint actually returns —
 *  note it's `userName`, not `fullName`, unlike every other endpoint in
 *  the app (including this same service's getAll()). Normalized to
 *  EvaluatorSummary below. */
interface RawCreateEvaluatorResponse {
  id: number;
  email: string;
  userName: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class EvaluatorService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<EvaluatorSummary[]> {
    return this.http
      .get<ApiResponse<EvaluatorSummary[]>>(`${API_BASE_URL}/superadmin/evaluators`)
      .pipe(
        map((res) => res.body ?? []),
        catchError((err) => this.toFailure(err)),
      );
  }

  create(req: CreateEvaluatorRequest): Observable<EvaluatorSummary> {
    return this.http
      .post<ApiResponse<RawCreateEvaluatorResponse>>(`${API_BASE_URL}/superadmin/evaluators`, req)
      .pipe(
        map((res): EvaluatorSummary => {
          if (!res.isSuccess || !res.body) {
            throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
          }
          return { id: res.body.id, fullName: res.body.userName, email: res.body.email };
        }),
        catchError((err) => this.toFailure(err)),
      );
  }

  /** The backend puts its success message in `body` (a plain string) for
   *  this one endpoint, rather than `messages` like everywhere else —
   *  normalized here so the component just gets a string either way. */
  delete(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<string>>(`${API_BASE_URL}/superadmin/evaluators/${id}`)
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
          }
          return res.body ?? 'Evaluator deleted.';
        }),
        catchError((err) => this.toFailure(err)),
      );
  }

  private toFailure(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiResponse<unknown> | undefined;
      const failure: ApiFailure = {
        statusCode: err.status,
        errorMessages:
          body?.errorMessages?.length ? body.errorMessages : ['Something went wrong. Please try again.'],
      };
      return throwError(() => failure);
    }
    return throwError(() => err as ApiFailure);
  }
}