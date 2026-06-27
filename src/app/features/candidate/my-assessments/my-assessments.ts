import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentSummary } from '../../../core/models/assessment.model';
import { CandidateAssessmentService } from '../../../core/services/candidate-assessment.service';
import { SubmissionService } from '../../../core/services/submission.service';

@Component({
  selector: 'app-candidate-assessments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './my-assessments.html',
})
export class CandidateAssessments {
  private readonly assessmentService = inject(CandidateAssessmentService);
  private readonly submissionService = inject(SubmissionService);

  readonly assessments = signal<AssessmentSummary[]>([]);
  /** Best-effort "already completed" check, matched by title — see the
   *  note on SubmissionSummaryDto not exposing an assessmentId. */
  private readonly completedTitles = signal<Set<string>>(new Set());

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      assessments: this.assessmentService.getAllActive(),
      results: this.submissionService.getMyResults(),
    }).subscribe({
      next: ({ assessments, results }) => {
        this.assessments.set(assessments);
        this.completedTitles.set(new Set(results.map((r) => r.assessmentTitle)));
        this.loading.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loading.set(false);
      },
    });
  }

  isCompleted(a: AssessmentSummary): boolean {
    return this.completedTitles().has(a.title);
  }
}