import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentSummary } from '../../../core/models/assessment.model';
import { SubmissionSummary } from '../../../core/models/submission.model';
import { CandidateAssessmentService } from '../../../core/services/candidate-assessment.service';
import { SubmissionService } from '../../../core/services/submission.service';

@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
})
export class CandidateDashboard {
  private readonly assessmentService = inject(CandidateAssessmentService);
  private readonly submissionService = inject(SubmissionService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  private readonly assessments = signal<AssessmentSummary[]>([]);
  readonly results = signal<SubmissionSummary[]>([]);

  /** Same best-effort title-matching as the assessments list page — see
   *  the note there about SubmissionSummaryDto not exposing an
   *  assessmentId to join on directly. */
  readonly waitingAssessments = computed(() => {
    const completedTitles = new Set(this.results().map((r) => r.assessmentTitle));
    return this.assessments().filter((a) => !completedTitles.has(a.title));
  });

  readonly recentResults = computed(() =>
    [...this.results()]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5),
  );

  readonly averageScorePercent = computed(() => {
    const scored = this.results().filter((r) => r.maxPossibleScore > 0);
    if (scored.length === 0) return null;
    const percentages = scored.map((r) => (r.totalScore / r.maxPossibleScore) * 100);
    return Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
  });

  constructor() {
    forkJoin({
      assessments: this.assessmentService.getAllActive(),
      results: this.submissionService.getMyResults(),
    }).subscribe({
      next: ({ assessments, results }) => {
        this.assessments.set(assessments);
        this.results.set(results);
        this.loading.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loading.set(false);
      },
    });
  }
}