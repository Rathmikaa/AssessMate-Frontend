import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../constants/api.constants';
import { ApiResponse } from '../models/api-response.model';
import { AssessmentSummary } from '../models/assessment.model';

/** Deliberately minimal for now — just enough to populate the "invite to
 *  assessment" picker on the Candidates page. Gains create/update/delete
 *  (and a real failure-handling pattern, matching CandidateService) when
 *  the Assessments CRUD page is built in Phase 5. */
@Injectable({ providedIn: 'root' })
export class AssessmentService {
  constructor(private readonly http: HttpClient) {}

  getAllForAdmin(): Observable<AssessmentSummary[]> {
    return this.http
      .get<ApiResponse<AssessmentSummary[]>>(`${API_BASE_URL}/admin/assessments`)
      .pipe(map((res) => res.body ?? []));
  }
}