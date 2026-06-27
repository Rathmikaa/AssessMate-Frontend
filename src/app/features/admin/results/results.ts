import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ApiFailure } from '../../../core/models/api-response.model';
import { SubmissionSummary } from '../../../core/models/submission.model';
import { AdminResultService } from '../../../core/services/admin-result.service';

@Component({
  selector: 'app-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './results.html',
})
export class Results {
  private readonly resultService = inject(AdminResultService);

  readonly results = signal<SubmissionSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.resultService.getAll().subscribe({
      next: (list) => {
        this.results.set(
          [...list].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
        );
        this.loading.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loading.set(false);
      },
    });
  }
}