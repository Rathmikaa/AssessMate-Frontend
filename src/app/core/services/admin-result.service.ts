import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiFailure, ApiResponse } from '../models/api-response.model';
import { SubmissionDetail, SubmissionSummary } from '../models/submission.model';

@Injectable({ providedIn: 'root' })
export class AdminResultService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<SubmissionSummary[]> {
    return this.http
      .get<ApiResponse<SubmissionSummary[]>>(`${API_BASE_URL}/admin/results`)
      .pipe(
        map((res) => res.body ?? []),
        catchError((err) => this.toFailure(err)),
      );
  }

  getDetail(submissionId: number): Observable<SubmissionDetail> {
    return this.http
      .get<ApiResponse<SubmissionDetail>>(`${API_BASE_URL}/admin/results/${submissionId}`)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.isSuccess || res.body === null) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
    }
    return res.body;
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