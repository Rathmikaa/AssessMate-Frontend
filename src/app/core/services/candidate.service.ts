import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiFailure, ApiOutcome, ApiResponse } from '../models/api-response.model';
import {
  CandidateDetail,
  CandidateSummary,
  CreateCandidateRequest,
  ResendInviteRequest,
} from '../models/candidate.model';
import { PagedResult } from '../models/paged-result.model';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  constructor(private readonly http: HttpClient) {}

  getAll(page: number, pageSize: number, search: string): Observable<PagedResult<CandidateSummary>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());

    return this.http
      .get<ApiResponse<PagedResult<CandidateSummary>>>(`${API_BASE_URL}/admin/candidates`, { params })
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  getById(id: number): Observable<CandidateDetail> {
    return this.http.get<ApiResponse<CandidateDetail>>(`${API_BASE_URL}/admin/candidates/${id}`).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => this.toFailure(err)),
    );
  }

  create(req: CreateCandidateRequest): Observable<ApiOutcome<CandidateSummary>> {
    return this.http
      .post<ApiResponse<CandidateSummary>>(`${API_BASE_URL}/admin/candidates`, req)
      .pipe(
        map((res) => this.toOutcome(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  resendInvite(id: number, req: ResendInviteRequest): Observable<ApiOutcome<null>> {
    return this.http
      .post<ApiResponse<null>>(`${API_BASE_URL}/admin/candidates/${id}/resend-invite`, req)
      .pipe(
        map((res) => this.toOutcome(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  inviteToAssessment(id: number, assessmentId: number): Observable<ApiOutcome<null>> {
    return this.http
      .post<ApiResponse<null>>(`${API_BASE_URL}/admin/candidates/${id}/invite/${assessmentId}`, {})
      .pipe(
        map((res) => this.toOutcome(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  deactivate(id: number): Observable<ApiOutcome<null>> {
    return this.http
      .patch<ApiResponse<null>>(`${API_BASE_URL}/admin/candidates/${id}/deactivate`, {})
      .pipe(
        map((res) => this.toOutcome(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  reactivate(id: number): Observable<ApiOutcome<null>> {
    return this.http
      .patch<ApiResponse<null>>(`${API_BASE_URL}/admin/candidates/${id}/reactivate`, {})
      .pipe(
        map((res) => this.toOutcome(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.isSuccess || res.body === null) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
    }
    return res.body;
  }

  /** Like unwrap(), but for endpoints where a successful response is
   *  still worth surfacing messages from (e.g. a partial-failure warning
   *  about the invite email) rather than just discarding them. */
  private toOutcome<T>(res: ApiResponse<T>): ApiOutcome<T> {
    if (!res.isSuccess) {
      throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
    }
    return { body: res.body, messages: res.messages };
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