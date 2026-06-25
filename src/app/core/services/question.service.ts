import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiFailure, ApiResponse } from '../models/api-response.model';
import { QuestionRequest, QuestionResponse } from '../models/question.model';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  constructor(private readonly http: HttpClient) {}

  getByAssessmentId(assessmentId: number): Observable<QuestionResponse[]> {
    return this.http
      .get<ApiResponse<QuestionResponse[]>>(`${API_BASE_URL}/admin/questions/assessment/${assessmentId}`)
      .pipe(
        map((res) => res.body ?? []),
        catchError((err) => this.toFailure(err)),
      );
  }

  create(req: QuestionRequest): Observable<QuestionResponse> {
    return this.http.post<ApiResponse<QuestionResponse>>(`${API_BASE_URL}/admin/questions`, req).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => this.toFailure(err)),
    );
  }

  update(id: number, req: QuestionRequest): Observable<QuestionResponse> {
    return this.http
      .put<ApiResponse<QuestionResponse>>(`${API_BASE_URL}/admin/questions/${id}`, req)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => this.toFailure(err)),
      );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${API_BASE_URL}/admin/questions/${id}`).pipe(
      map((res) => {
        if (!res.isSuccess) {
          throw { statusCode: res.statusCode, errorMessages: res.errorMessages } as ApiFailure;
        }
      }),
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