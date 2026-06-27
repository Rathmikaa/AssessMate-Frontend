import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ApiFailure } from '../../../core/models/api-response.model';
import { SubmissionDetail } from '../../../core/models/submission.model';
import { AdminResultService } from '../../../core/services/admin-result.service';

interface NavState {
  candidateName?: string;
  candidateEmail?: string;
}

@Component({
  selector: 'app-admin-result-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './result-detail.html',
})
export class AdminResultDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly resultService = inject(AdminResultService);

  /** Passed from the results list via routerLink's [state] — see
   *  results.html. Not available if this page is reached directly (a
   *  bookmark, or a refresh): SubmissionDetailDto itself doesn't include
   *  the candidate's identity, only the list endpoint does. */
  private readonly navState = history.state as NavState;
  readonly candidateName = this.navState?.candidateName ?? null;
  readonly candidateEmail = this.navState?.candidateEmail ?? null;

  readonly detail = signal<SubmissionDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('submissionId'));
    this.resultService.getDetail(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loading.set(false);
      },
    });
  }
}