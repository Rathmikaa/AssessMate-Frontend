import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { SubmissionSummary } from '../../../core/models/submission.model';
import { AdminResultService } from '../../../core/services/admin-result.service';
import { AssessmentMonitorService } from '../../../core/services/assessment-monitor.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { CandidateService } from '../../../core/services/candidate.service';

@Component({
  selector: 'app-evaluator-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
})
export class EvaluatorDashboard {
  private readonly assessmentService = inject(AssessmentService);
  private readonly candidateService = inject(CandidateService);
  private readonly resultService = inject(AdminResultService);
  readonly monitor = inject(AssessmentMonitorService);

  readonly assessmentCount = signal(0);
  readonly candidateCount = signal(0);
  readonly submissionCount = signal(0);
  readonly recentResults = signal<SubmissionSummary[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.monitor.connect();
    inject(DestroyRef).onDestroy(() => this.monitor.disconnect());

    forkJoin({
      assessments: this.assessmentService.getAllForAdmin(),
      candidates: this.candidateService.getAll(),
      results: this.resultService.getAll(),
    }).subscribe({
      next: ({ assessments, candidates, results }) => {
        this.assessmentCount.set(assessments.length);
        this.candidateCount.set(candidates.length);
        this.submissionCount.set(results.length);
        this.recentResults.set(
          [...results]
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .slice(0, 5),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load dashboard data.');
        this.loading.set(false);
      },
    });
  }
}