import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiFailure, ApiResponse } from '../models/api-response.model';
import { AssessmentDetail, AssessmentRequest, AssessmentSummary } from '../models/assessment.model';
import { PagedResult } from '../models/paged-result.model';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  constructor(private readonly http: HttpClient) {}

  /** Used by pickers (e.g. the Candidates page's "invite to assessment"
   *  dropdown) that need the full list, not one page. The backend's
   *  GET /admin/assessments always returns the paged envelope now, so
   *  this just requests a page large enough to cover realistic usage and
   *  unwraps .items — there's no separate "give me everything" endpoint. */
  getAllForAdmin(): Observable<AssessmentSummary[]> {
    const params = new HttpParams().set('page', 1).set('pageSize', 1000);
    return this.http
      .get<ApiResponse<PagedResult<AssessmentSummary>>>(`${API_BASE_URL}/admin/assessments`, { params })
      .pipe(
        map((res) => res.body?.items ?? []),
        catchError((err) => this.toFailure(err)),
      );
  }

  /** Used by the Assessments list page itself — real server-side paging
   *  and search. */
  getPagedForAdmin(
    page: number,
    pageSize: number,
    search: string,
  ): Observable<PagedResult<AssessmentSummary>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());

    return this.http
      .get<ApiResponse<PagedResult<AssessmentSummary>>>(`${API_BASE_URL}/admin/assessments`, { params })
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  getById(id: number): Observable<AssessmentDetail> {
    return this.http
      .get<ApiResponse<AssessmentDetail>>(`${API_BASE_URL}/admin/assessments/${id}`)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  create(req: AssessmentRequest): Observable<AssessmentSummary> {
    return this.http
      .post<ApiResponse<AssessmentSummary>>(`${API_BASE_URL}/admin/assessments`, req)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  update(id: number, req: AssessmentRequest): Observable<void> {
    return this.http.put<ApiResponse<null>>(`${API_BASE_URL}/admin/assessments/${id}`, req).pipe(
      map((res) => this.unwrapVoid(res)),
      catchError((err) => this.toFailure(err)),
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${API_BASE_URL}/admin/assessments/${id}`).pipe(
      map((res) => this.unwrapVoid(res)),
      catchError((err) => this.toFailure(err)),
    );
  }

  toggleActive(id: number): Observable<void> {
    return this.http
      .patch<ApiResponse<null>>(`${API_BASE_URL}/admin/assessments/${id}/toggle-active`, {})
      .pipe(
        map((res) => this.unwrapVoid(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.isSuccess || res.body === null) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
    }
    return res.body;
  }

  private unwrapVoid(res: ApiResponse<unknown>): void {
    if (!res.isSuccess) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
    }
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