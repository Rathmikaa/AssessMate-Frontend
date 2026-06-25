import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiFailure, ApiResponse } from '../models/api-response.model';
import { AssessmentDetail, AssessmentRequest, AssessmentSummary } from '../models/assessment.model';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  constructor(private readonly http: HttpClient) {}

  getAllForAdmin(): Observable<AssessmentSummary[]> {
    return this.http
      .get<ApiResponse<AssessmentSummary[]>>(`${API_BASE_URL}/admin/assessments`)
      .pipe(
        map((res) => res.body ?? []),
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